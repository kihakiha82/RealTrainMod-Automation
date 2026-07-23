/**
 * 2Dマップ(レール・ポイント表示)のキャンバス描画ロジック。
 *
 * createMap2DController(container) を呼ぶとcanvasを生成し、
 * { setSegments, resetView, destroy } を返す。
 * Reactコンポーネント(Map2D.jsx)からuseRef経由で使われる想定。
 *
 * 以前の public/js/map2d.js のロジックを、Reactのマウント/アンマウント
 * (特にStrictModeでの二重実行)でも安全なように、グローバルなシングルトン
 * オブジェクトではなくファクトリ関数の形に書き直したもの。
 *
 * 操作:
 *   - 左クリック(ドラッグ無し) = 単一選択(既存の選択は解除される)
 *   - 左クリックドラッグ = 矩形範囲選択(掛かったセグメントをまとめて選択)
 *   - Ctrl/Cmd+左クリック(またはCtrl/Cmd+ドラッグ) = 複数選択に追加/個別トグル
 *   - Ctrl/Cmd+A(マップ内にマウスがある時) = 全選択
 *   - 中クリック(ホイールボタン)ドラッグ = パン(マップ移動)
 *   - マウスホイール = ズーム(カーソル中心)
 *   - 右クリック(セグメント上) = コンテキストメニューを開く要求をonContextMenuで通知する
 *     (メニューの中身自体はReact側(ContextMenu.jsx)が持つ。ここではヒット判定と選択状態の
 *     調整、およびクリック位置をそのセグメント上の点(railPoint: { segId, s, x, z })に
 *     変換して一緒に渡す処理を行う。sはそのセグメント自身の座標系でのstartからの距離)
 *
 * 簡易運行の始点/終点(setRouteStart/setRouteEnd)は、レール上の任意の点
 * ({ segId, s, x, z })として設定でき、緑(始点)/赤(終点)の丸マーカーで表示される。
 * マーカーはドラッグして位置を微調整できる(そのセグメントの線上に拘束される)。
 * ドラッグ確定時(mouseup)にonRoutePointChange('start'|'end', point)でReact側に通知する。
 * グリッドは1,2,4,8,16(1チャンク),32...ブロックの中からズームに応じて自動選択する。
 *
 * options.onSelectionChange: (Set<string>) => void
 *   ユーザー操作で選択セグメント集合(seg.idのSet)が変わった時に呼ばれる。
 *   React側(App.jsx)のstateへ橋渡しする想定。
 */
import arrowIconUrl from '../assets/arrow-icon.svg';
import { STOP_ICON_SHAPES } from '../iconShapes';

const STOP_ICON_SYMBOL_BY_ID = Object.fromEntries(STOP_ICON_SHAPES.map((s) => [s.id, s.symbol]));

