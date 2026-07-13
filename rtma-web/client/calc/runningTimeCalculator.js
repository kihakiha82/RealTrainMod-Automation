'use strict';

/**
 * 到達可能速度プロファイル V(s) の計算(順走査・逆走査による合成)と、
 * 距離→時間への積分。設計ドキュメント 2.2節・2.3節に対応。
 *
 * 順走査(加速側): 各駅の発車位置(v=0)からスタートし、
 *   v_forward(s+Δs) = min( V_limit(s+Δs), sqrt(v_forward(s)^2 + 2*a_accel_net(s)*Δs) )
 *
 * 逆走査(減速側): 次の駅の停止位置(v=0)から逆向きにスタートし、
 *   v_backward(s-Δs) = min( V_limit(s-Δs), sqrt(v_backward(s)^2 + 2*a_brake_net(s)*Δs) )
 *
 * 合成: V(s) = min( v_forward(s), v_backward(s) )
 *
 * 時間積分は、各区間を台形近似(平均速度 = (v[i-1]+v[i])/2)で行う。
 * これにより v=0 近辺の特異点処理(最初の一歩だけ別処理)を、
 * 場合分けなしで自然に解消できる(平均速度が有限である限りゼロ除算が起きない)。
 */

const EPS = 1e-9;

/**
 * 1駅間(レッグ)分の V(s) と t(s) を計算する。
 *
 * points: routeProfile.insertStations()後のpoints配列(s昇順)
 * vLimit, aAccelNet, aBrakeNet: pointsと同じ長さの配列
 * startIdx, endIdx: このレッグの区間([startIdx, endIdx] はpoints配列のインデックス。
 *                    points[startIdx]とpoints[endIdx]はどちらもv=0の駅停止位置とする)
 *
 * 戻り値: {
 *   s: number[],           このレッグ内の距離配列(startIdxからの相対値ではなく絶対s)
 *   v: number[],           このレッグ内の速度配列(ブロック/tick)
 *   t: number[],           このレッグ内の経過時間配列(tick, t[0]=0)
 *   legDurationTicks: number,  レッグ全体の所要時間(tick)
 * }
 */
function computeLegRunningTime(points, vLimit, aAccelNet, aBrakeNet, startIdx, endIdx) {
  const n = endIdx - startIdx + 1;
  if (n < 2) {
    throw new Error('computeLegRunningTime: レッグの区間が短すぎます(startIdx/endIdxを確認してください)');
  }

  // 順走査(加速側)
  const vForward = new Array(n);
  vForward[0] = 0;
  for (let i = 1; i < n; i++) {
    const idx = startIdx + i;
    const prevIdx = idx - 1;
    const ds = points[idx].s - points[prevIdx].s;
    const aAcc = aAccelNet[prevIdx];
    const candidate = Math.sqrt(Math.max(0, vForward[i - 1] * vForward[i - 1] + 2 * aAcc * ds));
    vForward[i] = Math.min(vLimit[idx], candidate);
  }

  // 逆走査(減速側)
  const vBackward = new Array(n);
  vBackward[n - 1] = 0;
  for (let i = n - 2; i >= 0; i--) {
    const idx = startIdx + i;
    const nextIdx = idx + 1;
    const ds = points[nextIdx].s - points[idx].s;
    const aBrk = aBrakeNet[nextIdx];
    const candidate = Math.sqrt(Math.max(0, vBackward[i + 1] * vBackward[i + 1] + 2 * aBrk * ds));
    vBackward[i] = Math.min(vLimit[idx], candidate);
  }

  // 合成
  const v = new Array(n);
  for (let i = 0; i < n; i++) {
    v[i] = Math.min(vForward[i], vBackward[i]);
  }

  // 距離→時間の積分(台形近似)
  const t = new Array(n);
  t[0] = 0;
  for (let i = 1; i < n; i++) {
    const idx = startIdx + i;
    const prevIdx = idx - 1;
    const ds = points[idx].s - points[prevIdx].s;
    const vAvg = (v[i - 1] + v[i]) / 2;
    t[i] = t[i - 1] + (vAvg > EPS ? ds / vAvg : 0);
  }

  const s = [];
  for (let i = 0; i < n; i++) s.push(points[startIdx + i].s);

  return { s, v, t, legDurationTicks: t[n - 1] };
}

module.exports = {
  computeLegRunningTime,
};
