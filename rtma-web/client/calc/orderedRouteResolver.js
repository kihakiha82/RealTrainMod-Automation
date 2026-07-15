'use strict';

/**
 * クライアント(src/mapEngine/railGraph.js#findRailRoute)が組み立てた
 * { id, reversed }[](順序付き経路参照)を、サーバーが保持するrails.json全体と
 * 突き合わせて実体化する。
 *
 * reversed:true のセグメントは、そのセグメントをend→startの向きで通ることを意味するため、
 *   - samplesの順序を反転する
 *   - pitch(→routeProfile.buildRouteProfileがthetaRadに変換する値)の符号を反転する
 *     (「進行方向に対して上り=正」は走行方向基準であり、格納順とは独立のため)
 * cant・curveRadiusApprox・R(曲線半径)は向き非依存の量なので反転しない
 * (speedLimitProfile.jsの式でも常に絶対値・度数法の大きさとしてのみ使われている)。
 *
 * routeRefs: { id: string, reversed: boolean }[]
 * allSegments: RailSegment[] (rails.jsonをパースしたものそのまま)
 *
 * 戻り値: buildRouteProfile()にそのまま渡せる RailSegment[] (向き調整済みの複製。
 *          reversed:false のセグメントは元オブジェクトをそのまま使う)
 *
 * routeRefsに含まれるidがallSegments中に見つからない場合はErrorを投げる
 * (呼び出し側(server.js)で400を返す想定。rails.jsonがクライアント取得後に
 * 更新され、指定されたレールが無くなった場合などに起こりうる)。
 */
function resolveOrderedSegments(routeRefs, allSegments) {
  const byId = new Map();
  for (const seg of allSegments) {
    if (seg.id != null) byId.set(seg.id, seg);
  }

  return routeRefs.map(({ id, reversed }) => {
    const seg = byId.get(id);
    if (!seg) {
      throw new Error(`resolveOrderedSegments: セグメントが見つかりません(id=${id})`);
    }
    if (!reversed) return seg;

    const samples = (seg.samples || [])
      .slice()
      .reverse()
      .map((sample) => ({ ...sample, pitch: -(sample.pitch ?? 0) }));

    return {
      ...seg,
      // start/endの座標も入れ替えておく(seg.straight判定等、他の処理が参照する可能性があるため)
      startX: seg.endX, startY: seg.endY, startZ: seg.endZ,
      endX: seg.startX, endY: seg.startY, endZ: seg.startZ,
      samples,
    };
  });
}

module.exports = { resolveOrderedSegments };