export function createMap2DController(container, options = {}) {
  const { onSelectionChange, onContextMenu, onRoutePointChange } = options;
  const canvas = document.createElement('canvas');
  canvas.style.cursor = 'default';
  canvas.style.display = 'block';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const state = {
    segments: [],
    player: null,
    routePath: null, // { id, reversed }[](簡易運行のプレビュー経路)
    routeEditPath: null, // { id, reversed, sStart?, sEnd? }[](路線編集モードのプレビュー経路。routePathと見た目のロジックを共有する)
    routeWaypoints: [], // { segId, s, x, z }[](路線編集モードの経由点。番号付きマーカーで表示)
    stations: [], // Station[](/api/stationsそのまま。駅の長方形・番線の枠線・停車位置アイコンの描画に使う)
    routeStart: null, // { segId, s, x, z } | null(レール途中の始点)
    routeEnd: null,   // { segId, s, x, z } | null(レール途中の終点)
    scale: 1,
    offsetX: 0,
    offsetZ: 0,
    hasCamera: false, // centerOn/resetViewが一度も呼ばれていない間は描画しない(初期位置のずれを防ぐ)
    // 中クリックドラッグによるパン
    panning: false,
    dragStartScreenX: 0,
    dragStartScreenY: 0,
    dragStartOffsetX: 0,
    dragStartOffsetZ: 0,
    // 左クリックによる選択/矩形選択
    leftPressActive: false,
    leftDownScreenX: 0,
    leftDownScreenY: 0,
    leftDownCtrl: false,
    rectSelecting: false,
    rectCurrentScreenX: 0,
    rectCurrentScreenY: 0,
    // Ctrl+A全選択のため、マウスがマップ上にあるかどうかを追跡
    pointerOverMap: false,
    selectedIds: new Set(),
    hoveredId: null,
    // 始点/終点マーカーのドラッグ
    draggingRole: null,  // 'start' | 'end' | null
    draggingSegId: null, // ドラッグ中、位置をこのセグメントの線上に拘束する
  };

  // プレイヤー顔アイコンの読み込み状態(プレイヤー名が変わった時だけ再読み込みする)
  let playerImage = null;
  let playerImageKey = null;

  // 矢印アイコン画像(固定アセットなので初回に1回だけ読み込む)
  let arrowImage = null;
  let arrowImageLoaded = false;
  (function loadArrowImage() {
    const img = new Image();
    img.onload = () => {
      arrowImage = img;
      arrowImageLoaded = true;
      draw();
    };
    img.onerror = () => {
      arrowImageLoaded = false;
    };
    img.src = arrowIconUrl;
  })();

  const MIN_SCALE = 0.02;
  const MAX_SCALE = 300;
  const GRID_STEPS = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096];
  const TARGET_GRID_PX = 70;
  const RULER_SIZE = 26;
  const DEFAULT_INITIAL_SCALE = 8; // プレイヤー位置を中心にする際の初期ズーム倍率(px/block)
  const PLAYER_ICON_SIZE = 24; // プレイヤーアイコンの画面上の大きさ(ズームに関わらず固定px)

  function readColors() {
    const style = getComputedStyle(document.documentElement);
    const get = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
    return {
      rail: get('--rail', '#5a6472'),
      main: get('--green', '#3ddc84'),
      branch: get('--amber', '#e8a33d'),
      idle: get('--red', '#e85d4d'),
      panel: get('--panel', '#11151a'),
      line: get('--line', '#232a32'),
      text: get('--text-dim', '#7d8893'),
      select: get('--select', '#4da3ff'),
      route: get('--route', '#ffb700'), // 経路ハイライト色(デフォルト: オレンジ)
      waypoint: get('--purple', '#a374ff'), // 路線編集の経由点マーカー色(デフォルト: 紫。始点/終点の緑/赤と区別するため)
    };
  }
  const colors = readColors();

  const HIT_RADIUS_PX = 6; // クリック/ホバー判定の画面上の許容半径(px)
  const CLICK_MOVE_THRESHOLD_PX = 5; // これ未満の移動ならドラッグではなくクリックとみなす
  const ARROW_SIZE = 8; // 矢印アイコンのサイズ(px)
  const ARROW_SPACING = 20; // 矢印間のスペーシング(px)
  const ROUTE_POINT_RADIUS = 7; // 始点/終点マーカーの半径(px)

  function resize() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  }

  function pointsOf(seg) {
    if (seg.samples && seg.samples.length >= 2) return seg.samples;
    return [
      { x: seg.startX, z: seg.startZ },
      { x: seg.endX, z: seg.endZ },
    ];
  }

  /**
   * seg自身のポリライン(pointsOf)を、seg自身の座標系(points[0]を距離0とする、2D)での
   * [sStart, sEnd]の範囲だけに絞った点列を返す。始点/終点をレール途中に設定した経路の
   * 表示(ハイライト・矢印)で、セグメント全体ではなく実際に通る区間だけを描くのに使う。
   * (sStart/sEndの由来であるprojectOntoSegmentと同じ2D距離基準)
   */
  function pointsInRange(seg, sStart, sEnd) {
    const points = pointsOf(seg);
    if (points.length < 2) return points;

    const result = [];
    let cumulative = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const segLen = Math.hypot(dx, dz);
      const aS = cumulative;
      const bS = cumulative + segLen;

      if (bS >= sStart && aS <= sEnd) {
        const t0 = segLen > 1e-9 ? Math.max(0, (sStart - aS) / segLen) : 0;
        const t1 = segLen > 1e-9 ? Math.min(1, (sEnd - aS) / segLen) : 1;
        if (result.length === 0) result.push({ x: a.x + dx * t0, z: a.z + dz * t0 });
        result.push({ x: a.x + dx * t1, z: a.z + dz * t1 });
      }

      cumulative = bS;
      if (cumulative > sEnd) break;
    }

    return result;
  }

  /**
   * segの座標系での距離sにある1点のワールド座標を返す(pointsInRangeのsStart=sEnd特殊ケース)。
   * 停車位置(StopVariant.s)を実際の地図上の点に変換するのに使う。
   * sがセグメント長を超える/負など不正な場合はnullを返す。
   */
  function pointAtDistance(seg, s) {
    const points = pointsInRange(seg, s, s);
    return points.length > 0 ? points[0] : null;
  }

  function fitView() {
    if (state.segments.length === 0) return;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const seg of state.segments) {
      for (const p of pointsOf(seg)) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minZ = Math.min(minZ, p.z);
        maxZ = Math.max(maxZ, p.z);
      }
    }
    if (!isFinite(minX)) return;

    const padding = RULER_SIZE + 30;
    const w = Math.max(1, canvas.width - padding * 2);
    const h = Math.max(1, canvas.height - padding * 2);
    const spanX = Math.max(1, maxX - minX);
    const spanZ = Math.max(1, maxZ - minZ);
    state.scale = Math.min(w / spanX, h / spanZ);
    state.offsetX = padding - minX * state.scale;
    state.offsetZ = padding - minZ * state.scale;
  }

  function toScreen(x, z) {
    return [x * state.scale + state.offsetX, z * state.scale + state.offsetZ];
  }
  function toWorld(sx, sz) {
    return [(sx - state.offsetX) / state.scale, (sz - state.offsetZ) / state.scale];
  }

  function colorFor(seg) {
    if (!seg.isPoint) return colors.rail;
    if (!seg.isActiveRoute) return colors.idle;
    return seg.isMainRoute ? colors.main : colors.branch;
  }

  function isSelected(seg) {
    return seg.id != null && state.selectedIds.has(seg.id);
  }
  function isHovered(seg) {
    return seg.id != null && state.hoveredId === seg.id;
  }
  function isInRoute(seg) {
    return state.routePath && state.routePath.some(r => r.id === seg.id);
  }
  /**
   * そのセグメントに対応する経路参照({ id, reversed, sStart?, sEnd? })を探す。
   * 簡易運行(routePath)と路線編集(routeEditPath)は同時に使われない前提だが、
   * 念のため両方を見て、見た目のハイライトロジック(drawSegment等)を共有する。
   */
  function findRouteEntry(seg) {
    if (state.routePath) {
      const found = state.routePath.find(r => r.id === seg.id);
      if (found) return found;
    }
    if (state.routeEditPath) {
      return state.routeEditPath.find(r => r.id === seg.id);
    }
    return undefined;
  }

  /** 点(px,pz)から線分(ax,az)-(bx,bz)への最短距離(ワールド座標系) */
  function distToSegment(px, pz, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const lenSq = dx * dx + dz * dz;
    if (lenSq === 0) return Math.hypot(px - ax, pz - az);
    let t = ((px - ax) * dx + (pz - az) * dz) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
  }

  /** 点からポリライン(samples列)への最短距離(ワールド座標系) */
  function distanceToPolyline(wx, wz, points) {
    let best = Infinity;
    for (let i = 0; i < points.length - 1; i++) {
      const d = distToSegment(wx, wz, points[i].x, points[i].z, points[i + 1].x, points[i + 1].z);
      if (d < best) best = d;
    }
    return best;
  }

  /**
   * ワールド座標(wx, wz)に最も近い、seg自身のポリライン(samples)上の点を求める。
   * 始点/終点をレール途中に設定する機能で、クリック位置→セグメント内距離(s)への
   * 変換に使う(railGraph.jsのs(セグメント自身の座標系での距離)と対応)。
   *
   * 戻り値: { x, z, s, dist } | null(pointsが2点未満で計算不能な場合)
   *   s: seg開始点(points[0])からの累積距離(ブロック)
   */
  function projectOntoSegment(seg, wx, wz) {
    const points = pointsOf(seg);
    if (points.length < 2) return null;

    let best = null;
    let cumulative = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      const dx = b.x - a.x, dz = b.z - a.z;
      const lenSq = dx * dx + dz * dz;
      const segLen = Math.sqrt(lenSq);

      let t = 0;
      if (lenSq > 0) {
        t = ((wx - a.x) * dx + (wz - a.z) * dz) / lenSq;
        t = Math.max(0, Math.min(1, t));
      }
      const px = a.x + dx * t;
      const pz = a.z + dz * t;
      const dist = Math.hypot(wx - px, wz - pz);
      const s = cumulative + segLen * t;

      if (!best || dist < best.dist) best = { x: px, z: pz, s, dist };
      cumulative += segLen;
    }
    return best;
  }

  /** 画面座標(screenX, screenZ)にもっとも近いセグメントを、当たり判定半径内から探す */
  function pickSegmentAt(screenX, screenZ) {
    const [wx, wz] = toWorld(screenX, screenZ);
    const hitRadiusWorld = HIT_RADIUS_PX / state.scale; // 画面上で一定の太さになるよう補正
    let best = null, bestDist = Infinity;
    for (const seg of state.segments) {
      if (seg.id == null) continue; // IDの無いデータは選択対象外
      const d = distanceToPolyline(wx, wz, pointsOf(seg));
      if (d <= hitRadiusWorld && d < bestDist) {
        best = seg;
        bestDist = d;
      }
    }
    return best;
  }

  /** 画面座標(screenX, screenZ)が始点/終点マーカーの上に乗っているか判定する */
  function pickRoutePointAt(screenX, screenZ) {
    const hitRadius = ROUTE_POINT_RADIUS + 3; // マーカー本体より少し広めに当たり判定を取る
    const candidates = [['start', state.routeStart], ['end', state.routeEnd]];
    for (const [role, point] of candidates) {
      if (!point) continue;
      const [sx, sz] = toScreen(point.x, point.z);
      if (Math.hypot(screenX - sx, screenZ - sz) <= hitRadius) return role;
    }
    return null;
  }

  /** 選択状態を更新し、再描画とonSelectionChangeへの通知を行う */
  function applySelection(nextSet) {
    state.selectedIds = nextSet;
    draw();
    onSelectionChange?.(new Set(nextSet));
  }

  /** クリック位置からセグメントを特定し、単一選択/Ctrl+複数選択トグル/背景クリックで解除、を行う */
  function handleSelectionClick(clientX, clientY, isMultiToggle) {
    const rect = canvas.getBoundingClientRect();
    const hit = pickSegmentAt(clientX - rect.left, clientY - rect.top);

    if (!hit) {
      if (!isMultiToggle) applySelection(new Set());
      return;
    }

    const next = new Set(state.selectedIds);
    if (isMultiToggle) {
      if (next.has(hit.id)) next.delete(hit.id);
      else next.add(hit.id);
    } else {
      next.clear();
      next.add(hit.id);
    }
    applySelection(next);
  }

  /**
   * 右クリックされたセグメントに応じて選択状態を調整し、コンテキストメニューを開く要求を
   * onContextMenu経由でReact側に伝える。メニューの中身・表示自体はReact側の責務。
   *   - 右クリックしたセグメントが既に選択中の場合: 選択状態(複数選択含む)はそのまま維持
   *   - 選択されていないセグメントを右クリックした場合: そのセグメント単体を新規選択
   *   - 何もない場所を右クリックした場合: メニューは開かない(null通知のみ)
   */
  function onContextMenuEvent(e) {
    e.preventDefault(); // ブラウザ標準の右クリックメニューを抑止
    const rect = canvas.getBoundingClientRect();
    const clickScreenX = e.clientX - rect.left;
    const clickScreenY = e.clientY - rect.top;
    const hit = pickSegmentAt(clickScreenX, clickScreenY);

    if (!hit) {
      onContextMenu?.(null);
      return;
    }
    if (!state.selectedIds.has(hit.id)) {
      applySelection(new Set([hit.id]));
    }

    // クリック位置に一番近い、hit上の点(始点/終点をレール途中に設定する機能で使う)
    const [wx, wz] = toWorld(clickScreenX, clickScreenY);
    const proj = projectOntoSegment(hit, wx, wz);
    const railPoint = proj ? { segId: hit.id, s: proj.s, x: proj.x, z: proj.z } : null;

    onContextMenu?.({
      x: e.clientX,
      y: e.clientY,
      targetIds: Array.from(state.selectedIds),
      railPoint,
    });
  }

  function pointInRect(x, z, rx0, rz0, rx1, rz1) {
    return x >= rx0 && x <= rx1 && z >= rz0 && z <= rz1;
  }

  /** 線分(ox,oz)-(ax,az)から見て点(bx,bz)がどちら側にあるかの符号付き面積(外積) */
  function cross(ox, oz, ax, az, bx, bz) {
    return (ax - ox) * (bz - oz) - (az - oz) * (bx - ox);
  }

  /** 線分同士(端点を共有しない前提)が交差するか */
  function segmentsIntersect(ax, az, bx, bz, cx, cz, dx, dz) {
    const d1 = cross(cx, cz, dx, dz, ax, az);
    const d2 = cross(cx, cz, dx, dz, bx, bz);
    const d3 = cross(ax, az, bx, bz, cx, cz);
    const d4 = cross(ax, az, bx, bz, dx, dz);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
           ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  }

  /**
   * 線分(ax,az)-(bx,bz)が矩形[rx0,rz0]-[rx1,rz1]と交差 or 内包されているか。
   * 端点がどちらも矩形の外でも、線分が矩形を貫通していれば選択対象にしたいので
   * 矩形の4辺との交差判定もあわせて行う。
   */
  function segmentIntersectsRect(ax, az, bx, bz, rx0, rz0, rx1, rz1) {
    if (pointInRect(ax, az, rx0, rz0, rx1, rz1) || pointInRect(bx, bz, rx0, rz0, rx1, rz1)) return true;
    return (
      segmentsIntersect(ax, az, bx, bz, rx0, rz0, rx1, rz0) ||
      segmentsIntersect(ax, az, bx, bz, rx1, rz0, rx1, rz1) ||
      segmentsIntersect(ax, az, bx, bz, rx1, rz1, rx0, rz1) ||
      segmentsIntersect(ax, az, bx, bz, rx0, rz1, rx0, rz0)
    );
  }

  /** 画面座標の矩形(x0,y0)-(x1,y1)に掛かっている全セグメントを選択する(Ctrl押下時は既存選択に追加) */
  function handleRectSelection(clientX0, clientY0, clientX1, clientY1, isMultiToggle) {
    const rect = canvas.getBoundingClientRect();
    const [wx0, wz0] = toWorld(clientX0 - rect.left, clientY0 - rect.top);
    const [wx1, wz1] = toWorld(clientX1 - rect.left, clientY1 - rect.top);
    const rx0 = Math.min(wx0, wx1), rx1 = Math.max(wx0, wx1);
    const rz0 = Math.min(wz0, wz1), rz1 = Math.max(wz0, wz1);

    const next = isMultiToggle ? new Set(state.selectedIds) : new Set();
    for (const seg of state.segments) {
      if (seg.id == null) continue;
      const points = pointsOf(seg);
      for (let i = 0; i < points.length - 1; i++) {
        if (segmentIntersectsRect(points[i].x, points[i].z, points[i + 1].x, points[i + 1].z, rx0, rz0, rx1, rz1)) {
          next.add(seg.id);
          break;
        }
      }
    }
    applySelection(next);
  }

  function pickGridStep() {
    for (const step of GRID_STEPS) {
      if (step * state.scale >= TARGET_GRID_PX) return step;
    }
    return GRID_STEPS[GRID_STEPS.length - 1];
  }

  function mod(n, m) {
    return ((n % m) + m) % m;
  }

  function drawGridLines() {
    const w = canvas.width, h = canvas.height;
    const step = pickGridStep();
    const [worldMinX, worldMinZ] = toWorld(0, 0);
    const [worldMaxX, worldMaxZ] = toWorld(w, h);
    const startX = Math.floor(worldMinX / step) * step;
    const startZ = Math.floor(worldMinZ / step) * step;

    ctx.save();
    ctx.lineWidth = 1;
    for (let x = startX; x <= worldMaxX + step; x += step) {
      const [sx] = toScreen(x, 0);
      const isChunkLine = mod(x, 16) === 0;
      ctx.strokeStyle = colors.line;
      ctx.globalAlpha = isChunkLine ? 0.6 : 0.22;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
      ctx.stroke();
    }
    for (let z = startZ; z <= worldMaxZ + step; z += step) {
      const [, sz] = toScreen(0, z);
      const isChunkLine = mod(z, 16) === 0;
      ctx.strokeStyle = colors.line;
      ctx.globalAlpha = isChunkLine ? 0.6 : 0.22;
      ctx.beginPath();
      ctx.moveTo(0, sz);
      ctx.lineTo(w, sz);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRulers() {
    const w = canvas.width, h = canvas.height;
    const R = RULER_SIZE;
    const step = pickGridStep();
    const [worldMinX, worldMinZ] = toWorld(0, 0);
    const [worldMaxX] = toWorld(w, 0);
    const [, worldMaxZ] = toWorld(0, h);
    const startX = Math.floor(worldMinX / step) * step;
    const startZ = Math.floor(worldMinZ / step) * step;

    ctx.save();
    ctx.fillStyle = colors.panel;
    ctx.fillRect(0, 0, w, R);
    ctx.fillRect(0, 0, R, h);
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, R + 0.5); ctx.lineTo(w, R + 0.5);
    ctx.moveTo(R + 0.5, 0); ctx.lineTo(R + 0.5, h);
    ctx.stroke();

    ctx.font = '11px "JetBrains Mono", "SFMono-Regular", Consolas, monospace';
    ctx.fillStyle = colors.text;
    ctx.textBaseline = 'middle';

    for (let x = startX; x <= worldMaxX + step; x += step) {
      const [sx] = toScreen(x, 0);
      if (sx < R) continue;
      ctx.beginPath();
      ctx.moveTo(sx + 0.5, R - 6);
      ctx.lineTo(sx + 0.5, R);
      ctx.strokeStyle = colors.text;
      ctx.stroke();
      ctx.fillText(String(Math.round(x)), sx + 3, R / 2);
    }

    for (let z = startZ; z <= worldMaxZ + step; z += step) {
      const [, sz] = toScreen(0, z);
      if (sz < R) continue;
      ctx.beginPath();
      ctx.moveTo(R - 6, sz + 0.5);
      ctx.lineTo(R, sz + 0.5);
      ctx.strokeStyle = colors.text;
      ctx.stroke();

      ctx.save();
      ctx.translate(R / 2, sz + 3);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'left';
      ctx.fillText(String(Math.round(z)), 0, 0);
      ctx.restore();
    }

    ctx.fillStyle = colors.text;
    ctx.textAlign = 'center';
    ctx.fillText('X/Z', R / 2, R / 2);
    ctx.restore();
  }

  function drawSegment(seg) {
    const points = pointsOf(seg);
    const selected = isSelected(seg);
    const hovered = isHovered(seg);
    const routeEntry = findRouteEntry(seg);
    const isPartialRoute = !!routeEntry && routeEntry.sStart != null && routeEntry.sEnd != null;
    // セグメント全体が経路に含まれる場合のみ全体をハイライト色にする。
    // 始点/終点がレール途中にある場合(isPartialRoute)は、実際に通る区間だけを
    // 後段で上書き描画するので、ベースの見た目は「経路外」のまま扱う。
    const inRoute = !!routeEntry && !isPartialRoute;
    let color = colorFor(seg);
    
    // 経路内のセグメントはハイライト色で表示
    if (inRoute) {
      color = colors.route;
    } else if (selected) {
      color = colors.select;
    }

    ctx.beginPath();
    points.forEach((p, i) => {
      const [x, z] = toScreen(p.x, p.z);
      if (i === 0) ctx.moveTo(x, z);
      else ctx.lineTo(x, z);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = (seg.isPoint ? 3 : 2) + (selected ? 2 : inRoute ? 1.5 : hovered ? 1 : 0);
    ctx.stroke();

    // 選択されていないセグメントのティック表示
    if (!selected) {
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < points.length - 1; i++) {
        const [ax, az] = toScreen(points[i].x, points[i].z);
        const [bx, bz] = toScreen(points[i + 1].x, points[i + 1].z);
        const dx = bx - ax, dz = bz - az;
        const len = Math.hypot(dx, dz) || 1;
        const nx = -dz / len, nz = dx / len;
        const mx = (ax + bx) / 2, mz = (az + bz) / 2;
        const tickLen = 4;
        ctx.beginPath();
        ctx.moveTo(mx - nx * tickLen, mz - nz * tickLen);
        ctx.lineTo(mx + nx * tickLen, mz + nz * tickLen);
        ctx.strokeStyle = color;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // 始点/終点がレール途中にある場合、実際に通る区間だけを経路色で上書きする
    if (isPartialRoute) {
      const rangePoints = pointsInRange(seg, routeEntry.sStart, routeEntry.sEnd);
      if (rangePoints.length >= 2) {
        ctx.beginPath();
        rangePoints.forEach((p, i) => {
          const [x, z] = toScreen(p.x, p.z);
          if (i === 0) ctx.moveTo(x, z);
          else ctx.lineTo(x, z);
        });
        ctx.strokeStyle = colors.route;
        ctx.lineWidth = (seg.isPoint ? 3 : 2) + 1.5;
        ctx.stroke();
      }
    }
  }

  /**
   * 矢印アイコンを描画(外部画像)
   * x, y: 位置、angle: 回転角(ラジアン)、size: サイズ(画像の一辺の長さ)
   * 画像は「右向き(+X方向, angle=0)」を基準に用意すること。
   */
  function drawArrowIcon(x, y, angle, size) {
    if (!arrowImageLoaded) return; // 読み込み完了前は何も描かない

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.drawImage(arrowImage, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  /**
   * 経路全体に沿って矢印テクスチャを描画する
   * reversed フラグに基づいて矢印の向きを調整。
   * 簡易運行(routePath)・路線編集(routeEditPath)の両方を対象にする(同時使用は想定しないが、
   * どちらがセットされていても描画できるようにしておく)。
   */
  function drawDirectionalArrowsAlongPath() {
    const paths = [state.routePath, state.routeEditPath].filter(p => p && p.length > 0);
    if (paths.length === 0) return;

    ctx.save();
    ctx.globalAlpha = 0.85;

    for (const path of paths) {
    for (const routeEntry of path) {
      const seg = state.segments.find(s => s.id === routeEntry.id);
      if (!seg) continue;

      // 始点/終点がレール途中にある場合は、実際に通る区間だけに絞る
      const hasTrim = routeEntry.sStart != null && routeEntry.sEnd != null;
      const points = hasTrim ? pointsInRange(seg, routeEntry.sStart, routeEntry.sEnd) : pointsOf(seg);
      if (points.length < 2) continue;

      // セグメントの方向を判定
      let isReversed = routeEntry.reversed;

      // ポイントの方向を決定
      const orderedPoints = isReversed ? [...points].reverse() : points;

      // セグメント内の各線分に沿って矢印を配置
      for (let i = 0; i < orderedPoints.length - 1; i++) {
        const p1 = orderedPoints[i];
        const p2 = orderedPoints[i + 1];

        const [sx1, sz1] = toScreen(p1.x, p1.z);
        const [sx2, sz2] = toScreen(p2.x, p2.z);

        // 線分の長さと方向
        const dx = sx2 - sx1;
        const dz = sz2 - sz1;
        const lineLen = Math.hypot(dx, dz);
        const angle = Math.atan2(dz, dx);

        // 線分に沿って矢印を配置
        const arrowCount = Math.max(1, Math.floor(lineLen / ARROW_SPACING));
        for (let j = 0; j <= arrowCount; j++) {
          const t = arrowCount > 0 ? j / arrowCount : 0.5;
          const arrowX = sx1 + dx * t;
          const arrowY = sz1 + dz * t;

          drawArrowIcon(arrowX, arrowY, angle, ARROW_SIZE);
        }
      }
    }
    }

    ctx.restore();
  }

  /** プレイヤー名が変わったら、対応する顔アイコン(Mod側が書き出すPNG)を読み込む */
  function ensurePlayerImageLoaded() {
    const key = state.player && state.player.PlayerName;
    if (!key || key === playerImageKey) return;

    const img = new Image();
    img.onload = () => {
      playerImage = img;
      draw();
    };
    img.onerror = () => {
      playerImage = null;
    };
    img.src = `/images/players/${encodeURIComponent(key)}.png`;
    playerImageKey = key;
  }

  /** プレイヤーアイコン(顔)と名前ラベルを、プレイヤーの現在座標に描画する */
  function drawPlayer() {
    const player = state.player;
    if (!player) return;

    const [sx, sz] = toScreen(player.x, player.z);
    const size = PLAYER_ICON_SIZE;

    if (playerImage && playerImageKey === player.PlayerName) {
      ctx.save();
      ctx.imageSmoothingEnabled = false; // ドット絵がぼやけないように
      ctx.drawImage(playerImage, sx - size / 2, sz - size / 2, size, size);
      ctx.restore();

      ctx.strokeStyle = colors.text;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sx - size / 2, sz - size / 2, size, size);
    } else {
      // 画像がまだ読み込めていない/見つからない間の仮表示
      ctx.beginPath();
      ctx.arc(sx, sz, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = colors.branch;
      ctx.fill();
    }

    const label = player.PlayerName;
    if (label) {
      ctx.font = 'bold 12px "JetBrains Mono", "SFMono-Regular", Consolas, monospace';
      const textWidth = ctx.measureText(label).width;
      const paddingX = 6;
      const labelBottom = sz - size / 2 - 6;

      ctx.fillStyle = colors.panel;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(sx - textWidth / 2 - paddingX, labelBottom - 16, textWidth + paddingX * 2, 16);
      ctx.globalAlpha = 1;

      ctx.fillStyle = colors.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, sx, labelBottom - 8);
    }
  }

  /** 始点/終点マーカーを1つ描画する(円+ラベル) */
  function drawRoutePointMarker(point, label, fillColor) {
    if (!point) return;
    const [sx, sz] = toScreen(point.x, point.z);
    const r = ROUTE_POINT_RADIUS;

    ctx.save();
    ctx.beginPath();
    ctx.arc(sx, sz, r, 0, Math.PI * 2);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = colors.panel;
    ctx.stroke();
    ctx.restore();

    ctx.font = 'bold 11px "JetBrains Mono", "SFMono-Regular", Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = colors.text;
    ctx.fillText(label, sx, sz - r - 4);
  }

  /** 簡易運行の始点/終点マーカーをまとめて描画する */
  function drawRoutePointMarkers() {
    drawRoutePointMarker(state.routeStart, '始点', colors.main);
    drawRoutePointMarker(state.routeEnd, '終点', colors.idle);
  }

  /** 路線編集モードの経由点を、順序が分かる番号付きマーカーとして描画する */
  function drawRouteWaypointMarkers() {
    state.routeWaypoints.forEach((point, index) => {
      drawRoutePointMarker(point, String(index + 1), colors.waypoint);
    });
  }

  /**
   * 駅の範囲を示す半透明の長方形を描画する。
   * バウンディングボックスは「その駅の全番線にある停車位置(StopVariant)の
   * ワールド座標」の集合から算出する(番線自体は物理的にセグメント全体に
   * 紐づく実体で、駅としての"範囲"を表す固有の点を持たないため)。
   * 【既知の制約】まだ停車位置が1つも設定されていない番線は、この矩形が
   * 必ずしもその番線の位置を横切ることを保証しない(停車位置が無いと
   * バウンディングボックスの計算材料が無いため)。停車位置を追加すれば
   * 矩形はそれに合わせて広がる。
   */
  function drawStationRectangles() {
    const padding = 3; // ワールド座標(ブロック)単位の余白

    for (const station of state.stations) {
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;

      for (const track of station.tracks ?? []) {
        const seg = state.segments.find((s) => s.id === track.segmentId);
        if (!seg) continue;
        for (const stop of track.stops ?? []) {
          const point = pointAtDistance(seg, stop.s);
          if (!point) continue;
          minX = Math.min(minX, point.x);
          maxX = Math.max(maxX, point.x);
          minZ = Math.min(minZ, point.z);
          maxZ = Math.max(maxZ, point.z);
        }
      }

      if (!isFinite(minX)) continue; // 停車位置が1つも無ければ矩形は描かない

      const [sx0, sy0] = toScreen(minX - padding, minZ - padding);
      const [sx1, sy1] = toScreen(maxX + padding, maxZ + padding);
      const x = Math.min(sx0, sx1), y = Math.min(sy0, sy1);
      const w = Math.abs(sx1 - sx0), h = Math.abs(sy1 - sy0);
      const color = station.color || colors.waypoint;

      ctx.save();
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.15;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.5, y + 0.5, w, h);

      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(station.name, x + w / 2, y - 4);
      ctx.restore();
    }
  }

  /**
   * 各番線に、レールに沿って上下2本の枠線(境界線)を描き、番線名を近くに表示する。
   * オフセットは画面ピクセル単位で固定し(ワールド座標単位だとズーム倍率によって
   * 見た目の太さが変わってしまうため)、隣接点との方向から法線ベクトルを計算する。
   */
  function drawTrackOverlays() {
    const offsetPx = 3;

    for (const station of state.stations) {
      for (const track of station.tracks ?? []) {
        const seg = state.segments.find((s) => s.id === track.segmentId);
        if (!seg) continue;
        const points = pointsOf(seg);
        if (points.length < 2) continue;
        const color = track.color || colors.route;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.85;

        for (const sign of [1, -1]) {
          ctx.beginPath();
          for (let i = 0; i < points.length; i++) {
            const [sx, sy] = toScreen(points[i].x, points[i].z);
            // 隣接点(無ければ反対側の隣接点を使い、方向を反転する)から法線方向を求める
            const hasNext = points[i + 1] != null;
            const neighbor = hasNext ? points[i + 1] : points[i - 1];
            const [nsx, nsy] = toScreen(neighbor.x, neighbor.z);
            let dx = nsx - sx, dy = nsy - sy;
            if (!hasNext) { dx = -dx; dy = -dy; }
            const len = Math.hypot(dx, dy) || 1;
            const nx = (-dy / len) * offsetPx * sign;
            const ny = (dx / len) * offsetPx * sign;
            const px = sx + nx, py = sy + ny;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        ctx.restore();

        // 番線名のラベルは、線の中間点付近に表示する
        const mid = points[Math.floor(points.length / 2)];
        const [msx, msy] = toScreen(mid.x, mid.z);
        ctx.save();
        ctx.fillStyle = color;
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(track.name, msx + offsetPx + 4, msy);
        ctx.restore();
      }
    }
  }

  /** 各停車位置に、選択されたアイコン(Unicode文字。色分け可能)を描画する */
  function drawStopIcons() {
    for (const station of state.stations) {
      for (const track of station.tracks ?? []) {
        const seg = state.segments.find((s) => s.id === track.segmentId);
        if (!seg) continue;
        for (const stop of track.stops ?? []) {
          const point = pointAtDistance(seg, stop.s);
          if (!point) continue;
          const [sx, sy] = toScreen(point.x, point.z);
          const symbol = STOP_ICON_SYMBOL_BY_ID[stop.icon] || STOP_ICON_SYMBOL_BY_ID['circle-filled'];

          ctx.save();
          ctx.fillStyle = stop.color || colors.waypoint;
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(symbol, sx, sy);
          ctx.restore();
        }
      }
    }
  }

  /** 矩形選択中、ドラッグ範囲を半透明の矩形として表示する */
  function drawSelectionRect() {
    if (!state.rectSelecting) return;
    const rect = canvas.getBoundingClientRect();
    const x0 = state.leftDownScreenX - rect.left;
    const y0 = state.leftDownScreenY - rect.top;
    const x1 = state.rectCurrentScreenX - rect.left;
    const y1 = state.rectCurrentScreenY - rect.top;
    const x = Math.min(x0, x1), y = Math.min(y0, y1);
    const w = Math.abs(x1 - x0), h = Math.abs(y1 - y0);

    ctx.save();
    ctx.fillStyle = colors.select;
    ctx.globalAlpha = 0.12;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = colors.select;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    ctx.restore();
  }

  function draw() {
    if (!state.hasCamera) return; // まだ視点が決まっていない間は描画しない
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGridLines();

    // 駅の範囲(長方形)は背景として、レール本体より先に描く
    drawStationRectangles();

    // 通常セグメント → 矢印 → 選択セグメント → プレイヤー → 選択矩形 → ルーラー
    const selectedSegs = [];
    for (const seg of state.segments) {
      if (isSelected(seg)) selectedSegs.push(seg);
      else drawSegment(seg);
    }
    
    // 経路の矢印を描画
    drawDirectionalArrowsAlongPath();
    
    for (const seg of selectedSegs) drawSegment(seg);

    // 番線の枠線・停車位置アイコンは、レール本体より前面に描く
    drawTrackOverlays();
    drawStopIcons();

    drawPlayer();
    drawRoutePointMarkers();
    drawRouteWaypointMarkers();
    drawSelectionRect();
    drawRulers();
  }

  function onResize() {
    resize();
    draw();
  }
  function onMouseDown(e) {
    if (e.button === 1) {
      // 中クリック(ホイールボタン)ドラッグ = パン
      e.preventDefault(); // ブラウザの自動スクロールカーソルが出るのを防ぐ
      state.panning = true;
      state.dragStartScreenX = e.clientX;
      state.dragStartScreenY = e.clientY;
      state.dragStartOffsetX = state.offsetX;
      state.dragStartOffsetZ = state.offsetZ;
      canvas.style.cursor = 'grabbing';
      return;
    }
    if (e.button === 0) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const role = pickRoutePointAt(mx, my);
      if (role) {
        // 始点/終点マーカーのドラッグ開始(通常の選択操作は行わない)
        const point = role === 'start' ? state.routeStart : state.routeEnd;
        state.draggingRole = role;
        state.draggingSegId = point.segId;
        canvas.style.cursor = 'grabbing';
        return;
      }
      // 左クリック = 選択操作の開始(実際に選択/矩形選択どちらになるかはmousemoveの移動量で決まる)
      state.leftPressActive = true;
      state.leftDownScreenX = e.clientX;
      state.leftDownScreenY = e.clientY;
      state.leftDownCtrl = e.ctrlKey || e.metaKey;
      state.rectSelecting = false;
    }
  }
  function onMouseMove(e) {
    if (state.panning) {
      state.offsetX = state.dragStartOffsetX + (e.clientX - state.dragStartScreenX);
      state.offsetZ = state.dragStartOffsetZ + (e.clientY - state.dragStartScreenY);
      draw();
      return;
    }
    if (state.draggingRole) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const [wx, wz] = toWorld(mx, my);
      const seg = state.segments.find((s) => s.id === state.draggingSegId);
      const proj = seg ? projectOntoSegment(seg, wx, wz) : null;
      if (proj) {
        const point = { segId: state.draggingSegId, s: proj.s, x: proj.x, z: proj.z };
        if (state.draggingRole === 'start') state.routeStart = point;
        else state.routeEnd = point;
        draw();
      }
      return;
    }
    if (state.leftPressActive) {
      const movedDist = Math.hypot(e.clientX - state.leftDownScreenX, e.clientY - state.leftDownScreenY);
      if (movedDist >= CLICK_MOVE_THRESHOLD_PX) {
        if (!state.rectSelecting) {
          state.rectSelecting = true;
          canvas.style.cursor = 'crosshair';
        }
        state.rectCurrentScreenX = e.clientX;
        state.rectCurrentScreenY = e.clientY;
        draw();
      }
      return;
    }
    updateHover(e.clientX, e.clientY);
  }

  /** 選択操作中でない時、マウス直下のセグメントをホバー状態にしてカーソルを変える */
  function updateHover(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const inBounds = mx >= 0 && my >= 0 && mx <= canvas.width && my <= canvas.height;

    if (inBounds && pickRoutePointAt(mx, my)) {
      canvas.style.cursor = 'grab';
      if (state.hoveredId !== null) {
        state.hoveredId = null;
        draw();
      }
      return;
    }

    const hit = inBounds ? pickSegmentAt(mx, my) : null;
    const newHoverId = hit ? hit.id : null;
    if (newHoverId !== state.hoveredId) {
      state.hoveredId = newHoverId;
      canvas.style.cursor = hit ? 'pointer' : 'default';
      draw();
    }
  }

  function onMouseUp(e) {
    if (state.panning && e.button === 1) {
      state.panning = false;
      canvas.style.cursor = state.hoveredId ? 'pointer' : 'default';
      return;
    }
    if (state.draggingRole) {
      const role = state.draggingRole;
      const point = role === 'start' ? state.routeStart : state.routeEnd;
      state.draggingRole = null;
      state.draggingSegId = null;
      canvas.style.cursor = 'default';
      onRoutePointChange?.(role, point); // ここで初めてReact側のstateへ確定反映する
      return;
    }
    if (!state.leftPressActive) return;
    state.leftPressActive = false;

    const isMulti = state.leftDownCtrl;
    if (state.rectSelecting) {
      state.rectSelecting = false;
      canvas.style.cursor = state.hoveredId ? 'pointer' : 'default';
      handleRectSelection(state.leftDownScreenX, state.leftDownScreenY, e.clientX, e.clientY, isMulti);
    } else {
      handleSelectionClick(e.clientX, e.clientY, isMulti);
    }
  }

  /** マップ上にマウスがある時のCtrl/Cmd+Aで全セグメントを選択する */
  function onKeyDown(e) {
    if (!state.pointerOverMap) return;
    const isSelectAll = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a';
    if (!isSelectAll) return;
    e.preventDefault(); // ページ全体のテキスト選択を防ぐ
    const allIds = new Set();
    for (const seg of state.segments) {
      if (seg.id != null) allIds.add(seg.id);
    }
    applySelection(allIds);
  }

  function onMouseEnterCanvas() {
    state.pointerOverMap = true;
  }
  function onMouseLeaveCanvas() {
    state.pointerOverMap = false;
    // マップ外に出たらホバー表示を消す(矩形選択・パン中はwindow側のmousemoveで継続するので影響しない)
    if (!state.panning && !state.leftPressActive && state.hoveredId !== null) {
      state.hoveredId = null;
      canvas.style.cursor = 'default';
      draw();
    }
  }
  /** 中クリックはブラウザ標準の自動スクロール/リンクを新規タブで開く等の挙動を持つため無効化する */
  function preventAuxClick(e) {
    e.preventDefault();
  }
  function onWheel(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const [worldX, worldZ] = toWorld(mouseX, mouseY);
    const zoomFactor = Math.pow(1.0015, -e.deltaY);
    state.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, state.scale * zoomFactor));
    state.offsetX = mouseX - worldX * state.scale;
    state.offsetZ = mouseY - worldZ * state.scale;
    draw();
  }

  resize();
  window.addEventListener('resize', onResize);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  // Ctrl+A全選択のため、マウスがマップ上にあるかどうかを追跡する
  canvas.addEventListener('mouseenter', onMouseEnterCanvas);
  canvas.addEventListener('mouseleave', onMouseLeaveCanvas);
  window.addEventListener('keydown', onKeyDown);
  // 中クリックによるブラウザ標準の右クリックメニュー等の誤爆を防ぐ
  canvas.addEventListener('auxclick', preventAuxClick);
  canvas.addEventListener('contextmenu', onContextMenuEvent);

  return {
    setSegments(segments) {
      state.segments = segments || [];
      // ここでは視点を変更しない。視点の初期決定は呼び出し側(App.jsx)が
      // centerOn(プレイヤー位置 or 0,0)を呼ぶ責務を持つ。
      draw();
    },
    /** プレイヤーの現在情報({x,y,z,PlayerName,uuid}等)を更新する。nullで非表示にできる */
    setPlayer(player) {
      state.player = player || null;
      ensurePlayerImageLoaded();
      draw();
    },
    /** 経路セグメント列({ id, reversed }[])を更新する。nullで非表示にできる */
    setRoutePath(routePath) {
      state.routePath = routePath || null;
      draw();
    },
    /**
     * 路線編集モードのプレビュー経路({ id, reversed, sStart?, sEnd? }[])を更新する。
     * routePathと見た目のロジック(ハイライト色・矢印)を共有する。nullで非表示にできる。
     */
    setRouteEditPath(routeEditPath) {
      state.routeEditPath = routeEditPath || null;
      draw();
    },
    /** 路線編集モードの経由点({ segId, s, x, z }[])を更新する。番号付きマーカーで表示される */
    setRouteWaypoints(waypoints) {
      state.routeWaypoints = waypoints || [];
      draw();
    },
    /** 駅一覧(/api/stationsそのまま)を更新する。駅の長方形・番線の枠線・停車位置アイコンの描画に使う */
    setStations(stations) {
      state.stations = stations || [];
      draw();
    },
    /** 簡易運行の始点({ segId, s, x, z })を更新する。nullで非表示にできる */
    setRouteStart(point) {
      state.routeStart = point || null;
      draw();
    },
    /** 簡易運行の終点({ segId, s, x, z })を更新する。nullで非表示にできる */
    setRouteEnd(point) {
      state.routeEnd = point || null;
      draw();
    },
    /** ワールド座標(x, z)を画面中心にして表示する。scale省略時はデフォルト倍率を使う */
    centerOn(x, z, scale) {
      state.scale = scale || DEFAULT_INITIAL_SCALE;
      state.offsetX = canvas.width / 2 - x * state.scale;
      state.offsetZ = canvas.height / 2 - z * state.scale;
      state.hasCamera = true;
      draw();
    },
    /** 現在のデータ全体が収まるように視点を合わせる(「全体表示」ボタン用) */
    resetView() {
      fitView();
      state.hasCamera = true;
      draw();
    },
    /**
     * 選択状態を外部(React側)から上書きする。
     * ユーザーのクリック操作による選択変更はonSelectionChange経由でReact側に伝わるので、
     * ここでのループ(React → controller → React)は起きない前提だが、
     * 呼び出し側は同じSet内容を渡すだけならdraw()が無駄に走る程度で実害はない。
     */
    setSelectedIds(ids) {
      state.selectedIds = ids ? new Set(ids) : new Set();
      draw();
    },
    destroy() {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    },
  };
}
