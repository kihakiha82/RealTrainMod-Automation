package net.nobukym.rtma.rail;

import jp.ngt.rtm.rail.util.Point;
import jp.ngt.rtm.rail.util.RailMap;
import net.minecraft.world.World;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.Set;

/**
 * RailMap(RTM側の型) -> RailSegment(自前の外部データ表現) への変換。
 *
 * RailMapProbeでの実測結果から分かったこと:
 * - split: 固定値ではなく、呼び出し側が指定するサンプリング解像度。
 * 値が大きいほど曲線を滑らかに近似できる。
 * - index: 0(始点)〜split(終点)のサンプル点番号。splitを超えるindexは
 * 終点の値にクランプされる(例外は出ない)。
 * - getRailPos(split, index)の戻り値は [posZ, posX] の順。[x, z]ではない点に注意。
 * - 高さ(y)はgetRailPosには含まれず、getRailHeight(split, index)で別途取得する。
 * - split=0は内部の除算でcant/height/rollがNaNになるため使わない(1以上を使う)。
 *
 * ポイント(分岐)判定:
 * TileEntityLargeRailSwitchCore -> SwitchType -> Point[] から
 * PointCollector.buildRailToPointsMap()で作った RailMap -> List<Point> の対応表を使う。
 *
 * 片渡り線・両渡り線(シーサースクロッシング)等では、1つのRailMapが
 * 複数のPointから参照される。そのためisActiveRouteは、関連する
 * 「すべて」のPointがこの区間を開通していると報告している場合のみtrueとする(AND条件)。
 *
 * さらに、両渡り線において両方の渡り線ルートが同時に開通状態になる「クロス状態」を
 * 防ぐため、同一の分岐器グループ内で複数のBranchルートが同時に開通しようとしている
 * 場合は、競合とみなして両方のBranchルートを強制的に未開通(false)とする。
 */
public class RailMapConverter {

    /** サンプリングする分割数。曲線の滑らかさと出力データ量のトレードオフ。 */
    private static final int DEFAULT_SPLIT = 8;

    /** この角度未満のyaw変化はほぼ直線とみなす(度) */
    private static final double STRAIGHT_THRESHOLD_DEG = 0.5;

    public static RailSegment convert(RailMap rail, World world, Map<RailMap, List<Point>> railToPoints) {
        return convert(rail, world, railToPoints, true);
    }

    /**
     * @param confirmActiveRoute trueならPoint.getActiveRailMap(world)(レッドストーン判定)を
     *                           使ってisActiveRouteを確定させる(通常のライブポーリング用)。
     *                           falseの場合はisPoint/isMainRoute/pointMovementsだけ設定し、
     *                           isActiveRouteは未確定(null)のまま残す
     *                           (RailWorldScannerによる、チャンク未ロード領域のディスク直接スキャン用。
     *                           getActiveRailMapはライブのWorldへの問い合わせが必要なため、
     *                           この経路では信頼できる値を作れない)。
     */
    public static RailSegment convert(RailMap rail, World world, Map<RailMap, List<Point>> railToPoints,
                                      boolean confirmActiveRoute) {
        RailSegment seg = new RailSegment();

        seg.startX = rail.getStartRP().posX;
        seg.startY = rail.getStartRP().posY;
        seg.startZ = rail.getStartRP().posZ;

        seg.endX = rail.getEndRP().posX;
        seg.endY = rail.getEndRP().posY;
        seg.endZ = rail.getEndRP().posZ;

        seg.id = RailIdGenerator.generate(seg.startX, seg.startY, seg.startZ, seg.endX, seg.endY, seg.endZ);

        seg.length = rail.getLength();

        int split = Math.max(1, DEFAULT_SPLIT);

        float startYaw = rail.getRailYaw(split, 0);
        float endYaw = rail.getRailYaw(split, split);
        seg.yawDeltaDeg = normalizeAngleDelta(endYaw - startYaw);
        seg.straight = Math.abs(seg.yawDeltaDeg) < STRAIGHT_THRESHOLD_DEG;

        if (!seg.straight && seg.length > 0) {
            double yawDeltaRad = Math.toRadians(Math.abs(seg.yawDeltaDeg));
            seg.curveRadiusApprox = seg.length / yawDeltaRad;
        } else {
            seg.curveRadiusApprox = null;
        }

        seg.samples = new ArrayList<>();
        for (int index = 0; index <= split; index++) {
            double[] pos = rail.getRailPos(split, index); // [z, x]の順
            double y = rail.getRailHeight(split, index);
            float yaw = rail.getRailYaw(split, index);
            float pitch = rail.getRailPitch(split, index);
            float roll = rail.getRailRoll(split, index);
            float cant = rail.getCant(split, index);

            RailSegment.SamplePoint sp = new RailSegment.SamplePoint();
            sp.z = pos[0];
            sp.x = pos[1];
            sp.y = y;
            sp.yaw = yaw;
            sp.pitch = pitch;
            sp.roll = roll;
            sp.cant = cant;

            seg.samples.add(sp);
        }

        applyPointInfo(seg, rail, world, railToPoints, confirmActiveRoute);

        return seg;
    }

