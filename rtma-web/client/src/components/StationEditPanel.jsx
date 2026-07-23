import { useEffect, useState } from 'react';
import { fetchStations, saveStation, deleteStation } from '../api';
import IconPicker from './IconPicker';
import { DEFAULT_STOP_ICON_ID, STOP_ICON_SHAPES } from '../iconShapes';

/**
 * 駅(Station)管理パネル。5章の実装。
 * TimeEditor/RouteEditPanelと同じ「フローティングパネル」パターンで自己完結する。
 *
 * 編集はローカルの「draft」(下書き)に対して行い、「保存」ボタンを押すまでは
 * サーバーに反映しない(仕様書5.1の1〜3が下書き編集、4が保存、という段階構成のため)。
 * 例外は「駅の削除」で、これは即座にサーバーに反映される(取り消せない操作であることが
 * ボタンの文言・確認フローで明確なため)。
 *
 * 番線(Track)・停車位置(StopVariant)の位置指定は、右クリックメニュー
 * (mapEngine/contextMenuSchema.js の「駅編集」カテゴリ)経由で取得したrailPointを、
 * App.jsxがprops(pendingTrackPoint/pendingStopPoint)として渡してくる形で受け取る。
 *
 * props:
 *   trainSpecs: { [resourceName]: spec } | null(停車位置追加時の車種選択肢に使う)
 *   pendingTrackPoint: { segId, s, x, z } | null
 *   onConsumeTrackPoint: () => void(pendingTrackPointを使い終わったらnullに戻すよう親に通知)
 *   pendingStopPoint: { segId, s, x, z } | null
 *   onConsumeStopPoint: () => void
 *   onClose: () => void
 */
// 新規作成時のデフォルト色(見分けやすいよう複数用意して使い回す)
const DEFAULT_COLORS = ['#4da3ff', '#ffb700', '#3ddc84', '#e85d4d', '#a374ff', '#ff7edb'];
function pickDefaultColor(existingCount) {
  return DEFAULT_COLORS[existingCount % DEFAULT_COLORS.length];
}

