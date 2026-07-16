/**
 * rails.json由来のセグメント配列から隣接グラフを構築し、
 * 「始点→終点」の経路を、実際のレール長の合計が最小になるように探索する(Dijkstra)。
 *
 * v2: 始点・終点は「セグメント全体」ではなく、
 *   { segId: string, s: number }  (segId自身の座標系で、startからの距離。0〜seg.length)
 * という「セグメント上のどこか一点」で指定できる。
 *
 * グラフの組み方を「物理座標をノード、セグメントをエッジ」という素直な形に変更し、
 * 始点・終点はその座標グラフに挿入する仮想ノードとして表現する:
 *
 *   [接続ノードA] --(距離 a)-- ★始点(仮想ノード) --(距離 b)-- [接続ノードB]
 *                                                    (a + b = seg.length)
 *
 * 戻り値は { id, reversed, sStart?, sEnd? }[] で、calc側(orderedRouteResolver.js)が
 * これを実体化してbuildRouteProfile()に渡す。
 *   reversed: true は「そのセグメントをstart→endではなくend→startの向きで通る」ことを意味する。
 *   sStart/sEnd: 経路の先頭・末尾のセグメントだけに付き、
 *                「そのセグメント自身の座標系(reversedに関係なく)」でのトリム範囲を表す。
 *                省略時(中間セグメント)はセグメント全体を使う。
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

const V_START = Symbol('routeStart');
const V_END = Symbol('routeEnd');

/**
 * routeStart, routeEnd: { segId: string, s: number }
 *   segId: 経路の始点・終点とするセグメントのid
 *   s: そのセグメント自身の座標系(start=0)で、始点/終点までの距離(0〜seg.length)
 *
 * 戻り値: { id, reversed, sStart?, sEnd? }[](start→endの順) | null(到達不可/idが存在しない場合)
 */
export function findRailRoute(segments, routeStart, routeEnd) {
  const { byId, segNodes, nodeToSegIds } = buildRailGraph(segments);

  const startSeg = byId.get(routeStart?.segId);
  const endSeg = byId.get(routeEnd?.segId);
  if (!startSeg || !endSeg) return null;

  const startSegLen = startSeg.length ?? 0;
  const endSegLen = endSeg.length ?? 0;

  // 特殊ケース: 始点・終点が同じセグメント上 → グラフ探索せず、その区間だけを返す
  if (routeStart.segId === routeEnd.segId) {
    const sLo = Math.min(routeStart.s, routeEnd.s);
    const sHi = Math.max(routeStart.s, routeEnd.s);
    return [{
      id: routeStart.segId,
      reversed: routeEnd.s < routeStart.s,
      sStart: sLo,
      sEnd: sHi,
    }];
  }

  const { startNode: startSegStartNode, endNode: startSegEndNode } = segNodes.get(startSeg.id);
  const { startNode: endSegStartNode, endNode: endSegEndNode } = segNodes.get(endSeg.id);

  /** あるノードから出ているエッジ一覧 { to, weight, segId } を返す */
  function edgesFrom(node) {
    if (node === V_START) {
      // 始点セグメントを、クリック位置で両側に割った2本の仮想エッジ
      return [
        { to: startSegStartNode, weight: routeStart.s, segId: startSeg.id },
        { to: startSegEndNode, weight: startSegLen - routeStart.s, segId: startSeg.id },
      ];
    }
    if (node === V_END) {
      return []; // 行き止まり(V_ENDへは他ノードからの片方向エッジでのみ到達させる)
    }

    const result = [];
    const segIds = nodeToSegIds.get(node);
    if (segIds) {
      for (const segId of segIds) {
        const seg = byId.get(segId);
        const { startNode, endNode } = segNodes.get(segId);
        const other = startNode === node ? endNode : startNode;
        result.push({ to: other, weight: seg.length ?? 0, segId });
      }
    }
    // このノードが終点セグメントの端点なら、V_ENDへの仮想エッジも足す
    if (node === endSegStartNode) {
      result.push({ to: V_END, weight: routeEnd.s, segId: endSeg.id });
    }
    if (node === endSegEndNode) {
      result.push({ to: V_END, weight: endSegLen - routeEnd.s, segId: endSeg.id });
    }
    return result;
  }

  // Dijkstra(物理ノード + 仮想ノード V_START/V_END のグラフ上)
  const dist = new Map([[V_START, 0]]);
  const cameFrom = new Map(); // node -> { fromNode, segId }(このノードに来る際に通ったセグメント)
  const visited = new Set();
  const queue = [V_START];

  while (queue.length > 0) {
    queue.sort((a, b) => dist.get(a) - dist.get(b));
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    if (current === V_END) break;

    for (const edge of edgesFrom(current)) {
      if (visited.has(edge.to)) continue;
      const newDist = dist.get(current) + edge.weight;
      if (!dist.has(edge.to) || newDist < dist.get(edge.to)) {
        dist.set(edge.to, newDist);
        cameFrom.set(edge.to, { fromNode: current, segId: edge.segId });
        queue.push(edge.to);
      }
    }
  }

  if (!cameFrom.has(V_END)) return null; // 到達不可(始点・終点が線路で繋がっていない)

  // V_END → V_START の順に辿ってから反転し、各ホップ(1セグメント分の通過)の列にする
  const hops = [];
  let cursor = V_END;
  while (cursor !== V_START) {
    const step = cameFrom.get(cursor);
    hops.push({ toNode: cursor, fromNode: step.fromNode, segId: step.segId });
    cursor = step.fromNode;
  }
  hops.reverse();

  return hops.map((hop, i) => {
    const isFirst = i === 0;
    const isLast = i === hops.length - 1;
    const { startNode } = segNodes.get(hop.segId);

    if (isFirst) {
      // V_START → 実ノード: 始点セグメントの部分区間(クリック位置〜到達したノード)
      const wentToOwnStart = hop.toNode === startNode; // 自身のstartNode側に向かった = end→start方向
      return {
        id: hop.segId,
        reversed: wentToOwnStart,
        sStart: wentToOwnStart ? 0 : routeStart.s,
        sEnd: wentToOwnStart ? routeStart.s : startSegLen,
      };
    }

    if (isLast) {
      // 実ノード → V_END: 終点セグメントの部分区間(到達したノード〜クリック位置)
      const cameFromOwnStart = hop.fromNode === startNode; // 自身のstartNode側から来た = start→end方向
      return {
        id: hop.segId,
        reversed: !cameFromOwnStart,
        sStart: cameFromOwnStart ? 0 : routeEnd.s,
        sEnd: cameFromOwnStart ? routeEnd.s : endSegLen,
      };
    }

    // 中間セグメント: 全区間を通過。自身のstartNodeに"到達"した = end→start方向に通った
    const reversed = hop.toNode === startNode;
    return { id: hop.segId, reversed };
  });
}
