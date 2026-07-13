'use strict';

/**
 * 制限速度プロファイル V_limit(s) の計算。
 * 設計ドキュメント 2.1節に対応。
 *
 * V_limit(s) = min(Vmax, V_limit_curve(s), 分岐制限(あれば)) 、駅停止位置では0。
 *
 * 曲線速度制限式(2.1.1節、新規定義・要較正):
 *   V_limit_curve(s) = K * sqrt( R(s) * (cant(s) + Cd) )
 *
 * K, Cd はゲーム内テストで較正する前提の定数。まだ較正できていない場合は
 * 暫定値を渡しておき、後で調整できるようにする。
 */

/**
 * 【K・Cdの暫定値について(2026-07-13時点、要検証)】
 *
 * RTM自体には曲線での速度制限・脱線判定の仕組みが無いことを確認済み
 * (RailConfigに該当フィールドなし)。そのため K・Cd は物理的な安全制約ではなく、
 * 「自動運転の速度カーブをどれくらいリアルに見せるか」という設計上の値になる。
 *
 * cantフィールドが実際には「度数法(°)」の角度であることが判明したため、
 * 現実の経験式(mm・127定数ベース)をそのまま読み替えるのではなく、
 * カント角と遠心力のつりあいから素直に物理式を導出する。
 *
 *   釣り合い速度: v[m/s] = sqrt(R[m] * g * tan(θ))   (g = 9.81 m/s^2)
 *
 * 1ブロック=1m、1tick=1/20秒なので v[blocks/tick] = v[m/s] / 20。
 * よって:
 *
 *   V_limit_curve(s) = K * sqrt(R(s) * tan(θ_rad(s)))
 *   K = sqrt(g) / 20 ≈ 0.1566
 *   θ = (cant(s)[°] + Cd[°]) をラジアンに変換したもの
 *
 * Cd(カント不足の許容角度)は、在来線で一般的なカント不足量70〜105mmを、
 * 日本の狭軌(軌間1067mm)で角度換算した arcsin(70/1067)≈3.8° 〜
 * arcsin(105/1067)≈5.6° を参考に、暫定 Cd=4° とする。
 *
 * カントの単位が「ほぼ無制限に代入できる」とのことなので、実際にどこまでの
 * 角度が現実的に使われているか(既存レールの実測値)で妥当性を確認したい。
 */
const GRAVITY = 9.81; // m/s^2
const DEFAULT_K = Math.sqrt(GRAVITY) / 20; // ≈ 0.1566
const DEFAULT_CD_DEG = 4; // カント不足の許容角度(度)

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * points: routeProfile.insertStations()後のpoints配列
 *         ({s, R, cant, thetaRad, isStation?} の配列)。cantは度数法(°)。
 * options: {
 *   vmax: number,                 車両の最高速度(ブロック/tick)
 *   K?: number,                   曲線速度制限式の較正係数(省略時DEFAULT_K)
 *   CdDeg?: number,               カント不足の許容角度(度、省略時DEFAULT_CD_DEG)
 *   stationIndices?: number[],    v=0を強制するpointsのインデックス一覧
 *   switchLimits?: { sStart: number, sEnd: number, vLimit: number }[],
 * }
 *
 * 戻り値: vLimit[] (points と同じ長さ、単位はブロック/tick)
 */
function computeSpeedLimitProfile(points, options) {
  const { vmax, K = DEFAULT_K, CdDeg = DEFAULT_CD_DEG, stationIndices = [], switchLimits = [] } = options;
  const cdRad = degToRad(CdDeg);

  const stationIndexSet = new Set(stationIndices);

  return points.map((p, i) => {
    if (stationIndexSet.has(i)) return 0;

    let limit = vmax;

    if (p.R !== null && p.R !== undefined) {
      const thetaRad = degToRad(p.cant ?? 0) + cdRad;
      const curveLimit = K * Math.sqrt(Math.abs(p.R) * Math.tan(thetaRad));
      limit = Math.min(limit, curveLimit);
    }

    for (const sw of switchLimits) {
      if (p.s >= sw.sStart && p.s <= sw.sEnd) {
        limit = Math.min(limit, sw.vLimit);
      }
    }

    return Math.max(0, limit);
  });
}

module.exports = {
  computeSpeedLimitProfile,
  DEFAULT_K,
  DEFAULT_CD_DEG,
};
