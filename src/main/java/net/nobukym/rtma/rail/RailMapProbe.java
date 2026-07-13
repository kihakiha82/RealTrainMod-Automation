package net.nobukym.rtma.rail;

import jp.ngt.rtm.rail.util.RailMap;
import jp.ngt.rtm.rail.util.Point;
import net.nobukym.rtma.Rtma;

import java.util.Arrays;
import java.util.List;

/**
 * RailMapの getXxx(int, int) 系メソッドが受け取る (split, index) の
 * 意味・有効範囲を実際に呼び出して調査するための一時的なクラス。
 *
 * 使い方: 適当なタイミングで probeFirst(...) を1回呼び、ログを確認する。
 * 意味が判明したら削除してよい（恒久的なコードではない）。
 */
public class RailMapProbe {

    /** split, indexともに 0〜MAXまで総当たりで呼び、例外が出る境界を見つける */
    private static final int MAX = 8;

    public static void probeFirst(List<RailMap> railMaps) {
        if (railMaps.isEmpty()) {
            Rtma.LOGGER.info("RailMapProbe: RailMapが見つかりませんでした");
            return;
        }

        RailMap rail = railMaps.get(0);

        Rtma.LOGGER.info("=== RailMapProbe 開始 ===");
        Rtma.LOGGER.info("StartRP: {}", rail.getStartRP());
        Rtma.LOGGER.info("EndRP:   {}", rail.getEndRP());
        Rtma.LOGGER.info("Length:  {}", rail.getLength());

        for (int split = 0; split <= MAX; split++) {
            for (int index = 0; index <= MAX; index++) {
                StringBuilder sb = new StringBuilder();
                sb.append("split=").append(split).append(" index=").append(index).append(" -> ");

                try {
                    double[] pos = rail.getRailPos(split, index);
                    sb.append("pos=").append(Arrays.toString(pos)).append(" ");
                } catch (Exception e) {
                    sb.append("pos=ERR(").append(e.getClass().getSimpleName()).append(") ");
                }

                try {
                    float cant = rail.getCant(split, index);
                    sb.append("cant=").append(cant).append(" ");
                } catch (Exception e) {
                    sb.append("cant=ERR ");
                }

                try {
                    double height = rail.getRailHeight(split, index);
                    sb.append("height=").append(height).append(" ");
                } catch (Exception e) {
                    sb.append("height=ERR ");
                }

                try {
                    float yaw = rail.getRailYaw(split, index);
                    sb.append("yaw=").append(yaw).append(" ");
                } catch (Exception e) {
                    sb.append("yaw=ERR ");
                }

                try {
                    float pitch = rail.getRailPitch(split, index);
                    sb.append("pitch=").append(pitch).append(" ");
                } catch (Exception e) {
                    sb.append("pitch=ERR ");
                }

                try {
                    float roll = rail.getRailRoll(split, index);
                    sb.append("roll=").append(roll);
                } catch (Exception e) {
                    sb.append("roll=ERR");
                }

                Rtma.LOGGER.info(sb.toString());
            }
        }

        Rtma.LOGGER.info("=== RailMapProbe 終了 ===");
    }

    /**
     * RailMap#getNearlestPoint(int, double, double) の挙動を調査する。
     *
     * 戻り値の型はILineだが、importせずにObjectで受け取り、
     * instanceof Pointで実際にPointが返ってきているかを確認する。
     */
    public static void probeNearestPoint(RailMap rail) {
        Rtma.LOGGER.info("=== getNearlestPoint調査開始 ===");

        double startX = rail.getStartRP().posX;
        double startZ = rail.getStartRP().posZ;
        double endX = rail.getEndRP().posX;
        double endZ = rail.getEndRP().posZ;
        double midX = (startX + endX) / 2.0;
        double midZ = (startZ + endZ) / 2.0;

        int[] par1Candidates = {0, 1, 2};
        double[][] points = {
                {startX, startZ},
                {midX, midZ},
                {endX, endZ},
        };

        for (int par1 : par1Candidates) {
            for (double[] p : points) {
                try {
                    Object result = rail.getNearlestPoint(par1, p[0], p[1]);
                    String className = (result != null) ? result.getClass().getName() : "null";
                    boolean isPoint = result instanceof Point;

                    String movementInfo = "";
                    if (isPoint) {
                        float movement = ((Point) result).getMovement();
                        movementInfo = " movement=" + movement;
                    }

                    Rtma.LOGGER.info("par1={} pos=({}, {}) -> class={} isPoint={}{}",
                            par1, p[0], p[1], className, isPoint, movementInfo);
                } catch (Exception e) {
                    Rtma.LOGGER.info("par1={} pos=({}, {}) -> 例外: {}",
                            par1, p[0], p[1], e.toString());
                }
            }
        }

        Rtma.LOGGER.info("=== getNearlestPoint調査終了 ===");
    }

    /**
     * 集めたRailMapの実際のクラス名(getClass().getSimpleName())を集計する。
     *
     * RailMapSwitch等のサブクラスがgetAllRailMaps()の戻り値に
     * 混ざって入っているかどうかを確認するための調査用メソッド。
     */
    public static void probeClassNames(List<RailMap> railMaps) {
        Rtma.LOGGER.info("=== RailMapのクラス名調査開始 ===");

        java.util.Map<String, Integer> counts = new java.util.HashMap<>();
        for (RailMap rail : railMaps) {
            String name = rail.getClass().getSimpleName();
            counts.merge(name, 1, Integer::sum);
        }

        for (java.util.Map.Entry<String, Integer> e : counts.entrySet()) {
            Rtma.LOGGER.info("{} : {}件", e.getKey(), e.getValue());
        }

        Rtma.LOGGER.info("=== RailMapのクラス名調査終了 ===");
    }
}