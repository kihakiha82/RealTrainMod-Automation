'use strict';

/**
 * 勾配による実効加減速度の補正。設計ドキュメント 2.2.1節に対応。
 *
 *   a_accel_net(s) = a_accel_base - g * sin(θ(s))   上りは加速しづらく、下りは加速しやすい
 *   a_brake_net(s) = a_brake_base + g * sin(θ(s))   上りはブレーキが効きやすく、下りは効きにくい
 *
 * 急な上り勾配で a_accel_net(s) <= 0 になり得る(モーター出力より勾配抵抗が大きい)ため、
 * その場合は0でクランプし「これ以上加速できず現在速度維持が精一杯」として扱う。
 *
 * a_brake_net(s)は設計ドキュメント上クランプの指定が無いため、
 * 急な下りで理論上ブレーキが効かなくなるケース(負値)もそのまま計算結果として返す。
 * これは較正・検証時に「この勾配ではこのブレーキ性能では止まれない」ことを示す
 * 有用な情報になる。
 */

/**
 * points: routeProfile由来の {thetaRad} を持つ配列
 * options: {
 *   aAccelBase: number,  平坦区間での加速度(ブロック/tick^2。TrainSpec.accelerationに対応)
 *   aBrakeBase: number,  平坦区間での減速度(ブロック/tick^2。常用最大ブレーキ相当を想定)
 *   g: number,           重力加速度相当の較正定数(ブロック/tick^2)。要較正。
 * }
 *
 * 戻り値: { aAccelNet: number[], aBrakeNet: number[] } (pointsと同じ長さ)
 */
function computeAccelProfile(points, options) {
  const { aAccelBase, aBrakeBase, g } = options;

  const aAccelNet = new Array(points.length);
  const aBrakeNet = new Array(points.length);

  for (let i = 0; i < points.length; i++) {
    const sinTheta = Math.sin(points[i].thetaRad);
    aAccelNet[i] = Math.max(0, aAccelBase - g * sinTheta);
    aBrakeNet[i] = aBrakeBase + g * sinTheta;
  }

  return { aAccelNet, aBrakeNet };
}

module.exports = {
  computeAccelProfile,
};
