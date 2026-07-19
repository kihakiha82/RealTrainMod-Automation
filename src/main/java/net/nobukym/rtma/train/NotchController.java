package net.nobukym.rtma.train;

/**
 * 目標速度カーブ(legProfileのs[]/v[])と現在位置・速度から、次に投入すべきノッチを決める。
 *
 * 【v2: 反応型(P制御)から物理逆算型(anticipatory)に変更】
 * 旧版は「今の速度と今の目標速度の差」だけを見るP制御で、次の問題があった:
 *   - 誤差に応じて毎tick±1段ずつ動かしていたが、1tick=0.05秒なので実質「一瞬でフル」に見え、
 *     ノッチがガチャつく(ハンチングする)
 *   - 実際のブレーキ性能を考慮せず理想カーブを追いかけるだけなので、
 *     停止目標より手前で止まってしまい、そこから再加速するという不自然な動きになる
 *
 * 新版は「この先のプロファイル頂点(次に速度が変わる地点)に、ちょうど間に合う
 * 最低限の加減速度」を運動方程式(v²=v0²+2as)から直接逆算し、それに足りる
 * 最も弱いノッチを選ぶ。実際の運転士・ATSが「早めに弱いブレーキをかけ、
 * 必要なら強める」のと同じ考え方。
 *
 * 各ノッチの加減速度テーブルは実機測定値を使う(下記定数を参照)。
 */
public final class NotchController {

    private NotchController() {}

    /**
     * ブレーキノッチ-1(最弱)〜-8(非常)の減速度実測値(ブロック/tick、絶対値)。
     * index0=notch-1, index7=notch-8。-8だけ非線形に強い(緊急ブレーキ)。
     * 出典: 実機測定値(2026年時点)。trainspecs.jsonに車種別の値が将来追加されたら、
     * そちらを優先して差し替えること(現状は全車種共通の値として扱っている)。
     */
    public static final double[] BRAKE_RATES = {
            0.0005, // notch -1
            0.0010, // notch -2
            0.0015, // notch -3
            0.0020, // notch -4
            0.0025, // notch -5
            0.0030, // notch -6
            0.0035, // notch -7
            0.0100, // notch -8 (非常)
    };

    /**
     * 不感帯の判定に使う係数。必要な加減速度が「最弱段の rate * この係数」未満なら、
     * ノッチを入れずに惰行(notch=0)のままにする。無いと僅かな誤差でも
     * ノッチ0↔1をガチャガチャ切り替えてしまう。
     */
    private static final double COAST_DEADBAND_RATIO = 0.5;

    /** プロファイルの頂点間の距離がこれ未満の場合、次の頂点を見て計算し直す(0除算・過大値の防止) */
    private static final double MIN_LOOKAHEAD_DISTANCE = 1e-4;

    /**
     * @param currentS      現在位置(経路上の距離、ブロック)。LegProfile#projectSの戻り値
     * @param currentSpeed  現在速度(ブロック/tick)。EntityTrainBase#getSpeed()
     * @param profileS      目標速度カーブの頂点のs列(昇順)。LegProfile#s
     * @param profileV      対応する目標速度列。LegProfile#v
     * @param powerRates    力行ノッチ1(最弱)〜N(最強)の加速度(ブロック/tick、絶対値、昇順)
     * @param currentNotch  現在のノッチ(未使用。将来ヒステリシス実装用に残してある)
     * @return 次に設定すべきノッチ(正=力行、負=ブレーキ、0=中立/惰行)
     */
    public static int computeNotch(
            double currentS,
            double currentSpeed,
            double[] profileS,
            double[] profileV,
            double[] powerRates,
            int currentNotch
    ) {
        int nextIdx = findNextVertexIndex(profileS, currentS);
        if (nextIdx < 0) {
            return 0; // プロファイルの終端に到達済み
        }

        double breakpointS = profileS[nextIdx];
        double breakpointV = profileV[nextIdx];
        double remaining = breakpointS - currentS;

        // 頂点にほぼ到達している場合、その次の頂点を見て判断する
        if (remaining < MIN_LOOKAHEAD_DISTANCE) {
            if (nextIdx + 1 < profileS.length) {
                nextIdx += 1;
                breakpointS = profileS[nextIdx];
                breakpointV = profileV[nextIdx];
                remaining = breakpointS - currentS;
            }
            if (remaining < MIN_LOOKAHEAD_DISTANCE) {
                return 0; // これ以上先が無い、またはほぼ距離が無い
            }
        }

        // 運動方程式 v_target^2 = v_current^2 + 2*a*d を a について解く
        // (a>0: 加速が必要、a<0: 減速が必要)
        double requiredAccel = (breakpointV * breakpointV - currentSpeed * currentSpeed) / (2 * remaining);

        if (requiredAccel > 0) {
            double weakestPower = powerRates[0];
            if (requiredAccel < weakestPower * COAST_DEADBAND_RATIO) {
                return 0; // 不感帯: 惰行のままでよい
            }
            return chooseMinimumStage(requiredAccel, powerRates) + 1; // 力行はnotch1始まり
        } else {
            double decelMagnitude = -requiredAccel;
            double weakestBrake = BRAKE_RATES[0];
            if (decelMagnitude < weakestBrake * COAST_DEADBAND_RATIO) {
                return 0; // 不感帯: 惰行のままでよい
            }
            return -(chooseMinimumStage(decelMagnitude, BRAKE_RATES) + 1); // ブレーキはnotch-1始まり
        }
    }

    /**
     * rates[](弱い順に並んでいる前提)の中から、valueに足りる最初の(=最弱の)段の
     * インデックスを返す。どの段でも足りない場合は最終段(最強)のインデックスを返す。
     */
    private static int chooseMinimumStage(double value, double[] rates) {
        for (int i = 0; i < rates.length; i++) {
            if (rates[i] >= value) return i;
        }
        return rates.length - 1;
    }

    /** currentSより先(厳密に大きい)にある、最初のプロファイル頂点のインデックスを返す。無ければ-1 */
    private static int findNextVertexIndex(double[] profileS, double currentS) {
        for (int i = 0; i < profileS.length; i++) {
            if (profileS[i] > currentS + 1e-9) return i;
        }
        return -1;
    }
}