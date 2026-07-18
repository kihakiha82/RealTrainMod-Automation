package net.nobukym.rtma.train;

import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import com.google.gson.reflect.TypeToken;
import net.minecraft.world.World;
import net.nobukym.rtma.Rtma;
import net.nobukym.rtma.data.PathProvider;

import java.io.IOException;
import java.io.File;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
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
 * TickHandlerServer の onServerTick から毎tick reload() を呼ぶことで、
 * Web側でスタフを適用・解除した結果を Mod 側に反映する
 * (ファイル自体はEXPORT_INTERVAL_TICKSごとの書き出しと違い、いつ変更されるか
 * 分からないため、ファイルの最終更新時刻を見て変化した時だけ読み直す)。
 *
 * 実際にノッチを制御するのは AutopilotManager / NotchController の役割。
 * このクラスは「割り当て情報を読む」ことだけに専念する。
 */
public final class AssignmentReader {

    private AssignmentReader() {}

    private static final Gson GSON = new Gson();

    /** train-assignments.json 1エントリ分のJSON構造(Gsonのデシリアライズ先) */
    private static final class AssignmentEntry {
        String timetableName;
        // assignedAt(紐付け操作を行った時刻。参考情報でノッチ制御には使わない)は
        // 現時点では読み捨てる。実際の出発判定は TimetableData.departure を使う。
    }

    /**
     * UUID → timetableName のマッピング。
     * 更新はこのフィールドごと新しいMapで置き換える(swap)ことでスレッドセーフにする。
     */
    private static volatile Map<UUID, String> assignments = Collections.emptyMap();

    /** 前回読み込み時点でのファイル最終更新時刻。変化が無ければ読み直しをスキップする */
    private static long lastModified = -1;

    /**
     * train-assignments.json を読み直してメモリ上の assignments を更新する。
     * ファイルが存在しない場合は空Mapをセットして正常終了する
     * (Minecraft起動直後でWeb側がまだ何も書いていない場合などに起こりうる)。
     */
    public static void reload(World world) {
        File file = PathProvider.getAssignmentFile(world);
        if (!file.exists()) {
            if (!assignments.isEmpty()) assignments = Collections.emptyMap();
            lastModified = -1;
            return;
        }

        long modified = file.lastModified();
        if (modified == lastModified) {
            return; // 前回読み込み時から変化が無いのでスキップ
        }

        try {
            String json = new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
            Type type = new TypeToken<Map<String, AssignmentEntry>>() {}.getType();
            Map<String, AssignmentEntry> raw = GSON.fromJson(json, type);

            if (raw == null) {
                assignments = Collections.emptyMap();
                lastModified = modified;
                return;
            }

            Map<UUID, String> result = new HashMap<>();
            for (Map.Entry<String, AssignmentEntry> e : raw.entrySet()) {
                if (e.getValue() == null || e.getValue().timetableName == null) continue;
                try {
                    result.put(UUID.fromString(e.getKey()), e.getValue().timetableName);
                } catch (IllegalArgumentException badUuid) {
                    Rtma.LOGGER.warn("AssignmentReader: 不正なUUIDをスキップしました: {}", e.getKey());
                }
            }

            assignments = Collections.unmodifiableMap(result);
            lastModified = modified;
            Rtma.LOGGER.info("AssignmentReader: train-assignments.jsonを読み込みました ({}件)", result.size());

        } catch (IOException e) {
            Rtma.LOGGER.warn("AssignmentReader: train-assignments.jsonの読み込みに失敗しました: {}", e.getMessage());
        } catch (JsonSyntaxException e) {
            Rtma.LOGGER.warn("AssignmentReader: train-assignments.jsonの構文が不正です: {}", e.getMessage());
        }
    }

    /**
     * 指定 UUID に割り当てられた timetableName を返す。
     * 割り当てが無い場合は null を返す。
     */
    public static String getTimetableName(UUID uuid) {
        return assignments.get(uuid);
    }

    /** 現在メモリ上の割り当て全体を返す(読み取り専用)。AutopilotManagerから呼ぶ。 */
    public static Map<UUID, String> getAll() {
        return assignments;
    }
}