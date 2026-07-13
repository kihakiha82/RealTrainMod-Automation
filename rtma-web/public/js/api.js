const RtmaApi = {
  async fetchRails() {
    const res = await fetch('/api/rails');
    if (!res.ok) {
      throw new Error(`レールデータの取得に失敗しました (HTTP ${res.status})`);
    }
    return res.json();
  },

  /**
   * 一定間隔でレールデータを取得し続ける。
   * callback(rails, error) の形で呼ばれる(成功時errorはnull)。
   */
  startPolling(callback, intervalMs = 3000) {
    const tick = async () => {
      try {
        const rails = await this.fetchRails();
        callback(rails, null);
      } catch (e) {
        callback(null, e);
      } finally {
        setTimeout(tick, intervalMs);
      }
    };
    tick();
  }
};
