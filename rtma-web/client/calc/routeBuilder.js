'use strict';

/**
 * 設計仕様書 3.2節「path(導出値)」の実装。
 *
 * Route.waypoints(進行方向順の経由点配列)から、実際にレールを繋いだ
 * { id, reversed, sStart?, sEnd? }[] を導出する。これは保存対象の一次データではなく、
 * waypointsさえあれば毎回再計算できる派生値(キャッシュ)である。
 *
 * 新しい経路探索ロジックは作らず、既存のfindRailRoute(calc/railGraph.js。
 * 元々client/src/mapEngine/railGraph.jsにあったものと同一実装)をそのまま使う。
 */

const { findRailRoute } = require('./railGraph');

/**
 * @param {Array<{segId: string, s: number}>} waypoints 進行方向順の経由点(2点以上必要)
 * @param {Array} segments RailSegment[](rails-geometry.json由来。id, startX/Y/Z, endX/Y/Z, lengthを持つもの)
 * @returns {{ path: Array } | { error: 'UNREACHABLE', atIndex: number } | { error: 'INSUFFICIENT_WAYPOINTS' }}
 */
function buildPath(waypoints, segments) {
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    return { error: 'INSUFFICIENT_WAYPOINTS' };
  }

  const path = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const leg = findRailRoute(segments, waypoints[i], waypoints[i + 1]);
    if (!leg) {
      // waypoints[i] と waypoints[i+1] が線路で繋がっていない
      return { error: 'UNREACHABLE', atIndex: i };
    }
    path.push(...leg);
  }
  return { path };
}

module.exports = { buildPath };
