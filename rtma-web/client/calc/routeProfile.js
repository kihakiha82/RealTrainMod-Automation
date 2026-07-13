'use strict';

/**
 * RouteProfile: 経路を距離順の1本の配列として正規化したもの。
 * 設計ドキュメント 1.2節に対応。
 *
 * points[i] = {
 *   s: number,            起点からの累積距離(ブロック)
 *   x, y, z: number,      ワールド座標(デバッグ・可視化用)
 *   R: number|null,       曲線半径近似(直線ならnull = 制限なし扱い)
 *   cant: number,         カント量
 *   thetaRad: number,     勾配角(ラジアン)。進行方向に対し上り=正、下り=負
 * }
 *
 * 分岐がある区間は、呼び出し側(UI操作等)で「どちらのルートを通るか」を
 * 決定済みの上で、1本のRailSegment配列(orderedSegments)として渡す想定。
 */

const EPS = 1e-9;

function dist3(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * orderedSegments: RailSegment[](rails.jsonの配列のうち、経路順に並んだ部分列)
 * 各RailSegmentは .samples[]({x,y,z,pitch,cant,...}) と .curveRadiusApprox を持つ。
 *
 * 戻り値: { points: Point[], totalLength: number }
 */
function buildRouteProfile(orderedSegments) {
  const points = [];
  let s = 0;

  for (const segment of orderedSegments) {
    const samples = segment.samples || [];
    const R = segment.straight ? null : (segment.curveRadiusApprox ?? null);

    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];

      if (points.length > 0) {
        const prev = points[points.length - 1];
        const d = dist3(prev, sample);
        s += d;
      }

      points.push({
        s,
        x: sample.x,
        y: sample.y,
        z: sample.z,
        R,
        cant: sample.cant ?? 0,
        // SamplePoint.pitchは度単位で入っている想定。ラジアンに変換して保持する。
        thetaRad: ((sample.pitch ?? 0) * Math.PI) / 180,
      });
    }
  }

  return { points, totalLength: points.length > 0 ? points[points.length - 1].s : 0 };
}

/**
 * 任意の距離sにおける{R, cant, thetaRad}を、前後の点から線形補間して求める。
 * s が範囲外の場合は端点の値をそのまま使う。
 */
function sampleAt(profile, s) {
  const { points } = profile;
  if (points.length === 0) {
    throw new Error('sampleAt: profile.pointsが空です');
  }
  if (s <= points[0].s) return clonePointValues(points[0]);
  if (s >= points[points.length - 1].s) return clonePointValues(points[points.length - 1]);

  // 二分探索でs以下最大のインデックスを探す
  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].s <= s) lo = mid;
    else hi = mid;
  }

  const a = points[lo];
  const b = points[hi];
  const span = b.s - a.s;
  const t = span > EPS ? (s - a.s) / span : 0;

  return {
    // Rは曲線半径。直線(null)を跨ぐ補間は意味を持たないため、
    // どちらかがnullなら制限なし(null)として扱う。
    R: a.R === null || b.R === null ? null : a.R + (b.R - a.R) * t,
    cant: a.cant + (b.cant - a.cant) * t,
    thetaRad: a.thetaRad + (b.thetaRad - a.thetaRad) * t,
  };
}

function clonePointValues(p) {
  return { R: p.R, cant: p.cant, thetaRad: p.thetaRad };
}

/**
 * 駅の停止位置(s)を、既存のprofileに「厳密なs地点」として挿入する。
 * 順走査・逆走査(v=0スタート)の起点として使うため、既存点間の補間ではなく
 * 実際に配列へ追加してソートし直す。
 *
 * stations: { name: string, s: number }[]
 * 戻り値: { points, totalLength, stationIndices: {name: index}[] }
 *         (stationIndicesは挿入後のpoints配列内でのインデックス)
 */
function insertStations(profile, stations) {
  const points = profile.points.slice();

  for (const station of stations) {
    // 既存点とsがほぼ一致するなら、新しい点を足さずその点を駅として扱う
    // (重複点ができるとstationIndicesがずれるため)
    const existing = points.find((p) => Math.abs(p.s - station.s) < EPS);
    if (existing) {
      existing.isStation = true;
      existing.stationName = station.name;
      continue;
    }

    const values = sampleAt(profile, station.s);
    points.push({ s: station.s, ...values, x: null, y: null, z: null, isStation: true, stationName: station.name });
  }

  points.sort((a, b) => a.s - b.s);

  const stationIndices = stations.map((station) => {
    const idx = points.findIndex((p) => p.isStation && p.stationName === station.name && Math.abs(p.s - station.s) < EPS);
    return { name: station.name, index: idx, s: station.s };
  });

  return { points, totalLength: profile.totalLength, stationIndices };
}

module.exports = {
  buildRouteProfile,
  sampleAt,
  insertStations,
};
