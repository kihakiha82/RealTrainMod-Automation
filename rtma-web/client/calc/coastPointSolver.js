'use strict';

/**
 * CoastPointSolver: 力行→惰行→制動の3フェーズ構成でV_target(s)を組み立て、
 * 二分探索で「時刻表通りの所要時間になる」s_coast(惰行開始位置)を求める。
 * 設計ドキュメント 3.2節に対応。
 *
 * 【フェーズの考え方】
 * 1. 力行(power): 発車後、フルノッチ加速(a_accel_net)で、速度制限までまたはs_coastまで加速する。
 * 2. 惰行(coast): s_coast以降、ノッチオフ。転がり抵抗+勾配だけで速度が変化する
 *    (下り勾配が転がり抵抗を上回れば、惰行中でも加速することがあり得る)。
 * 3. 制動(brake): 「ここからはもう最大ブレーキを使わないと停止位置で止まれない」という
 *    速度(vRequired(s)、終点から逆算した必要最大速度カーブ)に達したら切り替える。
 *
 * vRequired(s)は runningTimeCalculator の逆走査(vBackward)と全く同じ考え方
 * (終点でv=0からa_brake_netで逆算)。
 *
 * s_coastを大きくする(惰行開始を遅らせる = 力行区間を伸ばす)ほど、
 * 到達速度が上がり全体の所要時間は短くなる。つまり
 *   所要時間は s_coast の単調減少関数
 * になるため、二分探索で「時刻表の所要時間」に一致するs_coastを求められる。
 */

const EPS = 1e-9;

/**
 * 終点から逆算した「ここからはこの速度以下でないと制動距離内に停止できない」曲線を計算する。
 * runningTimeCalculatorのvBackwardと同じ式。
 */
function computeVRequired(points, vLimit, aBrakeNet, startIdx, endIdx) {
  const n = endIdx - startIdx + 1;
  const vRequired = new Array(n);
  vRequired[n - 1] = 0;
  for (let i = n - 2; i >= 0; i--) {
    const idx = startIdx + i;
    const nextIdx = idx + 1;
    const ds = points[nextIdx].s - points[idx].s;
    const aBrk = aBrakeNet[nextIdx];
    const candidate = Math.sqrt(Math.max(0, vRequired[i + 1] * vRequired[i + 1] + 2 * aBrk * ds));
    vRequired[i] = Math.min(vLimit[idx], candidate);
  }
  return vRequired;
}

/**
 * 与えられたs_coast(絶対距離)に対して、力行→惰行→制動のV_target(s)を組み立てる。
 *
 * rollingBase: TrainSpec.rolling相当(転がり抵抗による減速度の基準値。ブロック/tick^2)
 * g: accelProfileと同じ較正定数(ブロック/tick^2)
 *
 * 戻り値: { v: number[], phase: string[] } (points[startIdx..endIdx]に対応する長さ)
 */
function buildTargetProfile(points, vLimit, aAccelNet, aBrakeNet, vRequired, startIdx, endIdx, sCoastAbsolute, rollingBase, g) {
  const n = endIdx - startIdx + 1;
  const v = new Array(n);
  const phase = new Array(n);
  v[0] = 0;
  phase[0] = 'power';

  let currentPhase = 'power';

  for (let i = 1; i < n; i++) {
    const idx = startIdx + i;
    const prevIdx = idx - 1;
    const ds = points[idx].s - points[prevIdx].s;

    if (currentPhase === 'power') {
      const aAcc = aAccelNet[prevIdx];
      const candidate = Math.sqrt(Math.max(0, v[i - 1] * v[i - 1] + 2 * aAcc * ds));
      const powerSpeed = Math.min(vLimit[idx], candidate);

      if (powerSpeed >= vRequired[i]) {
        // s_coastにまだ到達していなくても、これ以上力行すると停止位置で
        // 止まりきれなくなる(vRequiredを超える)ため、強制的に制動へ切り替える。
        currentPhase = 'brake';
        v[i] = vRequired[i];
      } else {
        v[i] = powerSpeed;
        if (points[idx].s >= sCoastAbsolute) {
          currentPhase = 'coast';
        }
      }
    } else if (currentPhase === 'coast') {
      // 惰行中の実効減速度。上りなら減速、下りが転がり抵抗を上回れば加速(負の減速度)になり得る。
      const thetaRad = points[prevIdx].thetaRad;
      const aCoastNet = rollingBase + g * Math.sin(thetaRad);
      const candidateSq = v[i - 1] * v[i - 1] - 2 * aCoastNet * ds;
      const candidate = Math.sqrt(Math.max(0, candidateSq));
      v[i] = Math.min(vLimit[idx], candidate);

      if (v[i] >= vRequired[i]) {
        currentPhase = 'brake';
        v[i] = vRequired[i];
      }
    } else {
      v[i] = vRequired[i];
    }

    phase[i] = currentPhase;
  }

  return { v, phase };
}

