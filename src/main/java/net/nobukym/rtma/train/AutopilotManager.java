package net.nobukym.rtma.train;

import jp.ngt.rtm.entity.train.EntityTrainBase;
import net.minecraft.world.World;
import net.nobukym.rtma.time.RtmaCalendarData;
import net.nobukym.rtma.time.RtmaDateTime;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 毎tick呼び出され、AssignmentReaderが保持する「列車↔スタフ」の紐付けを見て、
 * 該当する列車のノッチを実際に制御する。TickHandlerServer.onServerTickから
 * 毎tick呼ぶ想定(AssignmentReader.reload()やexportTrains()と違い、
 * ノッチ制御はEXPORT_INTERVAL_TICKSごとの間引きをしない。滑らかな加減速には
 * 毎tickの追従が必要なため)。
 *
 * ─────────────────────────────────────────────────
 * 【現状のスコープ・既知の制限】
 * - 中間駅を挟まない、始点→終点1レッグのスタフのみ対応
 *   (簡易運行の現在の仕様と一致。中間駅対応は将来の拡張)
 * - 出発判定は「時刻(hour/minute/second)のみ」で行っており、年・日は見ていない。
 *   そのため、一度出発した後も同じ時刻になれば毎日繰り返し出発判定が真になる。
 *   今回は「既に出発済みかどうか」の状態を持たないため、終点到着後に再度
 *   同じ出発時刻を迎えると再出発してしまう可能性がある(1日1本の運用を
 *   意図しているなら、到着後にAssignmentReader側の紐付けを解除するか、
 *   本クラス側に「本日は運行済み」フラグを持たせる必要がある。要検討)。
 * - maxPowerNotch(力行側の最大ノッチ段数)・力行加速度は、TrainSpecFileCache経由で
 *   trainspecs.json(実測値)から取得する。ただしノッチ段別の加速度実測値は無いため、
 *   全ノッチ投入時の最大加速度を段数で線形按分した推定値を使っている
 *   (buildPowerRates参照。ブレーキ側はNotchController.BRAKE_RATESに実測値あり)。
 * ─────────────────────────────────────────────────
 */
public final class AutopilotManager {

    private AutopilotManager() {}

    // trainspecs.jsonにresourceNameが見つからない場合の力行加速度フォールバック値
    // (ブロック/tick^2)。通常は実測値(TrainSpecFileCache経由)を使うので、
    // この値が使われるのは車種データが未読み込みの異常系のみを想定している。
    private static final float FALLBACK_ACCELERATION = 0.0015f;
    private static final int FALLBACK_MAX_POWER_NOTCH = 3;

    /** TickHandlerServer.onServerTickから毎tick呼び出す */
    public static void tick(World world) {
        Map<UUID, String> assignments = AssignmentReader.getAll();
        if (assignments.isEmpty()) return;

        List<EntityTrainBase> allTrains = TrainCollector.getAllTrains(world);
        long nowTickOfDay = currentTickOfDay(world);

        for (Map.Entry<UUID, String> entry : assignments.entrySet()) {
            UUID uuid = entry.getKey();
            String timetableName = entry.getValue();

            EntityTrainBase train = findByUuid(allTrains, uuid);
            if (train == null) continue; // チャンク未ロード、列車削除済み等

            TimetableLoader.TimetableData timetable = TimetableLoader.load(world, timetableName);
            if (timetable == null || timetable.schedule == null || timetable.schedule.isEmpty()) continue;

            applyAutopilot(world, train, timetable, nowTickOfDay);
        }
    }

    /** RtmaCalendarDataの経過tickから、「その日の0時からの経過tick」を取り出す */
    private static long currentTickOfDay(World world) {
        long elapsed = RtmaCalendarData.get(world).getElapsedTicks();
        return elapsed % RtmaDateTime.TICKS_PER_DAY;
    }

    /** UUIDでEntityTrainBaseを検索する */
    private static EntityTrainBase findByUuid(List<EntityTrainBase> trains, UUID uuid) {
        for (EntityTrainBase train : trains) {
            if (uuid.equals(train.getUniqueID())) {
                return train;
            }
        }
        return null;
    }

    private static void applyAutopilot(World world, EntityTrainBase train, TimetableLoader.TimetableData timetable, long nowTickOfDay) {
        // notchは編成のisControlCar=true車両にしか効かない(TrainState.javaの検証済み知見)。
        // Web側のUIは/api/trainsのisControlCarで絞った候補しか適用させないが、
        // 念のためここでも保険をかけておく。
        if (!train.isControlCar()) return;

        long departureTickOfDay = timetable.departure != null ? timetable.departure.toTickOfDay() : 0;

        if (nowTickOfDay < departureTickOfDay) {
            train.setNotch(0); // 出発前は待機
            return;
        }

        // 現状は中間駅なし(始点→終点1レッグ)なので、legProfileを持つのは
        // 最後のスケジュール要素だけ。これを使う。
        TimetableLoader.StationEntry leg = null;
        for (TimetableLoader.StationEntry candidate : timetable.schedule) {
            if (candidate.legProfile != null) leg = candidate;
        }
        if (leg == null) return;

        double currentS = leg.legProfile.projectS(train.posX, train.posZ);
        double currentSpeed = train.getSpeed();

        double[] powerRates = buildPowerRates(world, timetable.trainResourceName);

        int notch = NotchController.computeNotch(
                currentS, currentSpeed,
                leg.legProfile.s, leg.legProfile.v,
                powerRates, train.getNotch()
        );
        train.setNotch(notch);
    }

    /**
     * 力行ノッチ1〜maxPowerNotchそれぞれの加速度テーブルを組み立てる。
     * ブレーキ(NotchController.BRAKE_RATES)と違い、ノッチ別の実測加速度データが
     * trainspecs.jsonにまだ無いため、実測されている「最大加速度(全ノッチ投入時)」を
     * 段数で線形按分した推定値を使う(暫定。将来ノッチ別の実測値が手に入り次第、
     * TrainSpecFileCache.SpecEntryにフィールドを追加してこの推定をやめる)。
     */
    private static double[] buildPowerRates(World world, String resourceName) {
        TrainSpecFileCache.SpecEntry spec = TrainSpecFileCache.get(world, resourceName);

        float acceleration = spec != null ? spec.acceleration : FALLBACK_ACCELERATION;
        int maxPowerNotch = (spec != null && spec.maxSpeedStages != null && spec.maxSpeedStages.length > 0)
                ? spec.maxSpeedStages.length
                : FALLBACK_MAX_POWER_NOTCH;

        double[] rates = new double[maxPowerNotch];
        for (int i = 0; i < maxPowerNotch; i++) {
            rates[i] = acceleration * (i + 1) / (double) maxPowerNotch;
        }
        return rates;
    }
}