    /** railが分岐(Point)のいずれかのルートに該当する場合、RailSegmentにポイント情報を反映する */
    private static void applyPointInfo(RailSegment seg, RailMap rail, World world,
                                       Map<RailMap, List<Point>> railToPoints, boolean confirmActiveRoute) {
        List<Point> relatedPoints = railToPoints.get(rail);
        if (relatedPoints == null || relatedPoints.isEmpty()) {
            return;
        }

        seg.isPoint = true;

        // 役割(main/branch)はどのPointから見ても一貫しているため、代表の1つで判定する
        boolean isMainRoute = (relatedPoints.get(0).rmMain == rail);
        seg.isMainRoute = isMainRoute;

        List<Float> movements = new ArrayList<>();
        for (Point point : relatedPoints) {
            movements.add(point.getMovement());
        }
        seg.pointMovements = movements;

        if (!confirmActiveRoute) {
            // オフラインスキャン(RailWorldScanner)由来。isActiveRouteの判定は
            // Point.getActiveRailMap(world)経由のレッドストーン信号確認が必要で、
            // ライブのWorldに依存するためここでは行わない。未確定のまま(null)にしておき、
            // 実際にチャンクがロードされて通常のポーリングで確認され次第LIVEに更新される。
            return;
        }

        boolean allActive = true;
        for (Point point : relatedPoints) {
            // 関連する全Pointが「この区間が現在開通している」と言っていなければfalse(AND条件)
            if (point.getActiveRailMap(world) != rail) {
                allActive = false;
            }
        }

        // --- クロス判定 (両渡り線での衝突防止) ---
        // このルートがBranch(渡り線)側であり、かつ現状で「開通」と判定されている場合、
        // 同一分岐器グループ内で複数のBranchが同時に開通していないかチェックする。
        if (!isMainRoute && allActive) {
            if (hasCrossingBranchConflict(world, railToPoints, relatedPoints)) {
                allActive = false;
            }
        }

        seg.isActiveRoute = allActive;
        seg.activeRouteSource = RailSegment.ActiveRouteSource.LIVE;
    }

    /**
     * 同一の分岐器グループ内で、完全に開通しているBranchルートが2つ以上存在するかどうかを判定する。
     * 両渡り線(シーサースクロッシング)で両方の渡り線が同時に開通する「クロス状態」を防ぐための処理。
     */
    private static boolean hasCrossingBranchConflict(World world,
                                                     Map<RailMap, List<Point>> railToPoints,
                                                     List<Point> initialPoints) {
        // 1. 接続されたPointを辿り、同じ分岐器グループを形成する全Pointを収集する
        Set<Point> groupPoints = new HashSet<>();
        Queue<Point> queue = new LinkedList<>(initialPoints);

        while (!queue.isEmpty()) {
            Point p = queue.poll();
            if (groupPoints.add(p)) {
                // Main側で繋がるPointを追加
                if (p.rmMain != null && railToPoints.containsKey(p.rmMain)) {
                    for (Point next : railToPoints.get(p.rmMain)) {
                        if (!groupPoints.contains(next)) queue.add(next);
                    }
                }
                // Branch側で繋がるPointを追加
                if (p.rmBranch != null && railToPoints.containsKey(p.rmBranch)) {
                    for (Point next : railToPoints.get(p.rmBranch)) {
                        if (!groupPoints.contains(next)) queue.add(next);
                    }
                }
            }
        }

        // 2. グループ内のBranchルートを重複なしで集める
        Set<RailMap> groupBranches = new HashSet<>();
        for (Point p : groupPoints) {
            if (p.rmBranch != null) {
                groupBranches.add(p.rmBranch);
            }
        }

        // 3. 完全に開通しているBranchルートの数をカウントする
        int activeBranchCount = 0;
        for (RailMap branch : groupBranches) {
            List<Point> branchPoints = railToPoints.get(branch);
            if (branchPoints == null || branchPoints.isEmpty()) continue;

            boolean branchFullyActive = true;
            for (Point bp : branchPoints) {
                if (bp.getActiveRailMap(world) != branch) {
                    branchFullyActive = false;
                    break;
                }
            }
            if (branchFullyActive) {
                activeBranchCount++;
            }
        }

        // 2つ以上のBranchが同時に開通しようとしている場合はクロス(競合)とみなす
        return activeBranchCount >= 2;
    }

    /** 角度差を-180〜180に正規化する */
    private static double normalizeAngleDelta(double deltaDeg) {
        double d = deltaDeg % 360.0;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        return d;
    }
}