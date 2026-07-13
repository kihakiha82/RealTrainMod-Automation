package net.nobukym.rtma;

/**
 * ゲームの一時停止状態を保持するだけの、サイド制限のない共通クラス。
 *
 * 実際の監視はクライアント専用のclient.ClientPauseHandlerが行い、
 * ここに結果を書き込む。このクラス自体はGuiScreen等のクライアント専用クラスを
 * 一切参照しないため、専用サーバー環境でも安全にロードできる。
 *
 * シングルプレイ(統合サーバー)では、クライアントとサーバーが同一JVM内で
 * 動作するため、この静的フィールド経由での共有で問題なく機能する。
 */
public final class ClientState {

    private ClientState() {}

    /** doesGuiPauseGame()がtrueを返すGUI(ESCメニュー等)が開いているかどうか */
    public static volatile boolean isPaused = false;
}