package net.nobukym.rtma.data;

/**
 * Web側の初期表示(プレイヤー位置を中心にする)・プレイヤーマーカー表示のために
 * 書き出す、プレイヤーの現在座標・名前・UUID。
 *
 * シングルプレイ想定。マルチプレイは現状考慮せず、
 * ワールド内の最初の1人のプレイヤーの情報のみを書き出す。
 *
 * PlayerNameは、Web側で顔アイコン画像(saves/<world>/rtma/images/players/<名前>.png、
 * PlayerLoginHandler/GetPlayerHeadが生成する)のファイル名を組み立てるために使う。
 */
public class PlayerPosition {
    public boolean isServerRunning;
    public double x;
    public double y;
    public double z;
    public String PlayerName;
    public String uuid;
    public boolean isPaused;
}