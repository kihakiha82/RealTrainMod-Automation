'use strict';

/**
 * 設計仕様書 2.4節「停車位置の解決アルゴリズム」の実装。
 *
 * 方針: 実編成長以上で最小のStopVariantを採用する(繰り上げマッチング)。
 * 厳密一致もこの規則の特殊ケースとして扱う。
 *
 * どのStopVariantよりも実編成が長い場合(NO_FIT)は、現実のドアカット運用に相当する
 * 妥協として最長のStopVariantを採用する(エラーにはしない。運行は継続する)。
 */

const { formationLength } = require('./formation');

const EPS = 1e-6;

/**
 * @param {object} track Station.tracks[]の1要素({ stops: [{ id, trainResourceName, carCount, s }, ...] })
 * @param {number} actualLengthBlocks 実際に運行する編成の全長(ブロック)
 * @param {Record<string, object>} trainSpecsByResourceName trainspecs.jsonをresourceNameでMap化したもの
 *   (stops[].trainResourceNameからtrainDistance等を引くために必要。呼び出し側で用意する)
 *
 * @returns {{
 *   stopVariant: object,
 *   warning: 'ROUNDED_UP' | 'OVERHANG' | null,
 *   overhangBlocks?: number
 * }}
 */
function resolveStopVariant(track, actualLengthBlocks, trainSpecsByResourceName) {
  if (!track || !Array.isArray(track.stops) || track.stops.length === 0) {
    throw new Error('resolveStopVariant: trackにstopsが定義されていません');
  }

  const candidates = track.stops
    .map((variant) => {
      const spec = trainSpecsByResourceName[variant.trainResourceName];
      if (!spec) {
        throw new Error(
          `resolveStopVariant: trainspecs.jsonにresourceName="${variant.trainResourceName}"が見つかりません`
        );
      }
      return { variant, length: formationLength(spec, variant.carCount) };
    })
    .sort((a, b) => a.length - b.length);

  const fit = candidates.find((c) => c.length >= actualLengthBlocks - EPS);
  const longest = candidates[candidates.length - 1];

  if (!fit) {
    // NO_FIT: どのStopVariantよりも実編成が長い。最長のStopVariantで妥協する。
    return {
      stopVariant: longest.variant,
      warning: 'OVERHANG',
      overhangBlocks: actualLengthBlocks - longest.length,
    };
  }

  const exact = Math.abs(fit.length - actualLengthBlocks) < EPS;
  return {
    stopVariant: fit.variant,
    warning: exact ? null : 'ROUNDED_UP',
  };
}

module.exports = { resolveStopVariant };