export default function StationEditPanel({
  trainSpecs, pendingTrackPoint, onConsumeTrackPoint, pendingStopPoint, onConsumeStopPoint, onClose, onStationsChanged,
}) {
  const [stations, setStations] = useState([]);
  const [stationsError, setStationsError] = useState(null);

  // 'NEW' | 既存駅のid | null(未選択)
  const [activeStationId, setActiveStationId] = useState(null);
  // { name, tagsInput, color, tracks: [{ id, serverId?, name, segmentId, reversed, color, stops: [{ id, serverId?, trainResourceName, carCount, s, color, icon }] }] }
  const [draft, setDraft] = useState(null);

  const [saveStatus, setSaveStatus] = useState(null); // 'saving' | 'saved' | 'error' | null
  const [saveError, setSaveError] = useState(null);

  // 番線追加フォーム
  const [addingTrack, setAddingTrack] = useState(false);
  const [newTrackPoint, setNewTrackPoint] = useState(null);
  const [newTrackName, setNewTrackName] = useState('');
  const [newTrackReversed, setNewTrackReversed] = useState(false);
  const [newTrackColor, setNewTrackColor] = useState(DEFAULT_COLORS[0]);

  // 停車位置(StopVariant)追加フォーム。どの番線に追加するかはactiveTrackIndexで管理する
  const [activeTrackIndex, setActiveTrackIndex] = useState(null);
  const [addingStop, setAddingStop] = useState(false);
  const [newStopS, setNewStopS] = useState(null);
  const [newStopError, setNewStopError] = useState(null);
  const [newStopTrainResourceName, setNewStopTrainResourceName] = useState('');
  const [newStopCarCount, setNewStopCarCount] = useState(2);
  const [newStopColor, setNewStopColor] = useState(DEFAULT_COLORS[0]);
  const [newStopIcon, setNewStopIcon] = useState(DEFAULT_STOP_ICON_ID);


  // 削除の409(参照あり)確認状態。{ referencingRoutes } | null
  const [deleteConflict, setDeleteConflict] = useState(null);
  const [deleteStatus, setDeleteStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchStations()
      .then((list) => { if (!cancelled) setStations(list); })
      .catch((e) => { if (!cancelled) setStationsError(e.message); });
    return () => { cancelled = true; };
  }, []);

  // 番線追加のピッキングモード中に、右クリック(station-edit:add-track)由来の点が届いたら取り込む
  useEffect(() => {
    if (addingTrack && pendingTrackPoint) {
      setNewTrackPoint(pendingTrackPoint);
      onConsumeTrackPoint();
    }
  }, [pendingTrackPoint, addingTrack, onConsumeTrackPoint]);

  // 停車位置追加のピッキングモード中に、右クリック(station-edit:set-stop-position)由来の点が届いたら取り込む。
  // 対象番線(draft.tracks[activeTrackIndex])のsegmentIdと一致しない場合はエラー表示する
  // (番線は物理的に1つのセグメントに紐づく実体のため。仕様書2.2章参照)。
  useEffect(() => {
    if (addingStop && activeTrackIndex != null && pendingStopPoint && draft) {
      const track = draft.tracks[activeTrackIndex];
      if (track && pendingStopPoint.segId !== track.segmentId) {
        setNewStopError('この番線のセグメントとは異なる位置です。番線と同じレール上でクリックしてください。');
      } else {
        setNewStopS(pendingStopPoint.s);
        setNewStopError(null);
      }
      onConsumeStopPoint();
    }
  }, [pendingStopPoint, addingStop, activeTrackIndex, draft, onConsumeStopPoint]);

  function selectStation(id) {
    setDeleteConflict(null);
    setDeleteStatus(null);
    setSaveStatus(null);
    setSaveError(null);
    setAddingTrack(false);
    setAddingStop(false);
    setActiveTrackIndex(null);

    if (id === 'NEW') {
      setActiveStationId('NEW');
      setDraft({ name: '', tagsInput: '', color: pickDefaultColor(stations.length), tracks: [] });
      return;
    }
    const station = stations.find((s) => s.id === id);
    if (!station) return;
    setActiveStationId(id);
    setDraft({
      name: station.name,
      tagsInput: (station.tags ?? []).join(','),
      color: station.color ?? pickDefaultColor(stations.length),
      tracks: (station.tracks ?? []).map((t) => ({
        id: t.id,
        serverId: t.id,
        name: t.name,
        segmentId: t.segmentId,
        reversed: t.reversed,
        color: t.color ?? DEFAULT_COLORS[0],
        stops: (t.stops ?? []).map((s) => ({
          id: s.id, serverId: s.id, trainResourceName: s.trainResourceName, carCount: s.carCount, s: s.s,
          color: s.color ?? DEFAULT_COLORS[0], icon: s.icon ?? DEFAULT_STOP_ICON_ID,
        })),
      })),
    });
  }

  function updateDraft(patch) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function handleConfirmAddTrack() {
    if (!newTrackPoint || !newTrackName.trim()) return;
    updateDraft({
      tracks: [...draft.tracks, {
        id: crypto.randomUUID(),
        name: newTrackName.trim(),
        segmentId: newTrackPoint.segId,
        reversed: newTrackReversed,
        color: newTrackColor,
        stops: [],
      }],
    });
    setAddingTrack(false);
    setNewTrackPoint(null);
    setNewTrackName('');
    setNewTrackReversed(false);
    setNewTrackColor(pickDefaultColor(draft.tracks.length + 1));
  }

  function handleRemoveTrack(index) {
    updateDraft({ tracks: draft.tracks.filter((_, i) => i !== index) });
    if (activeTrackIndex === index) setActiveTrackIndex(null);
  }

  function openAddStop(index) {
    setActiveTrackIndex(index);
    setAddingStop(true);
    setNewStopS(null);
    setNewStopError(null);
    setNewStopTrainResourceName('');
    setNewStopCarCount(2);
    setNewStopColor(pickDefaultColor(draft.tracks[index].stops.length));
    setNewStopIcon(DEFAULT_STOP_ICON_ID);
  }

  function handleConfirmAddStop() {
    if (activeTrackIndex == null || newStopS == null || !newStopTrainResourceName) return;
    const tracks = [...draft.tracks];
    const track = { ...tracks[activeTrackIndex] };
    track.stops = [...track.stops, {
      id: crypto.randomUUID(),
      trainResourceName: newStopTrainResourceName,
      carCount: Number(newStopCarCount),
      s: newStopS,
      color: newStopColor,
      icon: newStopIcon,
    }];
    tracks[activeTrackIndex] = track;
    updateDraft({ tracks });
    setAddingStop(false);
    setNewStopS(null);
  }

  function handleRemoveStop(trackIndex, stopIndex) {
    const tracks = [...draft.tracks];
    const track = { ...tracks[trackIndex] };
    track.stops = track.stops.filter((_, i) => i !== stopIndex);
    tracks[trackIndex] = track;
    updateDraft({ tracks });
  }

  async function handleSaveStation() {
    if (!draft?.name.trim()) return;
    setSaveStatus('saving');
    setSaveError(null);
    try {
      const tags = draft.tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
      const body = {
        name: draft.name.trim(),
        tags,
        color: draft.color,
        tracks: draft.tracks.map((t) => ({
          id: t.serverId,
          name: t.name,
          segmentId: t.segmentId,
          reversed: t.reversed,
          color: t.color,
          stops: t.stops.map((s) => ({
            id: s.serverId, trainResourceName: s.trainResourceName, carCount: s.carCount, s: s.s,
            color: s.color, icon: s.icon,
          })),
        })),
      };
      if (activeStationId !== 'NEW') body.id = activeStationId;

      const saved = await saveStation(body);
      setStations((prev) => {
        const idx = prev.findIndex((s) => s.id === saved.id);
        if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
        return [...prev, saved];
      });
      setActiveStationId(saved.id);
      // 保存後、サーバー確定のidを持つ形にdraftを更新しておく
      // (以後の追加操作がserverId経由で正しく既存Track/StopVariantを維持できるように)
      setDraft({
        name: saved.name,
        tagsInput: (saved.tags ?? []).join(','),
        color: saved.color ?? draft.color,
        tracks: (saved.tracks ?? []).map((t) => ({
          id: t.id, serverId: t.id, name: t.name, segmentId: t.segmentId, reversed: t.reversed,
          color: t.color ?? DEFAULT_COLORS[0],
          stops: (t.stops ?? []).map((s) => ({
            id: s.id, serverId: s.id, trainResourceName: s.trainResourceName, carCount: s.carCount, s: s.s,
            color: s.color ?? DEFAULT_COLORS[0], icon: s.icon ?? DEFAULT_STOP_ICON_ID,
          })),
        })),
      });
      setSaveStatus('saved');
      onStationsChanged?.();
    } catch (e) {
      setSaveStatus('error');
      setSaveError(e.message);
    }
  }

  async function handleDeleteStation(force) {
    if (activeStationId === 'NEW' || !activeStationId) return;
    setDeleteStatus('deleting');
    try {
      const result = await deleteStation(activeStationId, { force });
      if (result.conflict) {
        setDeleteConflict({ referencingRoutes: result.referencingRoutes });
        setDeleteStatus(null);
        return;
      }
      setStations((prev) => prev.filter((s) => s.id !== activeStationId));
      setActiveStationId(null);
      setDraft(null);
      setDeleteConflict(null);
      setDeleteStatus(null);
      onStationsChanged?.();
    } catch (e) {
      setDeleteStatus(null);
      setSaveError(e.message);
    }
  }

  return (
    <div className="time-editor time-editor--bottom-left" style={{ minWidth: 340, maxHeight: '75vh', overflowY: 'auto' }}>
      <div className="time-editor__title" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>🚉 駅管理</span>
        <button className="mode-btn" onClick={onClose}>閉じる</button>
      </div>

      {stationsError && <div className="time-editor__error">駅一覧の取得に失敗しました: {stationsError}</div>}

      <label className="time-editor__field">
        <span>駅</span>
        <select value={activeStationId ?? ''} onChange={(e) => selectStation(e.target.value)} style={{ flex: 1 }}>
          <option value="" disabled>選択してください</option>
          {stations.map((s) => (
            <option key={s.id} value={s.id}>{s.name}{s.tags?.length ? ` (${s.tags.join(',')})` : ''}</option>
          ))}
          <option value="NEW">＋ 新規駅を作成</option>
        </select>
      </label>

      {draft && (
        <>
          <div className="time-editor__fields">
            <label className="time-editor__field">
              <span>駅名</span>
              <input type="text" value={draft.name} onChange={(e) => updateDraft({ name: e.target.value })} style={{ flex: 1 }} />
            </label>
            <label className="time-editor__field">
              <span>タグ</span>
              <input
                type="text"
                placeholder="カンマ区切り"
                value={draft.tagsInput}
                onChange={(e) => updateDraft({ tagsInput: e.target.value })}
                style={{ flex: 1 }}
              />
            </label>
            <label className="time-editor__field">
              <span>駅の色</span>
              <input type="color" value={draft.color} onChange={(e) => updateDraft({ color: e.target.value })} />
            </label>
          </div>

          <div style={{ margin: '10px 0' }}>
            <div style={{ color: 'var(--amber)', marginBottom: 4 }}>番線</div>
            {draft.tracks.map((track, ti) => (
              <div key={track.id} style={{ border: '1px solid var(--line)', borderRadius: 6, padding: 8, marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 2, background: track.color, flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{track.name}{track.reversed ? '(逆)' : ''}</span>
                  <button className="mode-btn" onClick={() => handleRemoveTrack(ti)}>削除</button>
                </div>
                <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {track.stops.map((stop, si) => (
                    <div key={stop.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-dim)' }}>
                      <span style={{ color: stop.color }}>{STOP_ICON_SHAPES.find((s) => s.id === stop.icon)?.symbol ?? '●'}</span>
                      <span style={{ flex: 1 }}>{stop.trainResourceName} × {stop.carCount}両 (s={stop.s.toFixed(2)})</span>
                      <button className="mode-btn" onClick={() => handleRemoveStop(ti, si)}>削除</button>
                    </div>
                  ))}
                </div>

                {addingStop && activeTrackIndex === ti ? (
                  <div style={{ marginTop: 6, borderTop: '1px solid var(--line)', paddingTop: 6 }}>
                    <label className="time-editor__field">
                      <span>車種</span>
                      <select
                        value={newStopTrainResourceName}
                        onChange={(e) => setNewStopTrainResourceName(e.target.value)}
                        style={{ flex: 1 }}
                      >
                        <option value="" disabled>選択してください</option>
                        {trainSpecs && Object.keys(trainSpecs).map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="time-editor__field">
                      <span>両数</span>
                      <input
                        type="number"
                        min="1"
                        value={newStopCarCount}
                        onChange={(e) => setNewStopCarCount(e.target.value)}
                        style={{ width: 60 }}
                      />
                    </label>
                    <label className="time-editor__field">
                      <span>色</span>
                      <input type="color" value={newStopColor} onChange={(e) => setNewStopColor(e.target.value)} />
                    </label>
                    <label className="time-editor__field" style={{ alignItems: 'flex-start' }}>
                      <span>アイコン</span>
                      <IconPicker value={newStopIcon} onChange={setNewStopIcon} color={newStopColor} />
                    </label>
                    <div className="time-editor__note">
                      地図を右クリック →「駅編集」→「ここを停車位置に設定」({track.name}と同じレール上をクリック)
                    </div>
                    {newStopS != null && <div className="time-editor__note">位置を指定済み(s={newStopS.toFixed(2)})</div>}
                    {newStopError && <div className="time-editor__error">{newStopError}</div>}
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button
                        className="mode-btn"
                        disabled={newStopS == null || !newStopTrainResourceName}
                        onClick={handleConfirmAddStop}
                      >
                        追加
                      </button>
                      <button className="mode-btn" onClick={() => setAddingStop(false)}>キャンセル</button>
                    </div>
                  </div>
                ) : (
                  <button className="mode-btn" style={{ marginTop: 6 }} onClick={() => openAddStop(ti)}>
                    編成パターンを追加
                  </button>
                )}
              </div>
            ))}

            {addingTrack ? (
              <div style={{ border: '1px solid var(--line)', borderRadius: 6, padding: 8 }}>
                <label className="time-editor__field">
                  <span>番線名</span>
                  <input type="text" placeholder="1番線" value={newTrackName} onChange={(e) => setNewTrackName(e.target.value)} style={{ flex: 1 }} />
                </label>
                <label className="time-editor__field">
                  <span>逆向き</span>
                  <input type="checkbox" checked={newTrackReversed} onChange={(e) => setNewTrackReversed(e.target.checked)} />
                </label>
                <label className="time-editor__field">
                  <span>番線の色</span>
                  <input type="color" value={newTrackColor} onChange={(e) => setNewTrackColor(e.target.value)} />
                </label>
                <div className="time-editor__note">地図を右クリック →「駅編集」→「ここに番線を追加」</div>
                {newTrackPoint && <div className="time-editor__note">位置を指定済み(s={newTrackPoint.s.toFixed(2)})</div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button className="mode-btn" disabled={!newTrackPoint || !newTrackName.trim()} onClick={handleConfirmAddTrack}>追加</button>
                  <button className="mode-btn" onClick={() => { setAddingTrack(false); setNewTrackPoint(null); }}>キャンセル</button>
                </div>
              </div>
            ) : (
              <button className="mode-btn" onClick={() => setAddingTrack(true)}>番線を追加</button>
            )}
          </div>

          {saveStatus === 'error' && <div className="time-editor__error">{saveError}</div>}
          {saveStatus === 'saved' && <div className="time-editor__note" style={{ color: 'var(--green)' }}>✓ 保存しました</div>}

          <button className="time-editor__btn" disabled={!draft.name.trim() || saveStatus === 'saving'} onClick={handleSaveStation}>
            {saveStatus === 'saving' ? '保存中...' : '駅を保存'}
          </button>

          {activeStationId !== 'NEW' && (
            <div style={{ marginTop: 10, borderTop: '1px solid var(--line)', paddingTop: 8 }}>
              {!deleteConflict ? (
                <button className="mode-btn" style={{ color: 'var(--red)' }} disabled={deleteStatus === 'deleting'} onClick={() => handleDeleteStation(false)}>
                  この駅を削除
                </button>
              ) : (
                <div>
                  <div className="time-editor__error">
                    以下の路線から参照されているため削除できません:
                    {deleteConflict.referencingRoutes.map((r) => (
                      <div key={r.routeId}>・{r.routeName}</div>
                    ))}
                  </div>
                  <div className="time-editor__note">
                    強制削除すると、これらの路線の経由点は「駅なし」に格下げされます(経路自体は維持されます)。
                  </div>
                  <button className="mode-btn" style={{ color: 'var(--red)' }} onClick={() => handleDeleteStation(true)}>
                    強制削除する
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
