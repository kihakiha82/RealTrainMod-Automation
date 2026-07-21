package net.nobukym.rtma.train;

import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import net.minecraft.world.World;
import net.nobukym.rtma.Rtma;
import net.nobukym.rtma.data.PathProvider;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * timetables/&lt;name&gt;.json(Web側の /api/simple-schedule がそのまま保存したもの)を
 * 読み込み、AutopilotManager が扱いやすい形(TimetableData)に変換する。
 *
 * ファイル内容はWeb側のUIから随時保存され得るので、AssignmentReaderと同様、
 * 最終更新時刻を見て変化した時だけ読み直すキャッシュを持つ。
 */
public final class TimetableLoader {

    private TimetableLoader() {}

    private static final Gson GSON = new Gson();

    private static final class CacheEntry {
        long lastModified;
        TimetableData data;
    }

    /** timetableName → CacheEntry。ワールドが変わる状況は考慮しない(RTMAはシングルワールド運用想定) */
    private static final Map<String, CacheEntry> cache = new HashMap<>();

    /**
     * 指定名のスタフを読み込む(キャッシュ済みかつファイル未変更ならキャッシュを返す)。
     * ファイルが存在しない、またはパースに失敗した場合は null を返す。
     */
    public static TimetableData load(World world, String name) {
        File file = new File(PathProvider.getTimetableDir(world), name + ".json");
        if (!file.exists()) {
            cache.remove(name);
            return null;
        }

        long modified = file.lastModified();
        CacheEntry cached = cache.get(name);
        if (cached != null && cached.lastModified == modified) {
            return cached.data;
        }

        try {
            String json = new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
            TimetableData data = GSON.fromJson(json, TimetableData.class);

            CacheEntry entry = new CacheEntry();
            entry.lastModified = modified;
            entry.data = data;
            cache.put(name, entry);

            return data;
        } catch (IOException e) {
            Rtma.LOGGER.warn("TimetableLoader: {}の読み込みに失敗しました: {}", name, e.getMessage());
            return null;
        } catch (JsonSyntaxException e) {
            Rtma.LOGGER.warn("TimetableLoader: {}の構文が不正です: {}", name, e.getMessage());
            return null;
        } catch (RuntimeException e) {
            // Gsonはここで想定外の例外(例: NaN/Infinityが混入してJSON上nullになった値を
            // プリミティブ配列(double[]等)へデシリアライズしようとしたときのIllegalArgumentException)を
            // 投げることがある。これをキャッチしないと、tick処理中の呼び出し元
            // (AutopilotManager)まで例外が突き抜け、Minecraftサーバー自体が
            // 毎tickクラッシュする致命的な事態になる(実際に発生した実例)。
            // 1つのスタフファイルが壊れているだけで自動運転機能全体・サーバー全体を
            // 巻き込まないよう、ここで止めてnullを返す(=このtickではスタフ無し扱い)。
            Rtma.LOGGER.error("TimetableLoader: {}の読み込み中に予期しないエラーが発生しました。" +
                            "このスタフは無視します(NaN/Infinityが計算結果に混入していないか確認してください): {}",
                    name, e.toString());
            return null;
        }
    }

    // ── /api/simple-schedule のJSON構造に対応するGsonデシリアライズ用モデル ──

    /** { hour, minute, second } (+ dayOffset。dayOffsetは到着側にのみ付くが読み捨てて構わない) */
    public static final class ClockTime {
        public int hour;
        public int minute;
        public int second;
        public int dayOffset; // arrivalClock/departureClockの場合のみ意味を持つ

        /** その日の0時からの累積tickに変換する(client/calc/timetableGenerator.js#clockToTickと同じ式) */
        public long toTickOfDay() {
            long totalSeconds = hour * 3600L + minute * 60L + second;
            return totalSeconds * 20; // RtmaDateTime.TICKS_PER_SECOND
        }
    }

    /**
     * 1駅間(レッグ)分の速度カーブ。s[i]/v[i]/t[i]/x[i]/z[i]は同じインデックスで対応する
     * (client/calc/timetableGenerator.js#generateTimetableが生成する形式と対応)。
     */
    public static final class LegProfile {
        public double[] s; // レッグ内の距離(絶対s、ブロック)
        public double[] v; // 目標速度(ブロック/tick)
        public double[] t; // 絶対tick
        public double[] x; // ワールドX座標(sと対応)
        public double[] z; // ワールドZ座標(sと対応)

        /**
         * 現在位置(px, pz)に最も近い、このレッグのポリライン(x[]/z[])上の点を求め、
         * そのsを返す。client/src/mapEngine/map2dController.js#projectOntoSegmentと
         * 同じ考え方(最近傍の線分への垂線の足)を、レッグ全体に対して行う。
         */
        public double projectS(double px, double pz) {
            if (x == null || x.length < 2) return s != null && s.length > 0 ? s[0] : 0;

            double bestDist = Double.MAX_VALUE;
            double bestS = s[0];

            for (int i = 0; i < x.length - 1; i++) {
                double ax = x[i], az = z[i];
                double bx = x[i + 1], bz = z[i + 1];
                double dx = bx - ax, dz = bz - az;
                double lenSq = dx * dx + dz * dz;

                double t;
                if (lenSq > 1e-9) {
                    t = ((px - ax) * dx + (pz - az) * dz) / lenSq;
                    t = Math.max(0, Math.min(1, t));
                } else {
                    t = 0;
                }

                double projX = ax + dx * t;
                double projZ = az + dz * t;
                double dist = Math.hypot(px - projX, pz - projZ);

                if (dist < bestDist) {
                    bestDist = dist;
                    bestS = s[i] + (s[i + 1] - s[i]) * t;
                }
            }

            return bestS;
        }

        /** 距離sにおける目標速度を、前後の点から線形補間して求める(routeProfile.js#sampleAtと同じ考え方) */
        public double speedAt(double targetS) {
            if (v == null || v.length == 0) return 0;
            if (targetS <= s[0]) return v[0];
            if (targetS >= s[s.length - 1]) return v[v.length - 1];

            // sは昇順なので二分探索で挟む
            int lo = 0, hi = s.length - 1;
            while (hi - lo > 1) {
                int mid = (lo + hi) / 2;
                if (s[mid] <= targetS) lo = mid; else hi = mid;
            }

            double span = s[hi] - s[lo];
            double t = span > 1e-9 ? (targetS - s[lo]) / span : 0;
            return v[lo] + (v[hi] - v[lo]) * t;
        }
    }

    /** スケジュール1駅分。legProfileは最初の駅(始発)ではnull */
    public static final class StationEntry {
        public String name;
        public double s;
        public Double arrivalTick;   // 始発駅はnull
        public Double departureTick; // 終着駅はnull
        public Double legDurationTicks;
        public LegProfile legProfile;
    }

    /** /api/simple-schedule のレスポンス全体に対応するトップレベルモデル */
    public static final class TimetableData {
        public String trainResourceName;
        public ClockTime departure;
        public boolean brakeSpecEstimated;
        public double totalLength;
        public List<StationEntry> schedule;
    }
}