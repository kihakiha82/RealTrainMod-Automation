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
 */

const EPS = 1e-9;

function dist3(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * 2つのサンプル点（a, b）の間を比率 t (0.0〜1.0) で線形補間する
 */
function interpolateSample(a, b, t) {
  const result = {};
  for (const key in a) {
    if (typeof a[key] === 'number' && typeof b[key] === 'number') {
      result[key] = a[key] + (b[key] - a[key]) * t;
    } else {
      // 数値以外のプロパティは a からそのままコピー
      result[key] = a[key];
    }
  }
  return result;
}

/**
 * セグメント全体のサンプル配列から、セグメント内距離 [sStart, sEnd] に収まる範囲を切り出す。
 * 境界となる始点・終点は、正確な位置になるよう補間された点を生成して挿入する。
 */
function trimSamples(samples, sStart, sEnd) {
  if (samples.length < 2) return samples;

  // 1. 各サンプルのセグメント開始点からのローカル累積距離を計算
  const localSamples = [];
  let cumulative = 0;
  for (let i = 0; i < samples.length; i++) {
    const current = samples[i];
    if (i > 0) {
      cumulative += dist3(samples[i - 1], current);
    }
    localSamples.push({ s: cumulative, sample: current });
  }

  // sStart, sEnd が未定義の場合はセグメント全体を対象とする。範囲外の値はクリップする
  const actualStart = Math.max(0, Math.min(cumulative, sStart !== undefined && sStart !== null ? sStart : 0));
  const actualEnd = Math.max(0, Math.min(cumulative, sEnd !== undefined && sEnd !== null ? sEnd : cumulative));

  const result = [];

  for (let i = 0; i < localSamples.length - 1; i++) {
    const a = localSamples[i];
    const b = localSamples[i + 1];
    const aS = a.s;
    const bS = b.s;
    const segLen = bS - aS;

    // この線分が切り出し範囲 [actualStart, actualEnd] に重なっている場合
    if (bS >= actualStart && aS <= actualEnd) {
      // 線分内のどの比率（t0 から t1）を切り出すか計算
      const t0 = segLen > 1e-9 ? Math.max(0, (actualStart - aS) / segLen) : 0;
      const t1 = segLen > 1e-9 ? Math.min(1, (actualEnd - aS) / segLen) : 1;

      // 開始点を補間して挿入（最初の1回のみ）
      if (result.length === 0) {
        result.push(interpolateSample(a.sample, b.sample, t0));
      }
      // 終了点（または途中の点）を補間して挿入
      result.push(interpolateSample(a.sample, b.sample, t1));
    }
    if (aS > actualEnd) break;
  }

  return result;
}

/**
 * orderedSegments: RailSegment[](rails.jsonの配列のうち、経路順に並んだ部分列)
 * 各 RailSegment は .samples[] のほか、任意で .sStart, .sEnd, .reversed を持つ想定。
 *
 * 戻り値: { points: Point[], totalLength: number }
 */
function buildRouteProfile(orderedSegments) {
  const points = [];
  let s = 0;

  for (const segment of orderedSegments) {
    const rawSamples = segment.samples || [];

    // 1. 途中からの開始・終了を反映したサンプルを切り出す
    let samples = trimSamples(rawSamples, segment.sStart, segment.sEnd);


    // 2. 逆送（reversed）の場合はサンプル列を反転する
    if (segment.reversed) {
      samples.reverse();
    }

    const R = segment.straight ? null : (segment.curveRadiusApprox ?? null);

    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];

      if (points.length > 0) {
        const prev = points[points.length - 1];
        const d = dist3(prev, sample);
        s += d;
      }

      // 3. 逆送の場合、進行方向を基準にする物理量の符号を反転させる
      const directionMultiplier = segment.reversed ? -1 : 1;
      const pitch = sample.pitch ?? 0;
      const cant = sample.cant ?? 0;

      points.push({
        s,
        x: sample.x,
        y: sample.y,
        z: sample.z,
        R,
        // カントは左右が逆転するため符号を反転
        cant: cant * directionMultiplier,
        // 勾配は上り/下りが逆転するため符号を反転
        thetaRad: ((pitch * directionMultiplier) * Math.PI) / 180,
      });
    }
  }
  console.log("1")
  return { points, totalLength: points.length > 0 ? points[points.length - 1].s : 0 };
}

/**
 * 任意の距離sにおける{R, cant, thetaRad}を、前後の点から線形補間して求める。
 */
function sampleAt(profile, s) {
  const { points } = profile;
  if (points.length === 0) {
    throw new Error('sampleAt: profile.pointsが空です');
  }
  if (s <= points[0].s) return clonePointValues(points[0]);
  if (s >= points[points.length - 1].s) return clonePointValues(points[points.length - 1]);

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
 */
function insertStations(profile, stations) {
  const points = profile.points.slice();

  for (const station of stations) {
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