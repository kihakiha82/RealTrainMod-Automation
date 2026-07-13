package net.nobukym.rtma.rail;

import java.util.List;

/**
 * RTMA独自のレールデータ表現。
 * RailMapConverterによって jp.ngt.rtm.rail.util.RailMap から変換される。
 *
 * フィールド名がそのままJSON出力時のキーになる想定なので、
 * 他プログラムから読みやすいよう分かりやすい名前にしている。
 */
public class RailSegment {

    public String id;

    public double startX, startY, startZ;
    public double endX, endY, endZ;

    public double length;

    /** start→endのyaw変化量(度, -180〜180)。検証用にそのまま残している */
    public double yawDeltaDeg;

    /** trueならほぼ直線とみなせる */
    public boolean straight;

    /** 曲線半径の概算値(yawの変化量と長さから算出)。直線の場合はnull */
    public Double curveRadiusApprox;

    /** ポイント(分岐)関連。TileEntityLargeRailSwitchCore -> SwitchType -> Pointから取得 */
    public boolean isPoint = false;

    /** 関連する全PointのgetMovement()の生値(0.0〜1.0)のリスト。ポイントでない場合はnull */
    public List<Float> pointMovements = null;

    /** このセグメントがPointのrmMain側(true)かrmBranch側(false)か。ポイントでなければnull */
    public Boolean isMainRoute = null;

    /** * 関連する全Pointがこのルートを「開通している」と判定しているか(AND条件)。
     * 複数レバーを持つ両渡り線などで、一部のレバーしか切り替わっていない場合はfalseになる。
     */
    public Boolean isActiveRoute = null;

    /** 始点から終点までをサンプリングした点列(曲線の形状を表現するため) */
    public List<SamplePoint> samples;

    public static class SamplePoint {
        public double x, y, z;
        public float yaw;
        public float pitch;
        public float roll;
        public float cant;
    }
}