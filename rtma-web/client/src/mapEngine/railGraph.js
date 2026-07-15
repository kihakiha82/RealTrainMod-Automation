/**
 * rails.json由来のセグメント配列から隣接グラフを構築し、
 * 「始点セグメント→終点セグメント」の経路を、実際のレール長(seg.length)の合計が
 * 最小になるように探索する(Dijkstra)。
 *
 * 経路は選択(選択ハイライトそのもの)には依存せず、始点・終点の2つのセグメントIDだけで
 * 一意に決まる設計にしている(右クリックメニューの「点を設定」「終点を設定」で
 * マークしたセグメントIDを渡す想定)。
 *
 * 戻り値は { id, reversed }[] で、calc側(orderedRouteResolver.js)がこれを実体化して
 * buildRouteProfile()に渡す。reversed:true は「そのセグメントをstart→endではなく
 * end→startの向きで通る」ことを意味する。
 */

/** 座標を丸めて文字列化する(Mod側RailMapConverter#formatPointと同じ丸め方に揃える) */
function nodeKey(x, y, z) {
  return `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
}

/**
 * segments: RailSegment[](rails.jsonそのまま。各要素は id, startX/Y/Z, endX/Y/Z, length を持つ)
 * 戻り値: {
 *   byId: Map<id, segment>,
 *   segNodes: Map<id, { startNode, endNode }>,
 *   nodeToSegIds: Map<nodeKey, Set<id>>,   その座標に接続しているセグメントid一覧
 * }
 */
function buildRailGraph(segments) {
  const byId = new Map();
  const segNodes = new Map();
  const nodeToSegIds = new Map();

  function addNode(key, id) {
    let set = nodeToSegIds.get(key);
    if (!set) {
      set = new Set();
      nodeToSegIds.set(key, set);
    }
    set.add(id);
  }

  for (const seg of segments) {
    if (seg.id == null) continue; // IDの無いデータ(古いrails.json等)は経路探索の対象外
    byId.set(seg.id, seg);
    const startNode = nodeKey(seg.startX, seg.startY, seg.startZ);
    const endNode = nodeKey(seg.endX, seg.endY, seg.endZ);
    segNodes.set(seg.id, { startNode, endNode });
    addNode(startNode, seg.id);
    addNode(endNode, seg.id);
  }

  return { byId, segNodes, nodeToSegIds };
}

/**
 * startId〜endId間の最短経路(セグメント長の合計が最小)を探す。
 *
 * segments: RailSegment[](rails.jsonそのまま)
 * startId, endId: 経路の始点・終点とするセグメントのid
 *
 * 戻り値: { id: string, reversed: boolean }[](start→endの順) | null(到達不可/idが存在しない場合)
 */
export function findRailRoute(segments, startId, endId) {
  const { byId, segNodes, nodeToSegIds } = buildRailGraph(segments);

  if (!byId.has(startId) || !byId.has(endId)) return null;
  if (startId === endId) return [{ id: startId, reversed: false }];

  // Dijkstra: セグメントをノードとみなし、「隣のセグメントに移る」コストをそのセグメントの
  // length(自身を含めた累積距離)として最短経路を求める。
  // 優先度キューの代わりに配列+都度ソートを使っている(想定セグメント数は数百〜数千程度で十分実用的)。
  const dist = new Map([[startId, 0]]);
  const cameFrom = new Map(); // id -> { prevId, connectionNode }(その手前のセグメント・接続点)
  const visited = new Set();
  const queue = [startId];

  while (queue.length > 0) {
    queue.sort((a, b) => dist.get(a) - dist.get(b));
    const currentId = queue.shift();
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    if (currentId === endId) break;

    const { startNode, endNode } = segNodes.get(currentId);
    for (const node of [startNode, endNode]) {
      const neighborIds = nodeToSegIds.get(node);
      if (!neighborIds) continue;
      for (const neighborId of neighborIds) {
        if (neighborId === currentId || visited.has(neighborId)) continue;
        const neighbor = byId.get(neighborId);
        const newDist = dist.get(currentId) + (neighbor.length ?? 0);
        if (!dist.has(neighborId) || newDist < dist.get(neighborId)) {
          dist.set(neighborId, newDist);
          cameFrom.set(neighborId, { prevId: currentId, connectionNode: node });
          queue.push(neighborId);
        }
      }
    }
  }

  if (!cameFrom.has(endId)) return null; // 到達不可(選択したレールが繋がっていない等)

  // endId→startIdの順に辿ってから反転し、start→endの順のセグメント列にする
  const chain = [];
  let cursor = endId;
  while (cursor !== startId) {
    const step = cameFrom.get(cursor);
    chain.push({ id: cursor, connectionNodeBefore: step.connectionNode });
    cursor = step.prevId;
  }
  chain.push({ id: startId, connectionNodeBefore: null });
  chain.reverse();

  // 各セグメントについて、前後どちらの接続点を使っているかからreversedを決定する
  return chain.map((entry, i) => {
    const { startNode, endNode } = segNodes.get(entry.id);
    const connectionAfter = i < chain.length - 1 ? chain[i + 1].connectionNodeBefore : null;
    const connectionBefore = entry.connectionNodeBefore;

    let reversed = false;
    if (connectionAfter != null) {
      // 次のセグメントへの接続点が自分のendNodeなら順方向(start→end)、
      // startNodeなら逆方向(end→start)で通ることになる
      reversed = startNode === connectionAfter;
    } else if (connectionBefore != null) {
      // 最後のセグメント: 前のセグメントからの接続点が自分のstartNodeなら順方向
      reversed = endNode === connectionBefore;
    }
    return { id: entry.id, reversed };
  });
}
