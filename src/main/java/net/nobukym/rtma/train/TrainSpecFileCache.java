package net.nobukym.rtma.train;

import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import com.google.gson.reflect.TypeToken;
import net.minecraft.world.World;
import net.nobukym.rtma.Rtma;
import net.nobukym.rtma.data.PathProvider;

import java.io.File;
import java.io.IOException;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Collections;
import java.util.Map;

/**
 * TrainSpecExporterが書き出したtrainspecs.json(Web側の/api/trainspecsと同じ内容)を
 * 読み込んでキャッシュする。AutopilotManagerが力行側の実測加速度・ノッチ段数を
 * 得るのに使う(TrainSpecLoader.load()はModelPackManagerへの毎回の問い合わせになり
 * 重いため、tick毎に呼ぶAutopilotManagerからはファイルキャッシュ経由にする)。
 */
public final class TrainSpecFileCache {

    private TrainSpecFileCache() {}

    private static final Gson GSON = new Gson();

    /** trainspecs.json 1エントリ分。TrainSpec.javaと対応するフィールドのみ */
    public static final class SpecEntry {
        public String resourceName;
        public float acceleration; // ブロック/tick^2(実測値。trainspecs.json由来)
        public float[] maxSpeedStages; // 力行ノッチ数 = この配列の長さ
    }

    private static Map<String, SpecEntry> cache = Collections.emptyMap();
    private static long lastModified = -1;

    /** resourceNameからSpecEntryを取得する。無ければnull(要fallback) */
    public static SpecEntry get(World world, String resourceName) {
        reloadIfChanged(world);
        return cache.get(resourceName);
    }

    private static void reloadIfChanged(World world) {
        File file = PathProvider.getTrainSpecsFile(world);
        if (!file.exists()) {
            if (!cache.isEmpty()) cache = Collections.emptyMap();
            lastModified = -1;
            return;
        }

        long modified = file.lastModified();
        if (modified == lastModified) return;

        try {
            String json = new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
            Type type = new TypeToken<Map<String, SpecEntry>>() {}.getType();
            Map<String, SpecEntry> raw = GSON.fromJson(json, type);
            cache = raw != null ? raw : Collections.emptyMap();
            lastModified = modified;
        } catch (IOException e) {
            Rtma.LOGGER.warn("TrainSpecFileCache: trainspecs.jsonの読み込みに失敗しました: {}", e.getMessage());
        } catch (JsonSyntaxException e) {
            Rtma.LOGGER.warn("TrainSpecFileCache: trainspecs.jsonの構文が不正です: {}", e.getMessage());
        }
    }
}