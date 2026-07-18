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
 * - maxPowerNotch(力行側の最大ノッチ段数)をtrainspecs.jsonから取得する
 *   経路が無いため、暫定的に固定値を使っている。
 * ─────────────────────────────────────────────────
 */
public final class AutopilotManager {

    private AutopilotManager() {}

    // trainspecs.jsonのJava側読み込み経路が無いため暫定固定(要検証・要差し替え)。
    // kiha600のmaxSpeedStagesが3段なのでこれに合わせている。
    private static final int DEFAULT_MAX_POWER_NOTCH = 3;

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

            applyAutopilot(train, timetable, nowTickOfDay);
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

    private static void applyAutopilot(EntityTrainBase train, TimetableLoader.TimetableData timetable, long nowTickOfDay) {
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
        double targetSpeed = leg.legProfile.speedAt(currentS);
        double currentSpeed = train.getSpeed();

        int notch = NotchController.computeNotch(
                targetSpeed, currentSpeed, train.getNotch(), DEFAULT_MAX_POWER_NOTCH
        );
        train.setNotch(notch);
    }
}