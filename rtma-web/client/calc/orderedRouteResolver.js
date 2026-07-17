'use strict';

/**
 * クライアント(src/mapEngine/railGraph.js#findRailRoute)が組み立てた
 * { id, reversed, sStart?, sEnd? }[](順序付き経路参照)を、サーバーが保持するrails.json
 * 全体と突き合わせて実体化する。
 *
 * reversed:true のセグメントは、そのセグメントをend→startの向きで通ることを意味するため、
 *   - samplesの順序を反転する
 *   - pitch(→routeProfile.buildRouteProfileがthetaRadに変換する値)の符号を反転する
 *     (「進行方向に対して上り=正」は走行方向基準であり、格納順とは独立のため)
 * cant・curveRadiusApprox・R(曲線半径)は向き非依存の量なので反転しない
 * (speedLimitProfile.jsの式でも常に絶対値・度数法の大きさとしてのみ使われている)。
 *
 * sStart/sEnd(経路の先頭・末尾だけに付く。始点/終点がレールの途中にある場合):
 *   セグメント自身の座標系(reversedに関係なく、samples[0]を0とした距離)での
 *   トリム範囲。省略時はセグメント全体を使う。
 *   トリムは「reversedを適用する前」のsamples順序に対して行う
 *   (findRailRoute側もこの座標系でsStart/sEndを計算しているため)。
 *
 * routeRefs: { id: string, reversed: boolean, sStart?: number, sEnd?: number }[]
 * allSegments: RailSegment[] (rails.jsonをパースしたものそのまま)
 *
 * 戻り値: buildRouteProfile()にそのまま渡せる RailSegment[] (向き調整・トリム済みの複製。
 *          何も変更が無いセグメントは元オブジェクトをそのまま使う)
 *
 * routeRefsに含まれるidがallSegments中に見つからない場合はErrorを投げる
 * (呼び出し側(server.js)で400を返す想定。rails.jsonがクライアント取得後に
 * 更新され、指定されたレールが無くなった場合などに起こりうる)。
 */

/**
 * samples間の3D距離。routeProfile.js#buildRouteProfileが累積距離(s)を出す時と
 * 同じ距離基準(3D)に揃えてある(高低差のある区間で2Dのクリック位置とズレを生まないため)。
 */
function dist3(a, b) {
  const dx = (b.x ?? 0) - (a.x ?? 0);
  const dy = (b.y ?? 0) - (a.y ?? 0);
  const dz = (b.z ?? 0) - (a.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** 2つのsample間を比率tで線形補間した新しいsampleを作る */
function interpolateSample(a, b, t) {
  return {
    x: lerp(a.x ?? 0, b.x ?? 0, t),
    y: lerp(a.y ?? 0, b.y ?? 0, t),
    z: lerp(a.z ?? 0, b.z ?? 0, t),
    yaw: lerp(a.yaw ?? 0, b.yaw ?? 0, t),
    pitch: lerp(a.pitch ?? 0, b.pitch ?? 0, t),
    roll: lerp(a.roll ?? 0, b.roll ?? 0, t),
    cant: lerp(a.cant ?? 0, b.cant ?? 0, t),
  };
}

/**
 * samples列(seg自身の座標系、samples[0]を距離0とする)上で、
 * 累積距離(3D)がsに一致する点を線形補間で求める。
 * sが範囲外なら端点をそのまま返す。
 */
function sampleAtDistance(samples, s) {
  if (samples.length === 0) return null;
  if (samples.length === 1) return { ...samples[0] };
  if (s <= 0) return { ...samples[0] };

  let cumulative = 0;
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i];
    const b = samples[i + 1];
    const d = dist3(a, b);
    if (cumulative + d >= s) {
      const t = d > 1e-9 ? (s - cumulative) / d : 0;
      return interpolateSample(a, b, t);
    }
    cumulative += d;
  }
  return { ...samples[samples.length - 1] }; // sが全長を超えていた場合は終端
}

/**
 * samples列を[sStart, sEnd](seg自身の座標系、3D累積距離。sStart <= sEnd前提)の
 * 範囲にトリムする。両端は補間で正確な点を追加し、範囲外のsampleは切り捨てる。
 */
function trimSamples(samples, sStart, sEnd) {
  if (!samples || samples.length === 0) return [];

  const cumulative = [0];
  for (let i = 1; i < samples.length; i++) {
    cumulative.push(cumulative[i - 1] + dist3(samples[i - 1], samples[i]));
  }

  const result = [sampleAtDistance(samples, sStart)];
  for (let i = 0; i < samples.length; i++) {
    if (cumulative[i] > sStart && cumulative[i] < sEnd) {
      result.push({ ...samples[i] });
    }
  }
  result.push(sampleAtDistance(samples, sEnd));
  return result;
}

function resolveOrderedSegments(routeRefs, allSegments) {
  const byId = new Map();
  for (const seg of allSegments) {
    if (seg.id != null) byId.set(seg.id, seg);
  }

  return routeRefs.map((ref) => {
    const seg = byId.get(ref.id);
    if (!seg) {
      throw new Error(`resolveOrderedSegments: セグメントが見つかりません(id=${ref.id})`);
    }

    const isTrimmed = ref.sStart != null && ref.sEnd != null;
    // 変更が無いセグメントは、既存動作を維持するため元オブジェクトをそのまま使う
    if (!isTrimmed && !ref.reversed) return seg;

    const trimmedSamples = isTrimmed
      ? trimSamples(seg.samples || [], ref.sStart, ref.sEnd)
      : (seg.samples || []).slice();

    const samples = ref.reversed
      ? trimmedSamples.slice().reverse().map((sample) => ({ ...sample, pitch: -(sample.pitch ?? 0) }))
      : trimmedSamples;

    const first = samples[0];
    const last = samples[samples.length - 1];

    return {
      ...seg,
      // start/endの座標も、実際にトリム・反転した後のsamplesに合わせて更新する
      // (seg.straight判定等、他の処理が参照する可能性があるため)
      startX: first?.x ?? seg.startX, startY: first?.y ?? seg.startY, startZ: first?.z ?? seg.startZ,
      endX: last?.x ?? seg.endX, endY: last?.y ?? seg.endY, endZ: last?.z ?? seg.endZ,
      samples,
    };
  });
}

module.exports = { resolveOrderedSegments };
