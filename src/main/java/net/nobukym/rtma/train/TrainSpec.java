package net.nobukym.rtma.train;

/**
 * モデルパックのTrainConfigから抽出した、車両1モデル分の性能データ。
 * JSONへのシリアライズを想定しているため、RTM独自の型は含めずプリミティブのみで構成する。
 *
 * 単位について:
 *   - accelerateion / maxSpeedStages はTrainConfigの生の単位(ブロック/tick, ブロック/tick^2)。
 *     km/h換算するには blocks/tick * 72 する
 *     (blocks/tick * 20tick/s * 3.6(m/s→km/h, 1ブロック=1m換算) = *72。実測値で検証済み)。
 *   - maxSpeedStagesは複数段階の速度上限(恐らくATS速度照査段のようなもの)。
 *     配列の最後の値が実質的な最高速度と考えられる(要検証)。
 */
public final class TrainSpec {

    /** State.ResourceNameと対応するキー(例: "kiha600") */
    public String resourceName;

    /** 加速度。単位: ブロック/tick^2 */
    public float acceleration;

    /** 複数段階の速度上限(ブロック/tick)。最後の要素が実質的な最高速度と推測 */
    public float[] maxSpeedStages;

    /** 連結間隔(ブロック) */
    public float trainDistance;

    /** 転がり抵抗係数 */
    public float rolling;

    /** モデルの作者/車種/地域名などのメタ情報(TrainConfig.tags) */
    public String tags;

    /** maxSpeedStagesの最後の値をkm/hに変換した参考値(実測データで検証済みの換算式を適用) */
    public float getTopSpeedKmh() {
        if (maxSpeedStages == null || maxSpeedStages.length == 0) return 0f;
        return maxSpeedStages[maxSpeedStages.length - 1] * 72f;
    }
}
