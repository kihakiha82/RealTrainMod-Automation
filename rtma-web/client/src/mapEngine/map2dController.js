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
 *     調整のみ行う)
 * グリッドは1,2,4,8,16(1チャンク),32...ブロックの中からズームに応じて自動選択する。
 *
 * options.onSelectionChange: (Set<string>) => void
 *   ユーザー操作で選択セグメント集合(seg.idのSet)が変わった時に呼ばれる。
 *   React側(App.jsx)のstateへ橋渡しする想定。
 */
export function createMap2DController(container, options = {}) {
  const { onSelectionChange, onContextMenu } = options;
  const canvas = document.createElement('canvas');
  canvas.style.cursor = 'default';
  canvas.style.display = 'block';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const state = {
    segments: [],
    player: null,
    routePath: null, // { id, reversed }[]
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
  };

  // プレイヤー顔アイコンの読み込み状態(プレイヤー名が変わった時だけ再読み込みする)
  let playerImage = null;
  let playerImageKey = null;

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
    };
  }
  const colors = readColors();

  const HIT_RADIUS_PX = 6; // クリック/ホバー判定の画面上の許容半径(px)
  const CLICK_MOVE_THRESHOLD_PX = 5; // これ未満の移動ならドラッグではなくクリックとみなす

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
    const hit = pickSegmentAt(e.clientX - rect.left, e.clientY - rect.top);

    if (!hit) {
      onContextMenu?.(null);
      return;
    }
    if (!state.selectedIds.has(hit.id)) {
      applySelection(new Set([hit.id]));
    }
    onContextMenu?.({
      x: e.clientX,
      y: e.clientY,
      targetIds: Array.from(state.selectedIds),
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
    const inRoute = isInRoute(seg);
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
  }

  /**
   * 経路内のセグメントに対して、向き判定(reversed フラグ)に基づいた矢印を描画する。
   * reversed:false の場合は start→end の向きに矢印を表示
   * reversed:true の場合は end→start の向きに矢印を表示
   */
  function drawRouteArrows() {
    if (!state.routePath || state.routePath.length === 0) return;

    ctx.save();
    ctx.strokeStyle = colors.route;
    ctx.fillStyle = colors.route;
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 2;

    for (const routeEntry of state.routePath) {
      const seg = state.segments.find(s => s.id === routeEntry.id);
      if (!seg) continue;

      const points = pointsOf(seg);
      if (points.length < 2) continue;

      // セグメントの方向を判定
      let startPoint, endPoint;
      if (routeEntry.reversed) {
        // 逆向き: end→start
        startPoint = points[points.length - 1];
        endPoint = points[0];
      } else {
        // 順向き: start→end
        startPoint = points[0];
        endPoint = points[points.length - 1];
      }

      // セグメントの中点に矢印を描画
      const [sx, sz] = toScreen(startPoint.x, startPoint.z);
      const [ex, ez] = toScreen(endPoint.x, endPoint.z);

      // 矢印の中点
      const mx = (sx + ex) / 2;
      const mz = (sz + ez) / 2;

      // 矢印の方向ベクトル
      const dx = ex - sx;
      const dz = ez - sz;
      const len = Math.hypot(dx, dz) || 1;
      const dirX = dx / len;
      const dirZ = dz / len;

      // 矢印の大きさ
      const arrowLen = 12;
      const arrowWidth = 6;

      // 矢印の先端
      const tipX = mx + dirX * arrowLen;
      const tipZ = mz + dirZ * arrowLen;

      // 矢印の根元(左右)
      const baseLeftX = mx - dirZ * arrowWidth;
      const baseLeftZ = mz + dirX * arrowWidth;
      const baseRightX = mx + dirZ * arrowWidth;
      const baseRightZ = mz - dirX * arrowWidth;

      // 矢印を三角形で描画
      ctx.beginPath();
      ctx.moveTo(tipX, tipZ);
      ctx.lineTo(baseLeftX, baseLeftZ);
      ctx.lineTo(baseRightX, baseRightZ);
      ctx.closePath();
      ctx.fill();

      // 矢印の輪郭を描画
      ctx.beginPath();
      ctx.moveTo(tipX, tipZ);
      ctx.lineTo(baseLeftX, baseLeftZ);
      ctx.lineTo(baseRightX, baseRightZ);
      ctx.closePath();
      ctx.stroke();
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
    
    // 経路セグメントを先に描画（選択中のセグメントの下に隠れる）
    const routeSegIds = new Set(state.routePath?.map(r => r.id) ?? []);
    const routeSegs = [];
    
    // 選択中のセグメントは分岐の合流点などで他線と重なっても見えるよう、最後に上書き描画する
    const selectedSegs = [];
    for (const seg of state.segments) {
      if (isSelected(seg)) selectedSegs.push(seg);
      else drawSegment(seg);
    }
    for (const seg of selectedSegs) drawSegment(seg);
    
    // 経路の矢印を描画
    drawRouteArrows();
    
    drawPlayer();
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
