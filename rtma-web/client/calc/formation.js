'use strict';

/**
 * 編成(車種×両数)の実際の全長を計算する。
 *
 * RTMのモデルパック作成マニュアルにおいて、trainDistance(連結間隔。
 * trainspecs.jsonにMod側から既にエクスポートされている値)は
 * 「車体長の半分」と定義されている。つまり:
 *
 *   carLength = trainDistance * 2
 *
 * これにより、TrainSpecへの新規フィールド追加(実機測定値の後追い入力)は不要になる。
 *
 * 編成全体の長さは、車両単体の長さの合計 + 連結部の間隔(両数-1個分):
 *
 *   formationLength(carCount) = carCount * carLength + (carCount - 1) * trainDistance
 *                              = carCount * (trainDistance * 2) + (carCount - 1) * trainDistance
 *                              = trainDistance * (3 * carCount - 1)
 */

/**
 * @param {object} trainSpec trainspecs.jsonの1エントリ({ trainDistance, ... })
 * @param {number} carCount 両数(1以上の整数を想定)
 * @returns {number} 編成全長(ブロック)
 */
function formationLength(trainSpec, carCount) {
  if (!trainSpec || typeof trainSpec.trainDistance !== 'number') {
    throw new Error('formationLength: trainSpec.trainDistanceが数値ではありません');
  }
  if (!Number.isInteger(carCount) || carCount < 1) {
    throw new Error(`formationLength: carCountは1以上の整数である必要があります(受け取った値: ${carCount})`);
  }
  return trainSpec.trainDistance * (3 * carCount - 1);
}

/** carLength単体(1両分の長さ)。デバッグ・表示用に単独でも公開しておく */
function carLength(trainSpec) {
  if (!trainSpec || typeof trainSpec.trainDistance !== 'number') {
    throw new Error('carLength: trainSpec.trainDistanceが数値ではありません');
  }
  return trainSpec.trainDistance * 2;
}

module.exports = { formationLength, carLength };
