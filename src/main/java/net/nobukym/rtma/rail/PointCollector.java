package net.nobukym.rtma.rail;

import jp.ngt.rtm.rail.TileEntityLargeRailSwitchCore;
import jp.ngt.rtm.rail.util.Point;
import jp.ngt.rtm.rail.util.RailMap;
import jp.ngt.rtm.rail.util.SwitchType;
import net.minecraft.tileentity.TileEntity;
import net.minecraft.world.World;
import net.nobukym.rtma.Rtma;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * ワールド内にロードされているRTMのポイント(分岐器)を収集するユーティリティ。
 *
 * 取得経路:
 *   TileEntityLargeRailSwitchCore#getSwitch() -> SwitchType
 *   -> SwitchType#getPoints() -> Point[]
 */
public class PointCollector {

    public static List<Point> getAllPoints(World world) {
        return extractPoints(world.loadedTileEntityList);
    }

    /**
     * TileEntityの集合からPointを抽出する。RailCollector.extractRailMapsと同じ理由で
     * リスト取得部分と分離してある(RailWorldScannerのオフラインスキャンでも使う)。
     */
    public static List<Point> extractPoints(Collection<TileEntity> tileEntities) {
        List<Point> gatheredPoints = new ArrayList<>();

        for (TileEntity tileEntity : tileEntities) {
            if (tileEntity instanceof TileEntityLargeRailSwitchCore) {
                TileEntityLargeRailSwitchCore switchCore = (TileEntityLargeRailSwitchCore) tileEntity;
                SwitchType switchType = switchCore.getSwitch();

                if (switchType != null) {
                    Point[] points = switchType.getPoints();
                    if (points != null) {
                        gatheredPoints.addAll(Arrays.asList(points));
                    }
                }
            }
        }

        return gatheredPoints;
    }

    /**
     * RailMap(rmMain/rmBranch) -> そのRailMapに関連するPointのリスト を作る。
     *
     * rmMain/rmBranchの両方が揃っている「本物の」分岐Pointだけを対象にする。
     * rmBranchがnull(構造上のダミー/端点用らしく、movementが0.0または1.0で
     * 固定されたまま変化しない)Pointは、実際の切替レバーではないため除外する。
     *
     * 片渡り線・両渡り線(シーサースクロッシング)等の複雑な分岐では、
     * 1つのRailMapが複数のPointから参照される(例: 両渡り線の曲線区間は、
     * 直線2本それぞれとペアになった2つのPointの両方からrmBranchとして参照される)。
     * そのため Map<RailMap, Point> ではなく Map<RailMap, List<Point>> にしている。
     */
    public static Map<RailMap, List<Point>> buildRailToPointsMap(List<Point> points) {
        Map<RailMap, List<Point>> map = new HashMap<>();
        for (Point point : points) {
            if (point.rmMain != null && point.rmBranch != null) {
                map.computeIfAbsent(point.rmMain, k -> new ArrayList<>()).add(point);
                map.computeIfAbsent(point.rmBranch, k -> new ArrayList<>()).add(point);
            }
        }
        return map;
    }

    /**
     * Pointとそれが参照するRailMapの関係を、オブジェクトの同一性(identityHashCode)付きで
     * ログに出力する調査用メソッド。
     *
     * isMainRoute/isActiveRouteの判定がおかしい場合に、
     * 「本当に1つのPointが2ルートを持っているのか」
     * 「それともルートごとに別々のPointが存在するのか」を確認するために使う。
     */
    public static void debugDump(World world, List<RailMap> allRailMaps, List<Point> points) {
        Rtma.LOGGER.info("=== Point関係の詳細ダンプ開始 ===");

        Rtma.LOGGER.info("-- 収集したRailMap一覧 ({}個) --", allRailMaps.size());
        for (RailMap rail : allRailMaps) {
            Rtma.LOGGER.info("RailMap@{} length={}",
                    System.identityHashCode(rail), rail.getLength());
        }

        Rtma.LOGGER.info("-- Point一覧 ({}個) --", points.size());
        int i = 0;
        for (Point point : points) {
            i++;
            RailMap active = point.getActiveRailMap(world);
            Rtma.LOGGER.info(
                    "Point#{}: movement={} rmMain=@{} rmBranch=@{} active=@{} (active==rmMain:{}, active==rmBranch:{})",
                    i,
                    point.getMovement(),
                    System.identityHashCode(point.rmMain),
                    System.identityHashCode(point.rmBranch),
                    System.identityHashCode(active),
                    (active == point.rmMain),
                    (active == point.rmBranch)
            );
        }

        Rtma.LOGGER.info("=== Point関係の詳細ダンプ終了 ===");
    }
}