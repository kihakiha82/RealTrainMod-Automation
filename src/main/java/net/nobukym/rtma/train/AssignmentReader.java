package net.nobukym.rtma.train;

import net.minecraft.world.World;
import net.nobukym.rtma.Rtma;
import net.nobukym.rtma.data.PathProvider;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Web側(UI)が書き込んだ train-assignments.json を読んで、
 * 「どの列車に(UUID)、どのスタフが(timetableName)割り当てられているか」を
 * メモリ上のMapとして保持する。
 *
 * TickHandlerServer の exportInterval と同じ間隔(EXPORT_INTERVAL_TICKS)で
 * reload() を呼ぶことで、Web側でスタフを適用・解除した結果を Mod 側に反映する。
 *
 * ─────────────────────────────────────────────────
 *  【NotchController実装セッションに向けたTODO】
 *
 *  このクラスが保持する assignments を参照して、実際にノッチを制御するのが
 *  NotchController(未実装)の役割になる。以下の設計方針で実装する:
 *
 *  1. NotchController は TickHandlerServer の onServerTick から毎 tick 呼び出す
 *     (スタフ計算の結果(legProfile の s/v/t 列)と現在の列車位置を比較して
 *     目標速度を求め、notch を EntityTrainBase.setNotch() で直接セットする)
 *
 *  2. 現在位置の s(経路上の累積距離) への変換は、
 *     rails.json のサンプル点列との最近傍探索 + 補間で行う予定。
 *     TrainState.entryPos(レール進行カウンタ)との対応を要検証。
 *
 *  3. 「出発時刻」の管理:
 *     assignedAt(時:分:秒)と RtmaCalendarData の現在時刻を tickToClock/clockToTick
 *     (timetableGenerator.js と同等の換算ロジックを Java 側で実装)で比較し、
 *     出発時刻になったら力行を開始する。
 *     → Java 側の換算: totalSeconds = h*3600 + m*60 + s; tick = totalSeconds * 20;
 *
 *  4. timetables/<name>.json のロードは TimetableLoader(未実装、新規作成)が担う。
 *     legProfile の s/v/t 配列をパースして double[] として保持する想定。
 * ─────────────────────────────────────────────────
 */
public final class AssignmentReader {

    private AssignmentReader() {}

    /**
     * UUID → timetableName のマッピング。
     * TickHandlerServer から reload() 後にこの Map を参照してノッチ制御に使う。
     * スレッドセーフにするため、更新はこのフィールドごと新しい Map で置き換える(swap)。
     */
    private static volatile Map<UUID, String> assignments = Collections.emptyMap();

    /**
     * train-assignments.json を読み直してメモリ上の assignments を更新する。
     * TickHandlerServer.onServerTick から EXPORT_INTERVAL_TICKS ごとに呼ぶ。
     *
     * ファイルが存在しない場合は空 Map をセットして正常終了する(初回起動前や
     * Minecraft を起動した直後で Web 側がまだ書いていない場合に起こりうる)。
     *
     * JSON パースは標準ライブラリの範囲で素朴に行う
     * (RTM 環境では Gson が使用可能なはずなので、TODO: 実装セッションで Gson に置き換える)。
     */
    public static void reload(World world) {
        File file = PathProvider.getAssignmentFile(world);
        if (!file.exists()) {
            assignments = Collections.emptyMap();
            return;
        }

        try {
            String json = new String(Files.readAllBytes(file.toPath()), java.nio.charset.StandardCharsets.UTF_8);

            // TODO: Gson で正式にパースする。現時点はスケルトンのため空 Map を返す。
            //   実装例:
            //   Type type = new TypeToken<Map<String, AssignmentEntry>>(){}.getType();
            //   Map<String, AssignmentEntry> raw = new Gson().fromJson(json, type);
            //   Map<UUID, String> result = new HashMap<>();
            //   for (Map.Entry<String, AssignmentEntry> e : raw.entrySet()) {
            //       result.put(UUID.fromString(e.getKey()), e.getValue().timetableName);
            //   }
            //   assignments = Collections.unmodifiableMap(result);

            Rtma.LOGGER.debug("AssignmentReader: train-assignments.json を読み込みました ({} bytes)", json.length());
            // スケルトン: パース未実装のため、現時点は読んだことだけ記録して何もしない
            assignments = Collections.emptyMap();

        } catch (IOException e) {
            Rtma.LOGGER.warn("AssignmentReader: train-assignments.json の読み込みに失敗しました: {}", e.getMessage());
        }
    }

    /**
     * 指定 UUID に割り当てられた timetableName を返す。
     * 割り当てが無い場合は null を返す。
     * NotchController(未実装)から呼び出す想定。
     */
    public static String getTimetableName(UUID uuid) {
        return assignments.get(uuid);
    }

    /** 現在メモリ上の割り当て全体を返す(読み取り専用)。デバッグ・ログ用。 */
    public static Map<UUID, String> getAll() {
        return assignments;
    }
}