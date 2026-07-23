import { useEffect, useState } from 'react';
import { fetchStations, saveStation } from '../api';

const NEW_STATION = '__NEW_STATION__';
const NEW_TRACK = '__NEW_TRACK__';

/**
 * 路線編集(4b)パネル。TimeEditorと同じ「フローティングパネル」の見た目・自己完結の
 * パターンを踏襲する: 駅一覧の取得(fetchStations)・駅/番線の新規作成(saveStation)は
 * このコンポーネント内で完結させ、App.jsx側は「駅アタッチが確定した」という結果
 * ({ stationId, trackId })だけを受け取る。
 *
 * props:
 *   waypoints: { segId, s, x, z, stationId, trackId }[](親=App.jsxのroutEditWaypoints)
 *   error: { atIndex } | null(waypoints[atIndex]と[atIndex+1]が繋がっていない場合)
 *   saveStatus: 'saving' | 'saved' | 'error' | null(路線保存自体の状態)
 *   saveError: string | null
 *   onRemoveLast: () => void
 *   onClear: () => void
 *   onSave: (name: string, tags: string[]) => void
 *   onAttach: (index: number, { stationId, trackId }) => void
 *   onDetach: (index: number) => void
 */
export default function RouteEditPanel({
  waypoints, error, saveStatus, saveError,
  onRemoveLast, onClear, onSave, onAttach, onDetach, onStationsChanged,
}) {
  const [stations, setStations] = useState([]);
  const [stationsError, setStationsError] = useState(null);

  const [name, setName] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // 駅アタッチダイアログの状態。開いているwaypointのindex、またはnull
  const [attachingIndex, setAttachingIndex] = useState(null);
  const [selectedStationId, setSelectedStationId] = useState('');
  const [selectedTrackId, setSelectedTrackId] = useState('');
  const [newStationName, setNewStationName] = useState('');
  const [newTrackName, setNewTrackName] = useState('');
  const [newTrackReversed, setNewTrackReversed] = useState(false);
  const [attachStatus, setAttachStatus] = useState(null); // 'saving' | 'error' | null
  const [attachError, setAttachError] = useState(null);

  // マウント時に一度だけ駅一覧を取得する。新規作成/番線追加時はローカルの
  // stations stateを直接更新して使い回す(毎回re-fetchしない)。
  useEffect(() => {
    let cancelled = false;
    fetchStations()
      .then((list) => { if (!cancelled) setStations(list); })
      .catch((e) => { if (!cancelled) setStationsError(e.message); });
    return () => { cancelled = true; };
  }, []);

  function stationName(stationId) {
    return stations.find((s) => s.id === stationId)?.name ?? '(不明な駅)';
  }
  function trackName(stationId, trackId) {
    const station = stations.find((s) => s.id === stationId);
    return station?.tracks?.find((t) => t.id === trackId)?.name ?? '(不明な番線)';
  }

  function openAttachDialog(index) {
    setAttachingIndex(index);
    setSelectedStationId('');
    setSelectedTrackId('');
    setNewStationName('');
    setNewTrackName('');
    setNewTrackReversed(false);
    setAttachStatus(null);
    setAttachError(null);
  }

  function closeAttachDialog() {
    setAttachingIndex(null);
  }

  const selectedStation = stations.find((s) => s.id === selectedStationId);
  // このwaypointが乗っているセグメント上に既にある番線だけを候補にする
  // (番線は物理的に特定のセグメントに紐づく実体のため。仕様書2.2章参照)
  const waypoint = attachingIndex != null ? waypoints[attachingIndex] : null;
  const tracksOnThisSegment = selectedStation && waypoint
    ? selectedStation.tracks.filter((t) => t.segmentId === waypoint.segId)
    : [];

  async function handleConfirmAttach() {
    if (attachingIndex == null || !waypoint) return;
    setAttachStatus('saving');
    setAttachError(null);
    try {
      let stationId = selectedStationId;
      let trackId = selectedTrackId;

      if (selectedStationId === NEW_STATION) {
        // 新規駅+新規番線を同時作成する
        if (!newStationName.trim()) throw new Error('駅名を入力してください');
        const created = await saveStation({
          name: newStationName.trim(),
          tags: [],
          tracks: [{
            name: newTrackName.trim() || '1番線',
            segmentId: waypoint.segId,
            reversed: newTrackReversed,
            stops: [],
          }],
        });
        stationId = created.id;
        trackId = created.tracks[0].id;
        setStations((prev) => [...prev, created]);
      } else if (selectedTrackId === NEW_TRACK) {
        // 既存駅に新規番線を追加する(このwaypointのsegId上の番線として)
        const station = stations.find((s) => s.id === selectedStationId);
        if (!station) throw new Error('駅が選択されていません');
        const updated = await saveStation({
          id: station.id,
          name: station.name,
          tags: station.tags,
          tracks: [...station.tracks, {
            name: newTrackName.trim() || '新番線',
            segmentId: waypoint.segId,
            reversed: newTrackReversed,
            stops: [],
          }],
        });
        stationId = updated.id;
        trackId = updated.tracks[updated.tracks.length - 1].id;
        setStations((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      }
      // それ以外(既存駅+既存番線)はサーバー側の変更不要、waypointの参照を書き換えるだけ

      onAttach(attachingIndex, { stationId, trackId });
      setAttachingIndex(null);
      onStationsChanged?.();
    } catch (e) {
      setAttachStatus('error');
      setAttachError(e.message);
    }
  }

  const canSave = waypoints.length >= 2 && !error && name.trim();

  return (
    <div className="time-editor time-editor--left" style={{ minWidth: 320, maxHeight: '70vh', overflowY: 'auto' }}>
      <div className="time-editor__title">🛤 路線編集(経由点{waypoints.length}点)</div>

      {stationsError && <div className="time-editor__error">駅一覧の取得に失敗しました: {stationsError}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '10px 0' }}>
        {waypoints.map((wp, index) => (
          <div key={index} style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
            padding: '4px 6px', borderRadius: 4,
            background: error && (error.atIndex === index || error.atIndex === index - 1) ? 'rgba(232,93,77,0.15)' : 'transparent',
          }}>
            <span style={{ color: 'var(--amber)', width: 18, flexShrink: 0 }}>{index + 1}</span>
            <span style={{ flex: 1 }}>
              {wp.stationId ? `${stationName(wp.stationId)} - ${trackName(wp.stationId, wp.trackId)}` : '経由点(駅なし)'}
            </span>
            {wp.stationId ? (
              <button className="mode-btn" onClick={() => onDetach(index)}>解除</button>
            ) : (
              <button className="mode-btn" onClick={() => openAttachDialog(index)}>駅を紐付け</button>
            )}
            {index < waypoints.length - 1 && error?.atIndex === index && (
              <span style={{ color: 'var(--red)', fontSize: 11 }}>✗未接続</span>
            )}
          </div>
        ))}
        {waypoints.length === 0 && (
          <div className="time-editor__note">
            レールを右クリック →「路線編集」→「経由点として追加」で経由点を積み上げてください。
            既に組み上がった経路の途中を右クリックすると、その位置に挿入されます。
          </div>
        )}
      </div>

      {/* 駅アタッチダイアログ(1行分だけインライン展開) */}
      {attachingIndex != null && waypoint && (
        <div style={{ border: '1px solid var(--line)', borderRadius: 6, padding: 10, marginBottom: 10 }}>
          <div style={{ color: 'var(--amber)', marginBottom: 6 }}>
            経由点{attachingIndex + 1}に駅を紐付け
          </div>

          <label className="time-editor__field">
            <span>駅</span>
            <select
              value={selectedStationId}
              onChange={(e) => { setSelectedStationId(e.target.value); setSelectedTrackId(''); }}
              style={{ flex: 1 }}
            >
              <option value="" disabled>選択してください</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>{s.name}{s.tags?.length ? ` (${s.tags.join(',')})` : ''}</option>
              ))}
              <option value={NEW_STATION}>＋ 新規駅を作成</option>
            </select>
          </label>

          {selectedStationId === NEW_STATION && (
            <label className="time-editor__field">
              <span>駅名</span>
              <input type="text" value={newStationName} onChange={(e) => setNewStationName(e.target.value)} style={{ flex: 1 }} />
            </label>
          )}

          {selectedStationId && selectedStationId !== NEW_STATION && (
            <label className="time-editor__field">
              <span>番線</span>
              <select
                value={selectedTrackId}
                onChange={(e) => setSelectedTrackId(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="" disabled>選択してください</option>
                {tracksOnThisSegment.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
                <option value={NEW_TRACK}>＋ 新規番線を作成</option>
              </select>
            </label>
          )}
          {selectedStationId && selectedStationId !== NEW_STATION && tracksOnThisSegment.length === 0 && (
            <div className="time-editor__note">このセグメント上にはまだ番線がありません。新規作成してください。</div>
          )}

          {(selectedStationId === NEW_STATION || selectedTrackId === NEW_TRACK) && (
            <>
              <label className="time-editor__field">
                <span>番線名</span>
                <input type="text" placeholder="1番線" value={newTrackName} onChange={(e) => setNewTrackName(e.target.value)} style={{ flex: 1 }} />
              </label>
              <label className="time-editor__field">
                <span>逆向き</span>
                <input type="checkbox" checked={newTrackReversed} onChange={(e) => setNewTrackReversed(e.target.checked)} />
              </label>
            </>
          )}

          {attachError && <div className="time-editor__error">{attachError}</div>}

          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button
              className="time-editor__btn"
              disabled={
                attachStatus === 'saving' ||
                !selectedStationId ||
                (selectedStationId !== NEW_STATION && !selectedTrackId)
              }
              onClick={handleConfirmAttach}
            >
              {attachStatus === 'saving' ? '保存中...' : '紐付ける'}
            </button>
            <button className="mode-btn" onClick={closeAttachDialog}>キャンセル</button>
          </div>
        </div>
      )}

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
