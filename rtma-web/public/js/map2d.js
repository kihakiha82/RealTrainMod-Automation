/**
 * RailSegmentのリストを2D(上から見た図)で描画するレンダラー。
 *
 * RailSegment.samples (RTMA Modが出力するサンプル点列)を使って
 * 曲線もポリラインとして正確に描く。samplesが無い場合はstart/endの
 * 直線で代用する。
 *
 * 操作:
 *   左クリックドラッグ -> パン(移動)
 *   マウスホイール     -> ズーム(カーソル位置を中心に拡大縮小)
 *
 * グリッド:
 *   ズームレベルに応じて間隔を 1,2,4,8,16(1チャンク)ブロックの中から
 *   自動選択する(GRID_STEPS)。16ブロック区切り(チャンク境界)は
 *   常に少し強調して描画する。上端にX軸、左端にZ軸の座標ルーラーを表示する。
 *
 * 色分け:
 *   通常区間          -> --rail (グレー)
 *   ポイントの開通側    -> --green(定位) / --amber(反位)
 *   ポイントの非開通側   -> --red
 */
const Map2DRenderer = {
  canvas: null,
  ctx: null,
  segments: [],

  // カメラ状態(ワールド座標 -> 画面座標の変換に使う)
  scale: 1,
  offsetX: 0,
  offsetZ: 0,

  colors: {},
  _resizeHandler: null,
  _hasFitOnce: false,

  // ドラッグ状態
  _dragging: false,
  _dragStartScreenX: 0,
  _dragStartScreenY: 0,
  _dragStartOffsetX: 0,
  _dragStartOffsetZ: 0,

  // ズーム・グリッドの設定
  MIN_SCALE: 0.02,
  MAX_SCALE: 300,
  GRID_STEPS: [1, 2, 4, 8, 16], // ブロック数。16 = 1チャンク(最大、ここで打ち止め)
  TARGET_GRID_PX: 70, // グリッド線同士がこのくらいの間隔(px)になるよう自動調整する
  RULER_SIZE: 26, // 上端/左端のルーラーの太さ(px)

  init(container, data) {
    container.innerHTML = '';
    this.canvas = document.createElement('canvas');
    this.canvas.style.cursor = 'grab';
    this.canvas.style.display = 'block';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.colors = this._readColors();
    this._resize(container);

    this._resizeHandler = () => {
      this._resize(container);
      this.draw();
    };
    window.addEventListener('resize', this._resizeHandler);

    this._bindInteractions();

    this.setSegments((data && data.segments) || []);
  },

  setSegments(segments) {
    this.segments = segments || [];
    // データ更新(ポーリング)ごとに視点をリセットすると操作しづらいので、
    // 初回読み込み時だけ自動でフィットさせる。以降はユーザーの操作を保持する。
    if (!this._hasFitOnce) {
      this._fitView();
      this._hasFitOnce = true;
    }
    this.draw();
  },

  /** 表示中のデータ全体に視点を合わせ直す(「全体表示」ボタン等から呼ぶ) */
  resetView() {
    this._fitView();
    this.draw();
  },

  destroy() {
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
    }
    if (this._onMouseMove) {
      window.removeEventListener('mousemove', this._onMouseMove);
    }
    if (this._onMouseUp) {
      window.removeEventListener('mouseup', this._onMouseUp);
    }
    this.canvas = null;
    this.ctx = null;
    this._hasFitOnce = false;
  },

  _resize(container) {
    if (!this.canvas) return;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
  },

  _readColors() {
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
  },

  _pointsOf(seg) {
    if (seg.samples && seg.samples.length >= 2) {
      return seg.samples;
    }
    return [
      { x: seg.startX, z: seg.startZ },
      { x: seg.endX, z: seg.endZ },
    ];
  },

  _fitView() {
    if (!this.canvas || this.segments.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const seg of this.segments) {
      for (const p of this._pointsOf(seg)) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minZ = Math.min(minZ, p.z);
        maxZ = Math.max(maxZ, p.z);
      }
    }
    if (!isFinite(minX)) return;

    const padding = this.RULER_SIZE + 30;
    const w = Math.max(1, this.canvas.width - padding * 2);
    const h = Math.max(1, this.canvas.height - padding * 2);
    const spanX = Math.max(1, maxX - minX);
    const spanZ = Math.max(1, maxZ - minZ);
    this.scale = Math.min(w / spanX, h / spanZ);

    this.offsetX = padding - minX * this.scale;
    this.offsetZ = padding - minZ * this.scale;
  },

  _toScreen(x, z) {
    return [x * this.scale + this.offsetX, z * this.scale + this.offsetZ];
  },

  _toWorld(sx, sz) {
    return [(sx - this.offsetX) / this.scale, (sz - this.offsetZ) / this.scale];
  },

  _bindInteractions() {
    const canvas = this.canvas;

    this._onMouseDown = (e) => {
      if (e.button !== 0) return; // 左クリックのみ
      this._dragging = true;
      this._dragStartScreenX = e.clientX;
      this._dragStartScreenY = e.clientY;
      this._dragStartOffsetX = this.offsetX;
      this._dragStartOffsetZ = this.offsetZ;
      canvas.style.cursor = 'grabbing';
    };

    this._onMouseMove = (e) => {
      if (!this._dragging) return;
      const dx = e.clientX - this._dragStartScreenX;
      const dy = e.clientY - this._dragStartScreenY;
      this.offsetX = this._dragStartOffsetX + dx;
      this.offsetZ = this._dragStartOffsetZ + dy;
      this.draw();
    };

    this._onMouseUp = () => {
      if (!this._dragging) return;
      this._dragging = false;
      if (this.canvas) this.canvas.style.cursor = 'grab';
    };

    this._onWheel = (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // ズーム前に、マウス位置の「ワールド座標」を記録しておく
      const [worldX, worldZ] = this._toWorld(mouseX, mouseY);

      const zoomFactor = Math.pow(1.0015, -e.deltaY);
      this.scale = Math.min(this.MAX_SCALE, Math.max(this.MIN_SCALE, this.scale * zoomFactor));

      // ズーム後も、マウス位置の下が同じワールド座標を指すようoffsetを再計算する
      this.offsetX = mouseX - worldX * this.scale;
      this.offsetZ = mouseY - worldZ * this.scale;

      this.draw();
    };

    canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup', this._onMouseUp);
    canvas.addEventListener('wheel', this._onWheel, { passive: false });
  },

  _colorFor(seg) {
    if (!seg.isPoint) return this.colors.rail;
    if (!seg.isActiveRoute) return this.colors.idle;
    return seg.isMainRoute ? this.colors.main : this.colors.branch;
  },

  /** 現在のscaleに対して、見やすいグリッド間隔(ブロック数)を選ぶ */
  _pickGridStep() {
    for (const step of this.GRID_STEPS) {
      if (step * this.scale >= this.TARGET_GRID_PX) {
        return step;
      }
    }
    return this.GRID_STEPS[this.GRID_STEPS.length - 1]; // 最大(1チャンク=16)で打ち止め
  },

  /** 負の値にも対応した剰余(チャンク境界判定用) */
  _mod(n, m) {
    return ((n % m) + m) % m;
  },

  draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this._drawGridLines();
    for (const seg of this.segments) {
      this._drawSegment(seg);
    }
    this._drawRulers();
  },

  _drawGridLines() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const step = this._pickGridStep();

    const [worldMinX, worldMinZ] = this._toWorld(0, 0);
    const [worldMaxX, worldMaxZ] = this._toWorld(w, h);

    const startX = Math.floor(worldMinX / step) * step;
    const startZ = Math.floor(worldMinZ / step) * step;

    ctx.save();
    ctx.lineWidth = 1;

    for (let x = startX; x <= worldMaxX + step; x += step) {
      const [sx] = this._toScreen(x, 0);
      const isChunkLine = this._mod(x, 16) === 0;
      ctx.strokeStyle = this.colors.line;
      ctx.globalAlpha = isChunkLine ? 0.6 : 0.22;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
      ctx.stroke();
    }

    for (let z = startZ; z <= worldMaxZ + step; z += step) {
      const [, sz] = this._toScreen(0, z);
      const isChunkLine = this._mod(z, 16) === 0;
      ctx.strokeStyle = this.colors.line;
      ctx.globalAlpha = isChunkLine ? 0.6 : 0.22;
      ctx.beginPath();
      ctx.moveTo(0, sz);
      ctx.lineTo(w, sz);
      ctx.stroke();
    }

    ctx.restore();
  },

  _drawRulers() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const R = this.RULER_SIZE;
    const step = this._pickGridStep();

    const [worldMinX, worldMinZ] = this._toWorld(0, 0);
    const [worldMaxX] = this._toWorld(w, 0);
    const [, worldMaxZ] = this._toWorld(0, h);

    const startX = Math.floor(worldMinX / step) * step;
    const startZ = Math.floor(worldMinZ / step) * step;

    ctx.save();

    // ルーラーの背景(左上の余白を覆う)
    ctx.fillStyle = this.colors.panel;
    ctx.fillRect(0, 0, w, R);
    ctx.fillRect(0, 0, R, h);
    ctx.strokeStyle = this.colors.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, R + 0.5); ctx.lineTo(w, R + 0.5);
    ctx.moveTo(R + 0.5, 0); ctx.lineTo(R + 0.5, h);
    ctx.stroke();

    ctx.font = '11px "JetBrains Mono", "SFMono-Regular", Consolas, monospace';
    ctx.fillStyle = this.colors.text;

    // 上端: X軸の目盛り
    ctx.textBaseline = 'middle';
    for (let x = startX; x <= worldMaxX + step; x += step) {
      const [sx] = this._toScreen(x, 0);
      if (sx < R) continue;
      ctx.beginPath();
      ctx.moveTo(sx + 0.5, R - 6);
      ctx.lineTo(sx + 0.5, R);
      ctx.strokeStyle = this.colors.text;
      ctx.stroke();
      ctx.fillText(String(Math.round(x)), sx + 3, R / 2);
    }

    // 左端: Z軸の目盛り(縦書きにせず、回転して表示)
    for (let z = startZ; z <= worldMaxZ + step; z += step) {
      const [, sz] = this._toScreen(0, z);
      if (sz < R) continue;
      ctx.beginPath();
      ctx.moveTo(R - 6, sz + 0.5);
      ctx.lineTo(R, sz + 0.5);
      ctx.strokeStyle = this.colors.text;
      ctx.stroke();

      ctx.save();
      ctx.translate(R / 2, sz + 3);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'left';
      ctx.fillText(String(Math.round(z)), 0, 0);
      ctx.restore();
    }

    // 軸ラベル(左上の角)
    ctx.fillStyle = this.colors.text;
    ctx.textAlign = 'center';
    ctx.fillText('X/Z', R / 2, R / 2);

    ctx.restore();
  },

  _drawSegment(seg) {
    const ctx = this.ctx;
    const points = this._pointsOf(seg);
    const color = this._colorFor(seg);

    // レール本体
    ctx.beginPath();
    points.forEach((p, i) => {
      const [x, z] = this._toScreen(p.x, p.z);
      if (i === 0) ctx.moveTo(x, z);
      else ctx.lineTo(x, z);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = seg.isPoint ? 3 : 2;
    ctx.stroke();

    // 枕木風のティックマーク(線路らしさを出すための装飾)
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < points.length - 1; i++) {
      const [ax, az] = this._toScreen(points[i].x, points[i].z);
      const [bx, bz] = this._toScreen(points[i + 1].x, points[i + 1].z);
      const dx = bx - ax;
      const dz = bz - az;
      const len = Math.hypot(dx, dz) || 1;
      const nx = -dz / len;
      const nz = dx / len;
      const mx = (ax + bx) / 2;
      const mz = (az + bz) / 2;
      const tickLen = 4;

      ctx.beginPath();
      ctx.moveTo(mx - nx * tickLen, mz - nz * tickLen);
      ctx.lineTo(mx + nx * tickLen, mz + nz * tickLen);
      ctx.strokeStyle = color;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
};
