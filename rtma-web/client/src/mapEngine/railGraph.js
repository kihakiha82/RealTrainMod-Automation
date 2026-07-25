/**
 * 【calc/railGraph.js との重複についての注記】
 * このファイルは calc/railGraph.js (CommonJS版、server.jsがrequire()で使う) と
 * 完全に同じロジックを持つ、ブラウザ(Vite/ESM)向けの複製。
 *
 * 以前は calc/railGraph.js への薄いre-export(`import ... from '../../calc/railGraph'`)
 * にしていたが、calc/package.json が `"type": "commonjs"` を明示しているため、
 * Vite側で @rollup/plugin-commonjs によるCJS→ESM変換が必要になり、
 * これが `vite build`(Rollup経由)では動作するのに `vite dev`(esbuildベース)では
 * 動作しない、という環境依存の不具合を引き起こした
 * (エラー例: "Failed to resolve import commonjsHelpers.js")。
 *
 * server.js側はNodeのrequire()でCJSのまま読み込む必要があり、ブラウザ側はESMの
 * import文で読み込みたいため、両立させるプラグイン変換に頼るより、
 * 「ロジック本体はDOM・ブラウザAPIに依存しない純粋関数なので、単純に複製する」
 * 方が開発環境に依存しない頑丈な解決策と判断した。
 *
 * 【重要】このファイルとcalc/railGraph.jsは、末尾のexport文以外は完全に同一のはず。
 * ロジックを変更する場合は、必ず両方のファイルに同じ変更を反映すること。
 *
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
function findRailRoute(segments, routeStart, routeEnd) {
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

/** 座標を丸めて文字列化する(nodeKeyと同じ丸め方。番線の順序決定でも同じ基準で繋がりを見る) */
function chainNodeKey(x, y, z) {
  return `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
}

/**
 * 順不同のセグメントID集合(番線を構成する物理セグメント群など)を受け取り、
 * 座標的な繋がりから「鎖として辿れる順序」+各セグメントのreversedフラグを決定する。
 *
 * 番線(Track)は、Routeのwaypointsのような「経路探索(Dijkstra)で繋ぐ」のではなく、
 * ユーザーが地図上で矩形選択・複数選択したセグメント集合をそのまま使う設計にしたため
 * (再設計仕様書1.1.1節)、探索ではなく「単純な一本の鎖になっているかどうかの検証+
 * 順序復元」だけを行う、より単純なアルゴリズムで足りる。
 *
 * 前提: 集合が分岐・ループ・非連結を含まない、単純な一本の鎖であること。
 * そうでない場合はerrorを返す(呼び出し側でユーザーにやり直しを促す)。
 *
 * @param allSegments 全RailSegment(rails-geometry.json相当)
 * @param segmentIds  順序を決定したいセグメントIDの集合(順不同)
 * @returns { ordered: { segmentId, reversed }[] } | { error: string }
 */
function orderSegmentChain(allSegments, segmentIds) {
  const idSet = new Set(segmentIds);
  const subset = allSegments.filter((s) => idSet.has(s.id));

  if (subset.length !== idSet.size) {
    return { error: '指定されたセグメントIDの一部が見つかりません' };
  }
  if (subset.length === 0) {
    return { error: 'セグメントが1つも選択されていません' };
  }
  if (subset.length === 1) {
    return { ordered: [{ segmentId: subset[0].id, reversed: false }] };
  }

  // 各座標ノードに、そのノードを端点として持つセグメント(このサブセット内)を集める
  const nodeToEntries = new Map(); // nodeKey -> { seg, end: 'start'|'end' }[]
  function addEntry(key, entry) {
    if (!nodeToEntries.has(key)) nodeToEntries.set(key, []);
    nodeToEntries.get(key).push(entry);
  }
  for (const seg of subset) {
    addEntry(chainNodeKey(seg.startX, seg.startY, seg.startZ), { seg, end: 'start' });
    addEntry(chainNodeKey(seg.endX, seg.endY, seg.endZ), { seg, end: 'end' });
  }

  function neighborsAt(key, excludeSegId) {
    return (nodeToEntries.get(key) || []).filter((e) => e.seg.id !== excludeSegId);
  }

  // 鎖の「端」候補: start側・end側どちらかで、このサブセット内に隣接セグメントが無いもの
  const endpoints = [];
  for (const seg of subset) {
    const startKey = chainNodeKey(seg.startX, seg.startY, seg.startZ);
    const endKey = chainNodeKey(seg.endX, seg.endY, seg.endZ);
    if (neighborsAt(startKey, seg.id).length === 0) endpoints.push({ seg, freeEnd: 'start' });
    if (neighborsAt(endKey, seg.id).length === 0) endpoints.push({ seg, freeEnd: 'end' });
  }

  if (endpoints.length !== 2) {
    return { error: '選択されたセグメントが単純な一本の鎖になっていません(分岐・ループ・非連結の可能性があります)' };
  }

  const visited = new Set();
  const ordered = [];
  let currentSeg = endpoints[0].seg;
  // freeEnd='start' → そのセグメントはstart→endの向きがそのまま鎖の進行方向(reversed=false)
  // freeEnd='end'   → end→startが進行方向(reversed=true)
  let currentReversed = endpoints[0].freeEnd === 'end';

  while (true) {
    ordered.push({ segmentId: currentSeg.id, reversed: currentReversed });
    visited.add(currentSeg.id);
    if (visited.size === subset.length) break;

    const forwardKey = currentReversed
        ? chainNodeKey(currentSeg.startX, currentSeg.startY, currentSeg.startZ)
        : chainNodeKey(currentSeg.endX, currentSeg.endY, currentSeg.endZ);
    const candidates = neighborsAt(forwardKey, currentSeg.id).filter((e) => !visited.has(e.seg.id));

    if (candidates.length !== 1) {
      return { error: '選択されたセグメントが単純な一本の鎖になっていません(分岐点を含んでいる可能性があります)' };
    }

    const next = candidates[0];
    currentSeg = next.seg;
    // next.end='start' → このセグメントはstart側から鎖に接続 → 進行方向はstart→end(reversed=false)
    // next.end='end'   → end側から接続 → 進行方向はend→start(reversed=true)
    currentReversed = next.end === 'end';
  }

  return { ordered };
}

/**
 * 駅の構内範囲(railSegmentIds: 構内とみなすRailSegmentの集合)から、境界点
 * (構内と構内外の境目にあたる点)を自動導出する。再設計仕様書3.1.1節参照。
 *
 * 導出ロジック: railSegmentIdsに含まれる各セグメントの両端点(start/end)について、
 * 「その座標に接続している他のセグメント」の中に railSegmentIds に含まれないもの
 * (=構内外のセグメント)が1つでもあれば、そこは境界点である。
 * buildRailGraph()が返すnodeToSegIds(座標→そこに接続する全セグメントid)を
 * そのまま再利用でき、新しい探索アルゴリズムは不要(集合演算のみで済む)。
 *
 * 【重要】集約の単位は「セグメント×端点」ではなく「物理座標(nodeKey)」。
 * Y字ポイントの根元のように、1つの物理座標に構内側の複数セグメントの端点が
 * 接続しているケースでは、セグメント単位で判定すると同じ座標が複数の境界点
 * エントリとして重複してしまう。境界点は本来ノード(座標)に対して1つ定まる
 * ものなので、同じnodeKeyに該当する判定結果は1つの境界点にまとめ、
 * その座標に接続する構内側セグメント端点をすべて`segmentEnds`に記録する。
 *
 * 【設計上の注記】ある端点が「どのセグメントにも接続していない」(=ネットワーク全体で
 * 見ても本当の行き止まり)場合は、境界点として扱わない。系統(Route)が繋がる先が
 * 存在しない以上、進入経路・退出経路として機能しえないため。
 *
 * @param allSegments rails-geometry.json相当の全RailSegment
 * @param railSegmentIds 構内とみなすセグメントIDの集合
 * @returns {
 *   nodeKey: string,
 *   x, y, z: number,
 *   segmentEnds: { segmentId, end: 'start'|'end' }[],  // 同じ座標に接続する構内側セグメント端点(通常1件、分岐の根元では2件以上)
 * }[]
 */
function deriveBoundaryPoints(allSegments, railSegmentIds) {
  const graph = buildRailGraph(allSegments);
  const idSet = new Set(railSegmentIds);
  const boundaryByNode = new Map(); // nodeKey -> { nodeKey, x, y, z, segmentEnds }

  for (const segId of railSegmentIds) {
    const seg = graph.byId.get(segId);
    const nodes = graph.segNodes.get(segId);
    if (!seg || !nodes) continue; // 構内範囲に指定されたが、現在のレールデータに存在しないセグメント

    const ends = [
      { end: 'start', nodeKey: nodes.startNode, x: seg.startX, y: seg.startY, z: seg.startZ },
      { end: 'end', nodeKey: nodes.endNode, x: seg.endX, y: seg.endY, z: seg.endZ },
    ];

    for (const { end, nodeKey, x, y, z } of ends) {
      const touchingIds = graph.nodeToSegIds.get(nodeKey) || new Set();
      const hasExternalNeighbor = [...touchingIds].some((id) => id !== segId && !idSet.has(id));
      if (!hasExternalNeighbor) continue;

      let entry = boundaryByNode.get(nodeKey);
      if (!entry) {
        entry = { nodeKey, x, y, z, segmentEnds: [] };
        boundaryByNode.set(nodeKey, entry);
      }
      entry.segmentEnds.push({ segmentId: segId, end });
    }
  }

  return [...boundaryByNode.values()];
}

export { buildRailGraph, findRailRoute, orderSegmentChain, deriveBoundaryPoints };