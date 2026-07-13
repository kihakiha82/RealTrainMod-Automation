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
 * 操作: 左クリックドラッグ=パン、マウスホイール=ズーム(カーソル中心)。
 * グリッドは1,2,4,8,16(1チャンク),32...ブロックの中からズームに応じて自動選択する。
 */
export function createMap2DController(container) {
  const canvas = document.createElement('canvas');
  canvas.style.cursor = 'grab';
  canvas.style.display = 'block';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const state = {
    segments: [],
    player: null,
    scale: 1,
    offsetX: 0,
    offsetZ: 0,
    hasCamera: false, // centerOn/resetViewが一度も呼ばれていない間は描画しない(初期位置のずれを防ぐ)
    dragging: false,
    dragStartScreenX: 0,
    dragStartScreenY: 0,
    dragStartOffsetX: 0,
    dragStartOffsetZ: 0,
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
    };
  }
  const colors = readColors();

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
    const color = colorFor(seg);

    ctx.beginPath();
    points.forEach((p, i) => {
      const [x, z] = toScreen(p.x, p.z);
      if (i === 0) ctx.moveTo(x, z);
      else ctx.lineTo(x, z);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = seg.isPoint ? 3 : 2;
    ctx.stroke();

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

  function draw() {
    if (!state.hasCamera) return; // まだ視点が決まっていない間は描画しない
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGridLines();
    for (const seg of state.segments) drawSegment(seg);
    drawPlayer();
    drawRulers();
  }

  function onResize() {
    resize();
    draw();
  }
  function onMouseDown(e) {
    if (e.button !== 0) return;
    state.dragging = true;
    state.dragStartScreenX = e.clientX;
    state.dragStartScreenY = e.clientY;
    state.dragStartOffsetX = state.offsetX;
    state.dragStartOffsetZ = state.offsetZ;
    canvas.style.cursor = 'grabbing';
  }
  function onMouseMove(e) {
    if (!state.dragging) return;
    state.offsetX = state.dragStartOffsetX + (e.clientX - state.dragStartScreenX);
    state.offsetZ = state.dragStartOffsetZ + (e.clientY - state.dragStartScreenY);
    draw();
  }
  function onMouseUp() {
    if (!state.dragging) return;
    state.dragging = false;
    canvas.style.cursor = 'grab';
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
    destroy() {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    },
  };
}