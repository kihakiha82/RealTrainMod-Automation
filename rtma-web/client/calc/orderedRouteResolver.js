'use strict';

/**
 * クライアント(src/mapEngine/railGraph.js#findRailRoute)が組み立てた
 * { id, reversed, sStart?, sEnd? }[](順序付き経路参照)を、サーバーが保持するrails.json
 * 全体と突き合わせて実体化する。
 *
 * このファイルの役割は「idをセグメント本体に解決し、reversed/sStart/sEndを
 * そのセグメントオブジェクトに付与すること」だけに限定する。
 * 実際のトリム(sStart/sEndでsamplesを切り出す)・反転(reversed)・
 * pitch/cantの符号反転は、すべて routeProfile.js の buildRouteProfile が
 * 一箇所でまとめて行う(以前はこのファイルでも同じ処理を重複して行っており、
 * 責務が分散していたことが不具合の原因だったため、ここに一本化した)。
 *
 * routeRefs: { id: string, reversed: boolean, sStart?: number, sEnd?: number }[]
 * allSegments: RailSegment[] (rails.jsonをパースしたものそのまま)
 *
 * 戻り値: buildRouteProfile()にそのまま渡せる RailSegment[]
 *   (各要素は元のセグメントのコピーに .reversed / .sStart / .sEnd を足したもの。
 *    sStart/sEndは未指定(中間セグメント)ならundefinedのまま渡す
 *    = buildRouteProfile側でセグメント全体を使う扱いになる)
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

  return routeRefs.map((ref) => {
    const seg = byId.get(ref.id);
    if (!seg) {
      throw new Error(`resolveOrderedSegments: セグメントが見つかりません(id=${ref.id})`);
    }
    return {
      ...seg,
      reversed: !!ref.reversed,
      sStart: ref.sStart,
      sEnd: ref.sEnd,
    };
  });
}

module.exports = { resolveOrderedSegments };