/** V(s)を台形近似で積分して所要時間(tick)を求める。
 *  区間内で平均速度が実質ゼロ(=途中で速度が尽きて進めなくなった=物理的に到達不能)の
 *  場合はInfinityを返す。呼び出し側(二分探索)はこれを「到達不能なsCoast」として扱う。
 */
function integrateTime(points, v, startIdx) {
  const n = v.length;
  let t = 0;
  for (let i = 1; i < n; i++) {
    const idx = startIdx + i;
    const prevIdx = idx - 1;
    const ds = points[idx].s - points[prevIdx].s;
    const vAvg = (v[i - 1] + v[i]) / 2;

    if (ds > EPS && vAvg <= EPS) {
      // 途中(終点以外)で速度がほぼゼロになり、これ以上進めない状態。
      return Infinity;
    }

    t += vAvg > EPS ? ds / vAvg : 0;
  }
  return t;
}

/**
 * 二分探索でs_coastを求め、V_target(s)を確定する。
 *
 * targetDurationTicks: 時刻表上のこのレッグの所要時間(tick)。
 *                       computeLegRunningTimeで求まる「最速所要時間」以上である必要がある
 *                       (それより短い時間は物理的に達成不可能なため)。
 * rollingBase, g: buildTargetProfile参照
 * options: { maxIterations?: number, tolTicks?: number }
 *
 * 戻り値: {
 *   sCoast: number,               解として求まった惰行開始位置(絶対距離)
 *   v: number[], phase: string[], // 確定したV_target(s)とフェーズ
 *   achievedDurationTicks: number,
 *   converged: boolean,
 * }
 */
function solveCoastPoint(points, vLimit, aAccelNet, aBrakeNet, startIdx, endIdx, rollingBase, g, targetDurationTicks, options = {}) {
  const { maxIterations = 40, tolTicks = 1 } = options;

  const vRequired = computeVRequired(points, vLimit, aBrakeNet, startIdx, endIdx);

  const sStart = points[startIdx].s;
  const sEnd = points[endIdx].s;

  // 参考値: s_coast = sEnd(惰行なし、常に力行→ブレーキ切替は自然発生)のときが理論最速。
  // それより短い所要時間は要求しても達成できないため、呼び出し側で事前にチェックすることを推奨する。

  let lo = sStart;
  let hi = sEnd;
  let bestSCoast = hi;
  let bestResult = null;
  let converged = false;

  for (let iter = 0; iter < maxIterations; iter++) {
    const mid = (lo + hi) / 2;
    const { v, phase } = buildTargetProfile(points, vLimit, aAccelNet, aBrakeNet, vRequired, startIdx, endIdx, mid, rollingBase, g);
    const duration = integrateTime(points, v, startIdx);

    bestSCoast = mid;
    bestResult = { v, phase, duration };

    if (Math.abs(duration - targetDurationTicks) < tolTicks) {
      converged = true;
      break;
    }

    if (duration > targetDurationTicks) {
      // 遅すぎる(所要時間が長すぎる) -> 力行区間を伸ばして速くする -> s_coastを大きくする
      lo = mid;
    } else {
      // 速すぎる(所要時間が短すぎる) -> 惰行開始を早めて遅くする -> s_coastを小さくする
      hi = mid;
    }
  }

  return {
    sCoast: bestSCoast,
    v: bestResult.v,
    phase: bestResult.phase,
    achievedDurationTicks: bestResult.duration,
    converged,
  };
}

module.exports = {
  computeVRequired,
  buildTargetProfile,
  integrateTime,
  solveCoastPoint,
};
