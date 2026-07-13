/**
 * 描画方式(2D/3D)を切り替えるための抽象レイヤ。
 * 今は2Dのみ登録しているが、3Dレンダラーが出来たら
 * registerRenderer('3d', Map3DRenderer) を追加するだけで対応できる。
 */
const RTMA = {
  renderers: {},
  current: null,
  currentSegments: [],

  registerRenderer(name, impl) {
    this.renderers[name] = impl;
  },

  use(name, container, data) {
    if (!this.renderers[name]) {
      console.warn(`未登録のレンダラー: ${name}`);
      return;
    }
    if (this.current && this.current.destroy) {
      this.current.destroy();
    }
    this.current = this.renderers[name];
    this.current.init(container, data);
  },

  setSegments(segments) {
    this.currentSegments = segments;
    if (this.current && this.current.setSegments) {
      this.current.setSegments(segments);
    }
  },
};

document.addEventListener('DOMContentLoaded', () => {
  RTMA.registerRenderer('2d', Map2DRenderer);

  const container = document.getElementById('map-root');
  const statusEl = document.getElementById('status');

  RTMA.use('2d', container, { segments: [] });

  RtmaApi.startPolling((rails, err) => {
    if (err) {
      statusEl.textContent = `取得失敗: ${err.message}`;
      return;
    }
    const pointCount = rails.filter((r) => r.isPoint).length;
    statusEl.textContent = `更新: ${new Date().toLocaleTimeString()} (区間${rails.length} / ポイント${pointCount})`;
    RTMA.setSegments(rails);
  }, 3000);

  document.querySelectorAll('.mode-btn[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      document.querySelectorAll('.mode-btn[data-mode]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      // 3Dレンダラーが実装されたら、ここで RTMA.use('3d', container, {...}) に切り替える
    });
  });

  const resetBtn = document.getElementById('reset-view-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (RTMA.current && RTMA.current.resetView) {
        RTMA.current.resetView();
      }
    });
  }
});
