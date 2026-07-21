package net.nobukym.rtma.rail;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * RailSegmentを「ほぼ変化しない静的ジオメトリ部分」と「切り替わりうる動的な状態部分」に
 * 分けてシリアライズ/デシリアライズするためのヘルパー。
 *
 * 分割する狙い:
 *  - 大きな路線では、ジオメトリ(座標・カーブ形状等)はレールを設置/撤去した時にしか
 *    変わらない一方、開通状態(isActiveRoute)は分岐器の切り替えのたびに変わる。
 *    1つのファイルにまとめていると、分岐器を1つ切り替えただけで路線全体(数千件の
 *    samples込み)を毎回まるごと書き直すことになり、CRC32の差分検知があっても
 *    シリアライズ自体のコストが無駄に大きい。
 *  - Web側の初期表示でも、まず変化しないジオメトリだけ先に読み込んでマップを描画し、
 *    状態部分は後から/頻繁に取りに行く、という段階的ロードがしやすくなる。
 *
 * RailSegment自体(Javaのメモリ上の表現)は分割せず、これまで通り1つのクラスで扱う。
 * 分割するのはJSONへのシリアライズ時と、起動時にディスクから読み戻す時だけ。
 */
public final class RailSegmentSplitter {

    private RailSegmentSplitter() {}

    /** 静的ジオメトリ部分だけを取り出したDTO。rails-geometry.jsonの中身になる */
    public static class GeometryView {
        public String id;

        public double startX, startY, startZ;
        public double endX, endY, endZ;

        public double length;
        public double yawDeltaDeg;
        public boolean straight;
        public Double curveRadiusApprox;

        public boolean isPoint;
        public Boolean isMainRoute;

        public List<RailSegment.SamplePoint> samples;
    }

    /** 動的な状態部分だけを取り出したDTO。rails-state.jsonの中身になる */
    public static class StateView {
        public String id;

        public boolean liveData;
        public long lastUpdatedTick;

        public Boolean isActiveRoute;
        public RailSegment.ActiveRouteSource activeRouteSource;
        public List<Float> pointMovements;
    }

    public static List<GeometryView> toGeometryList(List<RailSegment> segments) {
        List<GeometryView> result = new ArrayList<>(segments.size());
        for (RailSegment seg : segments) {
            GeometryView g = new GeometryView();
            g.id = seg.id;
            g.startX = seg.startX;
            g.startY = seg.startY;
            g.startZ = seg.startZ;
            g.endX = seg.endX;
            g.endY = seg.endY;
            g.endZ = seg.endZ;
            g.length = seg.length;
            g.yawDeltaDeg = seg.yawDeltaDeg;
            g.straight = seg.straight;
            g.curveRadiusApprox = seg.curveRadiusApprox;
            g.isPoint = seg.isPoint;
            g.isMainRoute = seg.isMainRoute;
            g.samples = seg.samples;
            result.add(g);
        }
        return result;
    }

    public static List<StateView> toStateList(List<RailSegment> segments) {
        List<StateView> result = new ArrayList<>(segments.size());
        for (RailSegment seg : segments) {
            StateView s = new StateView();
            s.id = seg.id;
            s.liveData = seg.liveData;
            s.lastUpdatedTick = seg.lastUpdatedTick;
            s.isActiveRoute = seg.isActiveRoute;
            s.activeRouteSource = seg.activeRouteSource;
            s.pointMovements = seg.pointMovements;
            result.add(s);
        }
        return result;
    }

    /**
     * ディスクから読み戻した2つのリストをRailSegmentへ結合する。
     * stateにしか無い/geometryにしか無いidは無視する(通常は起こらないはずだが、
     * 手動でファイルを触った場合などの防御)。
     */
    public static List<RailSegment> merge(List<GeometryView> geometryList, List<StateView> stateList) {
        Map<String, StateView> stateById = new HashMap<>();
        if (stateList != null) {
            for (StateView s : stateList) {
                if (s.id != null) {
                    stateById.put(s.id, s);
                }
            }
        }

        List<RailSegment> result = new ArrayList<>();
        if (geometryList == null) {
            return result;
        }

        for (GeometryView g : geometryList) {
            if (g.id == null) {
                continue;
            }

            RailSegment seg = new RailSegment();
            seg.id = g.id;
            seg.startX = g.startX;
            seg.startY = g.startY;
            seg.startZ = g.startZ;
            seg.endX = g.endX;
            seg.endY = g.endY;
            seg.endZ = g.endZ;
            seg.length = g.length;
            seg.yawDeltaDeg = g.yawDeltaDeg;
            seg.straight = g.straight;
            seg.curveRadiusApprox = g.curveRadiusApprox;
            seg.isPoint = g.isPoint;
            seg.isMainRoute = g.isMainRoute;
            seg.samples = g.samples;

            StateView s = stateById.get(g.id);
            if (s != null) {
                seg.liveData = s.liveData;
                seg.lastUpdatedTick = s.lastUpdatedTick;
                seg.isActiveRoute = s.isActiveRoute;
                seg.activeRouteSource = s.activeRouteSource;
                seg.pointMovements = s.pointMovements;
            }
            // stateが無い(=旧データや壊れたファイル)場合は、RailSegmentのデフォルト値
            // (liveData=trueだがRailStore側でseed時にfalseへ上書きされる)のまま残る

            result.add(seg);
        }

        return result;
    }
}