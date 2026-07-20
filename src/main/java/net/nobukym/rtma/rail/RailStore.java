package net.nobukym.rtma.rail;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.WorldServer;
import net.nobukym.rtma.Rtma;

import java.io.File;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * RailSegmentの永続ストア(id -> RailSegment)。
 *
 * 従来のexportRailsは「毎回全部集め直してrails.json全体を作り直す」
 * ステートレスな設計だった。これだと、あるレールがそのポーリングの
 * 瞬間にたまたまチャンク未ロードだっただけで「存在しない」と
 * 誤判定されてしまい、大きな路線では描画範囲外のレールが
 * rails.json上で消えたり現れたりしてしまう。
 *
 * このクラスはRailSegmentをメモリ上にid(座標由来の安定ID)キーで
 * 保持し続け、毎ポーリングで以下のルールでマージする:
 *
 * 1. 今回ライブに確認できたセグメント        → 無条件で最新の値に更新
 * 2. 前回まで持っていたが今回見えなかったセグメント:
 *    a. 始点のチャンクがロード済みなのに見えない → 本当に撤去されたと判断し削除
 *    b. 始点のチャンクが未ロードなだけ           → 値を変更せず、liveData=falseで凍結
 *
 * レールは基本的にプレイヤーが近くにいる(=チャンクロード中)状態でしか
 * 設置・撤去されない前提のため、この方式で「未ロードチャンク内のレールが
 * 消える」問題を解消できる。ワールド全体のNBTを都度読みに行く必要はない。
 *
 * サーバー再起動をまたいでも凍結データを失わないよう、
 * 起動後最初のマージ時に既存のrails.jsonがあれば読み込んでシードする
 * (読み込んだ内容はいったん全件liveData=falseとして扱い、実際に
 * チャンクがロードされて確認され次第、順次LIVEへ更新されていく)。
 */
public final class RailStore {

    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

    private static final Map<String, RailSegment> store = new HashMap<>();
    private static boolean seeded = false;

    private RailStore() {}

    /** 起動後1回だけ、既存のrails.jsonがあれば読み込んでstoreをシードする */
    private static void seedFromDiskIfNeeded(File railsFile) {
        if (seeded) {
            return;
        }
        seeded = true;

        if (railsFile == null || !railsFile.exists()) {
            return;
        }

        try {
            String json = new String(Files.readAllBytes(railsFile.toPath()), StandardCharsets.UTF_8);
            Type listType = new TypeToken<List<RailSegment>>() {}.getType();
            List<RailSegment> existing = GSON.fromJson(json, listType);

            if (existing != null) {
                for (RailSegment seg : existing) {
                    if (seg.id == null) {
                        continue;
                    }
                    // 起動直後はまだどのチャンクもロード確認していないので、
                    // 一旦すべて凍結扱いにしておく(見え次第LIVEに更新される)
                    seg.liveData = false;
                    store.put(seg.id, seg);
                }
                Rtma.LOGGER.info("RailStore: 既存のrails.jsonから{}件のレールデータを読み込みました", existing.size());
            }
        } catch (Exception e) {
            Rtma.LOGGER.error("RailStore: rails.jsonの読み込みに失敗しました。空の状態から開始します", e);
        }
    }

    /**
     * 今回ライブに確認できたセグメント群をマージし、現在のstoreの全内容(スナップショット)を返す。
     *
     * @param liveSegments 今回のポーリングでチャンクロード中に確認できたセグメント
     * @param world        撤去/凍結判定(isBlockLoaded)に使うワールド
     * @param currentTick  liveSegmentsに刻むタイムスタンプ(world.getTotalWorldTime()を想定)
     * @param railsFile    初回シード用の既存rails.jsonのパス(null可)
     */
    public static synchronized List<RailSegment> merge(List<RailSegment> liveSegments,
                                                       WorldServer world,
                                                       long currentTick,
                                                       File railsFile) {
        seedFromDiskIfNeeded(railsFile);

        Set<String> seenIds = new HashSet<>();

        // 1. ライブに見えたものは無条件で最新化
        for (RailSegment seg : liveSegments) {
            seg.liveData = true;
            seg.lastUpdatedTick = currentTick;
            store.put(seg.id, seg);
            seenIds.add(seg.id);
        }

        // 2. 見えなかったものを「本当に撤去された」か「単に圏外なだけ」かに振り分ける
        List<String> toRemove = new ArrayList<>();
        for (Map.Entry<String, RailSegment> entry : store.entrySet()) {
            String id = entry.getKey();
            if (seenIds.contains(id)) {
                continue;
            }

            RailSegment seg = entry.getValue();
            BlockPos pos = new BlockPos(seg.startX, seg.startY, seg.startZ);

            if (world.isBlockLoaded(pos)) {
                // チャンクはロードされているのに今回見えなかった → 本当に撤去されたと判断
                toRemove.add(id);
            } else {
                // 単に圏外なだけ。値は変更せず、liveDataだけfalseにして凍結する
                seg.liveData = false;
                if (seg.activeRouteSource == RailSegment.ActiveRouteSource.LIVE) {
                    seg.activeRouteSource = RailSegment.ActiveRouteSource.FROZEN;
                }
            }
        }

        for (String id : toRemove) {
            store.remove(id);
        }

        return new ArrayList<>(store.values());
    }

    /** テスト用/将来の「Web側から強制リセット」機能用に、メモリ上のstoreを空にする */
    public static synchronized void clear() {
        store.clear();
        seeded = false;
    }

    /**
     * RailWorldScannerによるオフラインスキャン結果をstoreに登録する。
     * 通常のmerge()と違い、既にstoreにあるid(ライブ確認済み or 過去に凍結済み)は
     * 上書きしない。これは:
     *  - オフラインスキャンのisActiveRouteは未確定(applyPointInfoでconfirmActiveRoute=false)
     *    であり、既存のLIVE/FROZENな値より情報が劣るため
     *  - このメソッドは何度re-runしても安全(冪等)であるべきなので
     *
     * @return 新規に追加された件数
     */
    public static synchronized int seedFromScan(List<RailSegment> scannedSegments) {
        int added = 0;
        for (RailSegment seg : scannedSegments) {
            if (seg.id == null || store.containsKey(seg.id)) {
                continue;
            }
            seg.liveData = false;
            store.put(seg.id, seg);
            added++;
        }
        return added;
    }
}