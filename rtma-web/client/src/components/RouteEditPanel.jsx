import { useEffect, useState } from 'react';
import { fetchStations } from '../api';

/**
 * 路線編集パネル。TimeEditorと同じ「フローティングパネル」の見た目・自己完結の
 * パターンを踏襲する。
 *
 * 【4番の再設計に伴う変更】以前はここに「駅・番線を選んで紐付ける」ダイアログが
 * あったが、系統(Route)のwaypointはもはやtrackId(番線)を保持しない
 * (再設計仕様書3節: 系統は駅の境界点までの走行のみを担当し、番線選択は
 * 構内運行システム/ダイヤ側の責務になった)。
 *
 * そのため、waypointの駅への紐付けは「クリック位置が駅の境界点と座標的に一致するか」
 * によって自動的に決まる(App.jsx側でwaypoint追加時に自動判定・付与する)。
 * このパネルは、紐付け結果を表示し、必要なら手動で解除するだけのシンプルな役割になった。
 *
 * props:
 *   waypoints: { segId, s, x, z, stationId }[](親=App.jsxのrouteEditWaypoints)
 *   error: { atIndex } | null(waypoints[atIndex]と[atIndex+1]が繋がっていない場合)
 *   saveStatus: 'saving' | 'saved' | 'error' | null(路線保存自体の状態)
 *   saveError: string | null
 *   onRemoveLast: () => void
 *   onClear: () => void
 *   onSave: (name: string, tags: string[]) => void
 *   onDetach: (index: number) => void(手動でstationIdの紐付けを解除する)
 */
export default function RouteEditPanel({
                                         waypoints, error, saveStatus, saveError,
                                         onRemoveLast, onClear, onSave, onDetach,
                                       }) {
  const [stations, setStations] = useState([]);
  const [stationsError, setStationsError] = useState(null);

  const [name, setName] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // 駅名の表示用に一覧を取得する(境界点タイプの表示にも使う)。
  useEffect(() => {
    let cancelled = false;
    fetchStations()
        .then((list) => { if (!cancelled) setStations(list); })
        .catch((e) => { if (!cancelled) setStationsError(e.message); });
    return () => { cancelled = true; };
  }, []);

  function describeWaypointStation(wp) {
    if (!wp.stationId) return null;
    const station = stations.find((s) => s.id === wp.stationId);
    if (!station) return { name: '(不明な駅)', typeLabel: '' };
    const boundary = (station.boundaryPoints ?? []).find((b) =>
        (b.segmentEnds ?? []).some((se) => se.segmentId === wp.segId)
    );
    const typeLabel = { in: '進入専用', out: '進出専用', both: '出入口' }[boundary?.type ?? 'both'];
    return { name: station.name, typeLabel };
  }

  const canSave = waypoints.length >= 2 && !error && name.trim();

  return (
      <div className="time-editor time-editor--left" style={{ minWidth: 320, maxHeight: '70vh', overflowY: 'auto' }}>
        <div className="time-editor__title">🛤 路線編集(経由点{waypoints.length}点)</div>

        {stationsError && <div className="time-editor__error">駅一覧の取得に失敗しました: {stationsError}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '10px 0' }}>
          {waypoints.map((wp, index) => {
            const stationInfo = describeWaypointStation(wp);
            return (
                <div key={index} style={{
                  display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                  padding: '4px 6px', borderRadius: 4,
                  background: error && (error.atIndex === index || error.atIndex === index - 1) ? 'rgba(232,93,77,0.15)' : 'transparent',
                }}>
                  <span style={{ color: 'var(--amber)', width: 18, flexShrink: 0 }}>{index + 1}</span>
                  <span style={{ flex: 1 }}>
                {stationInfo ? `${stationInfo.name}(境界点・${stationInfo.typeLabel})` : '経由点'}
              </span>
                  {stationInfo && (
                      <button className="mode-btn" onClick={() => onDetach(index)}>解除</button>
                  )}
                  {index < waypoints.length - 1 && error?.atIndex === index && (
                      <span style={{ color: 'var(--red)', fontSize: 11 }}>✗未接続</span>
                  )}
                </div>
            );
          })}
          {waypoints.length === 0 && (
              <div className="time-editor__note">
                レールを右クリック →「路線編集」→「経由点として追加」で経由点を積み上げてください。
                既に組み上がった経路の途中を右クリックすると、その位置に挿入されます。
                駅の境界点マーカーをクリックすると、自動的にその駅への出入りとして認識されます。
              </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <button className="mode-btn" onClick={onRemoveLast} disabled={waypoints.length === 0}>最後を取消</button>
          <button className="mode-btn" onClick={onClear} disabled={waypoints.length === 0}>クリア</button>
        </div>

        {error && (
            <div className="time-editor__error">
              経由点{error.atIndex + 1}と{error.atIndex + 2}が線路で繋がっていません
            </div>
        )}

        <div className="time-editor__fields">
          <label className="time-editor__field">
            <span>路線名</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1 }} />
          </label>
          <label className="time-editor__field">
            <span>タグ</span>
            <input
                type="text"
                placeholder="カンマ区切り"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                style={{ flex: 1 }}
            />
          </label>
        </div>

        {saveStatus === 'error' && <div className="time-editor__error">{saveError}</div>}
        {saveStatus === 'saved' && <div className="time-editor__note" style={{ color: 'var(--green)' }}>✓ 保存しました</div>}

        <button
            className="time-editor__btn"
            disabled={!canSave || saveStatus === 'saving'}
            onClick={() => {
              const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
              onSave(name.trim(), tags);
            }}
        >
          {saveStatus === 'saving' ? '保存中...' : '路線を保存'}
        </button>
      </div>
  );
}