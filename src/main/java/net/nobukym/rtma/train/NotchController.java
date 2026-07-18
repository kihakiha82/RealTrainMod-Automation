package net.nobukym.rtma.train;

/**
 * 目標速度と現在速度の誤差から、次に投入すべきノッチを決める。
 * TrainState.notchの検証済み知見(正=力行側、負=ブレーキ側)に基づく。
 *
 * 【方式: 速度誤差ベースのP制御】
 * 誤差(目標-現在)の大きさに応じてノッチを何段動かすか決め、
 * 実車の運転士が一気に全ノッチを投入しないのと同じ考え方で、
 * 1tickあたりの変化量を±1段にクランプする。
 *
 * 【既知の要チューニング項目】
 * - SPEED_ERROR_PER_NOTCH: この値が小さいほど敏感(ハンチングしやすい)、
 *   大きいほど鈍い(目標に届くまで遅い)。実機で走らせながら調整する想定。
 * - DEFAULT_MAX_BRAKE_NOTCH: trainspecs.jsonにブレーキ段数の情報がまだ無いため、
 *   力行ノッチ数と同じ値を暫定的に使っている
 *   (Web側 /api/simple-schedule の aBrakeBase 代用と同じ考え方)。
 */
public final class NotchController {

    private NotchController() {}

    /** ブレーキ段数(trainspecs.jsonにまだ無いため暫定値。要検証・要差し替え) */
    private static final int DEFAULT_MAX_BRAKE_NOTCH = 3;

    /** この速度誤差(ブロック/tick)あたりノッチ1段。0.02 blocks/tick ≒ 3.6km/h */
    private static final double SPEED_ERROR_PER_NOTCH = 0.02;

    /** 目標・現在速度がこれ未満なら「停止」とみなし、ノッチを0に固定する */
    private static final double STOP_SPEED_EPS = 1e-3;

    /**
     * @param targetSpeed  現在位置における目標速度(ブロック/tick)。LegProfile#speedAtの戻り値
     * @param currentSpeed 列車の現在速度(ブロック/tick)。EntityTrainBase#getSpeed()
     * @param currentNotch 列車の現在ノッチ。EntityTrainBase#getNotch()
     * @param maxPowerNotch 力行側の最大ノッチ段数(trainspecs.maxSpeedStages.length相当)
     * @return 次に設定すべきノッチ(正=力行、負=ブレーキ、0=中立)
     */
    public static int computeNotch(double targetSpeed, double currentSpeed, int currentNotch, int maxPowerNotch) {
        // 目標・現在ともにほぼ停止しているなら、ノッチを切って待機する
        if (targetSpeed < STOP_SPEED_EPS && currentSpeed < STOP_SPEED_EPS * 10) {
            return 0;
        }

        double error = targetSpeed - currentSpeed; // 正なら加速が必要、負なら減速が必要
        int step = (int) Math.round(error / SPEED_ERROR_PER_NOTCH);

        int desired = currentNotch + step;
        // 1tickあたりの変化量を±1段にクランプ(急なノッチ操作を避ける)
        if (desired > currentNotch + 1) desired = currentNotch + 1;
        if (desired < currentNotch - 1) desired = currentNotch - 1;

        if (desired > maxPowerNotch) desired = maxPowerNotch;
        if (desired < -DEFAULT_MAX_BRAKE_NOTCH) desired = -DEFAULT_MAX_BRAKE_NOTCH;

        return desired;
    }
}