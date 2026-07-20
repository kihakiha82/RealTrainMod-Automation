package net.nobukym.rtma.rail;

import jp.ngt.rtm.rail.util.Point;
import jp.ngt.rtm.rail.util.RailMap;
import net.minecraft.server.MinecraftServer;
import net.minecraft.tileentity.TileEntity;
import net.minecraft.util.datafix.DataFixer;
import net.minecraft.util.datafix.IFixableData;
import net.minecraft.world.chunk.Chunk;
import net.minecraft.world.chunk.storage.AnvilChunkLoader;
import net.minecraft.world.gen.ChunkProviderServer;
import net.minecraft.world.WorldServer;
import net.minecraftforge.fml.common.FMLCommonHandler;
import net.nobukym.rtma.Rtma;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 導入前から存在していて、まだ一度もプレイヤーがチャンクロードさせていない
 * (=通常のライブポーリングでは一度も見えたことがない)区間を、
 * ワールドのリージョンファイルから直接読み込んでRailStoreに初回登録するスキャナ。
 *
 * 【設計方針】
 * ChunkProviderServer経由で普通にチャンクをロードすると、そのチャンクは
 * エンティティ復元・TileEntityのtick登録などを含めてワールドの「生きた」状態に
 * 組み込まれてしまい、後片付け(アンロード)や、大量ロード時のサーバー負荷が問題になる。
 * ここではその経路を使わず、AnvilChunkLoaderの「ディスクのNBTを読んでChunkオブジェクトを
 * 組み立てるだけ」の経路だけを使い、ChunkProviderServerには一切登録しない
 * (=このスキャンによってチャンクが「ロードされた」ことにはならない)。
 *
 * 【重要な注意】
 * このクラスが使っているAnvilChunkLoader / ChunkProviderServer / Chunk 関連の
 * メソッド名・シグネチャは、こちらの記憶をベースに書いている。RTM本体と違い、
 * これらはvanilla/Forgeの通常のMCPマッピング済みソースなので規約上の制約はなく、
 * お手元のIDEで直接クラスを開いて実際のシグネチャを確認できるはず。
 * コンパイルが通らない場合は、該当クラスの実際のメソッド名を教えてもらえれば
 * こちらで修正します。特に以下の行は要確認:
 *   - AnvilChunkLoaderのコンストラクタ引数(Fileを直接渡せるか)
 *   - AnvilChunkLoader#chunkExists(World, int, int) の有無
 *   - AnvilChunkLoader#loadChunk(World, int, int) の戻り値・例外
 *   - ChunkProviderServer#chunkExists(int, int) (「現在ロード中か」の判定に使用)
 *   - Chunk#getTileEntityMap() の戻り値の型
 *
 * 【スコープ外にしていること】
 * - isActiveRoute(ポイントの開通状態)の確定。これはPoint.getActiveRailMap(world)による
 *   レッドストーン判定が必要でライブのWorldに依存するため、このスキャン経路では行わない
 *   (RailMapConverter.convertのconfirmActiveRoute=falseで、未確定(null)のまま登録する)。
 *   実際にそのチャンクにプレイヤーが近づき、通常のポーリングで確認され次第LIVEへ更新される。
 * - 実行頻度の自動化。サーバー全体のリージョンファイルを走査するため、ワールド規模によっては
 *   数秒〜数十秒かかる可能性がある。コマンド(/rtmarescan)から明示的に1回呼び出す想定で、
 *   tick処理には組み込まない。
 */
public final class RailWorldScanner {

    private RailWorldScanner() {}

    public static final class ScanResult {
        public final int scannedChunks;
        public final int addedSegments;

        public ScanResult(int scannedChunks, int addedSegments) {
            this.scannedChunks = scannedChunks;
            this.addedSegments = addedSegments;
        }
    }

    public static ScanResult scanAndSeed(WorldServer world) {
        List<TileEntity> offlineTileEntities = new ArrayList<>();
        int scannedChunks = 0;

        File worldDir = world.getSaveHandler().getWorldDirectory();
        File regionDir = new File(worldDir, "region");
        File[] regionFiles = regionDir.listFiles((dir, name) -> name.endsWith(".mca"));

        if (regionFiles == null || regionFiles.length == 0) {
            Rtma.LOGGER.warn("RailWorldScanner: regionフォルダが見つからないか空です: {}", regionDir);
            return new ScanResult(0, 0);
        }

        AnvilChunkLoader loader = new AnvilChunkLoader(worldDir, FMLCommonHandler.instance().getDataFixer());

        ChunkProviderServer liveProvider = world.getChunkProvider();

        for (File regionFile : regionFiles) {
            int[] regionCoords = parseRegionCoords(regionFile.getName());
            if (regionCoords == null) {
                continue;
            }

            for (int lx = 0; lx < 32; lx++) {
                for (int lz = 0; lz < 32; lz++) {
                    int cx = regionCoords[0] * 32 + lx;
                    int cz = regionCoords[1] * 32 + lz;

                    if (liveProvider.chunkExists(cx, cz)) {
                        // 現在ロード中 = 通常のライブポーリング(RailStore.merge)で
                        // 既にカバーされているので、ここでは二重処理しない
                        continue;
                    }

                    try {
                        if (!loader.chunkExists(world, cx, cz)) {
                            continue; // まだ何も生成されていないチャンク
                        }

                        Chunk chunk = loader.loadChunk(world, cx, cz);
                        if (chunk == null) {
                            continue;
                        }
                        scannedChunks++;
                        offlineTileEntities.addAll(chunk.getTileEntityMap().values());
                    } catch (IOException e) {
                        Rtma.LOGGER.error("RailWorldScanner: chunk({}, {})の読み込みに失敗しました", cx, cz, e);
                    }
                }
            }
        }

        List<RailMap> offlineRailMaps = RailCollector.extractRailMaps(offlineTileEntities);
        List<Point> offlinePoints = PointCollector.extractPoints(offlineTileEntities);
        Map<RailMap, List<Point>> railToPoints = PointCollector.buildRailToPointsMap(offlinePoints);

        List<RailSegment> scannedSegments = new ArrayList<>();
        for (RailMap rail : offlineRailMaps) {
            // confirmActiveRoute=false: isActiveRouteはここでは確定させない(クラスコメント参照)
            scannedSegments.add(RailMapConverter.convert(rail, world, railToPoints, false));
        }

        int added = RailStore.seedFromScan(scannedSegments);

        Rtma.LOGGER.info("RailWorldScanner: {}チャンクを走査し、レール{}件・ポイント{}件を検出、うち{}件を新規登録しました",
                scannedChunks, offlineRailMaps.size(), offlinePoints.size(), added);

        return new ScanResult(scannedChunks, added);
    }

    /** "r.<x>.<z>.mca" というリージョンファイル名からリージョン座標を取り出す */
    private static int[] parseRegionCoords(String fileName) {
        String[] parts = fileName.split("\\.");
        if (parts.length != 4 || !parts[0].equals("r")) {
            return null;
        }
        try {
            return new int[]{Integer.parseInt(parts[1]), Integer.parseInt(parts[2])};
        } catch (NumberFormatException e) {
            return null;
        }
    }
}