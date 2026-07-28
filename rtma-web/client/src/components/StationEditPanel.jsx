import { useEffect, useState } from 'react';
import { fetchStations, saveStation, deleteStation } from '../api';
import IconPicker from './IconPicker';
import { DEFAULT_STOP_ICON_ID, STOP_ICON_SHAPES } from '../iconShapes';
import { orderSegmentChain, deriveBoundaryPoints } from '../mapEngine/railGraph';
import { localPointToTrackDistance } from '../trackGeometry';

/**
 * 駅(Station)管理パネル。5章 + 再設計仕様書1章(番線の複数セグメント対応)の実装。
 * TimeEditor/RouteEditPanelと同じ「フローティングパネル」パターンで自己完結する。
 *
 * 編集はローカルの「draft」(下書き)に対して行い、「保存」ボタンを押すまでは
 * サーバーに反映しない(仕様書5.1の1〜3が下書き編集、4が保存、という段階構成のため)。
 * 例外は「駅の削除」で、これは即座にサーバーに反映される(取り消せない操作であることが
 * ボタンの文言・確認フローで明確なため)。
 *
 * 【番線の位置指定方法(再設計)】番線は現実には複数の物理レールにまたがりうるため、
 * 1回の右クリックで1点を指定する方式ではなく、地図の既存の複数選択機能
 * (Ctrl+クリック/矩形ドラッグ/Ctrl+A)で選択したセグメント集合をそのまま
 * 「選択中のセグメントを番線として登録」ボタンで取り込む方式にした。
 * 選択集合が単純な一本の鎖として繋がっているかはクライアント側でも
 * orderSegmentChain(プレビュー用、保存時はサーバー側が真実源として再計算する)で
 * 検証し、繋がっていなければその場でエラー表示する。
 *
 * 停車位置(StopVariant)は引き続き1点の指定(地図右クリック)だが、
 * 「番線内の累積距離」への変換にlocalPointToTrackDistanceを使う。
 *
 * props:
 *   segments: RailSegment[](rails-geometry.json相当。番線の順序決定・停車位置変換に使う)
 *   selectedIds: Set<string>(地図で現在選択中のセグメントID集合。番線登録に使う)
 *   trainSpecs: { [resourceName]: spec } | null(停車位置追加時の車種選択肢に使う)
 *   pendingStopPoint: { segId, s, x, z } | null(右クリック「駅編集>ここを停車位置に設定」由来)
 *   onConsumeStopPoint: () => void
 *   onClose: () => void
 *   onStationsChanged: () => void(保存/削除成功後、地図表示用の駅一覧を再取得するよう親に通知)
 */
// 新規作成時のデフォルト色(見分けやすいよう複数用意して使い回す)

import { Window } from './Window';

const DEFAULT_COLORS = ['#4da3ff', '#ffb700', '#3ddc84', '#e85d4d', '#a374ff', '#ff7edb'];
function pickDefaultColor(existingCount) {
    return DEFAULT_COLORS[existingCount % DEFAULT_COLORS.length];
}

export default function StationEditPanel({
                                           segments, selectedIds, trainSpecs, pendingStopPoint, onConsumeStopPoint, onClose, onStationsChanged, onFocus, zIndex
                                         }) {
    const [stations, setStations] = useState([]);
    const [stationsError, setStationsError] = useState(null);

    // 'NEW' | 既存駅のid | null(未選択)
    const [activeStationId, setActiveStationId] = useState(null);
    // { name, tagsInput, color, tracks: [{ id, serverId?, name, segmentIds, segments, color, stops: [{ id, serverId?, trainResourceName, carCount, s, color, icon }] }] }
    const [draft, setDraft] = useState(null);

    const [saveStatus, setSaveStatus] = useState(null); // 'saving' | 'saved' | 'error' | null
    const [saveError, setSaveError] = useState(null);

    // 番線追加フォーム(地図での複数選択結果を取り込む方式)
    const [addingTrack, setAddingTrack] = useState(false);
    const [newTrackName, setNewTrackName] = useState('');
    const [newTrackColor, setNewTrackColor] = useState(DEFAULT_COLORS[0]);
    const [newTrackError, setNewTrackError] = useState(null);

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

    // 停車位置追加のピッキングモード中に、右クリック(station-edit:set-stop-position)由来の点が届いたら取り込む。
    // クリック位置が対象番線(draft.tracks[activeTrackIndex])のいずれのセグメントにも
    // 乗っていない場合はエラー表示する(localPointToTrackDistanceがnullを返す)。
    useEffect(() => {
        if (addingStop && activeTrackIndex != null && pendingStopPoint && draft) {
            const track = draft.tracks[activeTrackIndex];
            const cumulativeS = track
                ? localPointToTrackDistance(segments, track.segments, pendingStopPoint.segId, pendingStopPoint.s)
                : null;
            if (cumulativeS == null) {
                setNewStopError('この番線の構成セグメント上ではありません。番線と同じレール上でクリックしてください。');
            } else {
                setNewStopS(cumulativeS);
                setNewStopError(null);
            }
            onConsumeStopPoint();
        }
    }, [pendingStopPoint, addingStop, activeTrackIndex, draft, segments, onConsumeStopPoint]);

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
            setDraft({ name: '', tagsInput: '', color: pickDefaultColor(stations.length), railSegmentIds: [], boundaryOverrides: {}, tracks: [] });
            return;
        }
        const station = stations.find((s) => s.id === id);
        if (!station) return;
        setActiveStationId(id);
        setDraft({
            name: station.name,
            tagsInput: (station.tags ?? []).join(','),
            color: station.color ?? pickDefaultColor(stations.length),
            railSegmentIds: station.railSegmentIds ?? [],
            boundaryOverrides: station.boundaryOverrides ?? {},
            tracks: (station.tracks ?? []).map((t) => ({
                id: t.id,
                serverId: t.id,
                name: t.name,
                segmentIds: t.segmentIds,
                segments: t.segments,
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
        if (!newTrackName.trim()) return;
        const segmentIds = Array.from(selectedIds ?? []);
        if (segmentIds.length === 0) {
            setNewTrackError('地図でレールを選択してください(Ctrl+クリックで複数選択、ドラッグで矩形選択できます)');
            return;
        }
        const result = orderSegmentChain(segments, segmentIds);
        if (result.error) {
            setNewTrackError(result.error);
            return;
        }
        updateDraft({
            tracks: [...draft.tracks, {
                id: crypto.randomUUID(),
                name: newTrackName.trim(),
                segmentIds,
                segments: result.ordered,
                color: newTrackColor,
                stops: [],
            }],
        });
        setAddingTrack(false);
        setNewTrackName('');
        setNewTrackError(null);
        setNewTrackColor(pickDefaultColor(draft.tracks.length + 1));
    }

    function handleRemoveTrack(index) {
        updateDraft({ tracks: draft.tracks.filter((_, i) => i !== index) });
        if (activeTrackIndex === index) setActiveTrackIndex(null);
    }

    /** 選択中の地図セグメントを、この駅の構内範囲(railSegmentIds)として設定する */
    function handleSetRailSegmentIds() {
        updateDraft({ railSegmentIds: Array.from(selectedIds ?? []) });
    }

    const BOUNDARY_TYPE_CYCLE = ['both', 'in', 'out'];
    const BOUNDARY_TYPE_LABEL = { both: '出入口', in: '進入専用', out: '進出専用' };

    /** 境界点のタイプ(in/out/both)を、ボタンクリックのたびに順に切り替える */
    function handleCycleBoundaryType(nodeKey) {
        const key = nodeKey;
        const current = draft.boundaryOverrides[key] ?? 'both';
        const nextIndex = (BOUNDARY_TYPE_CYCLE.indexOf(current) + 1) % BOUNDARY_TYPE_CYCLE.length;
        const next = BOUNDARY_TYPE_CYCLE[nextIndex];
        const nextOverrides = { ...draft.boundaryOverrides };
        if (next === 'both') {
            delete nextOverrides[key]; // デフォルト値と同じなら明示的なoverrideは持たせない
        } else {
            nextOverrides[key] = next;
        }
        updateDraft({ boundaryOverrides: nextOverrides });
    }

    // 構内範囲(draft.railSegmentIds)から境界点をその場で導出する(プレビュー用。
    // 保存時にはサーバー側が真実源として毎回再計算するため、ここでの結果は表示専用)。
    const previewBoundaryPoints = draft ? deriveBoundaryPoints(segments, draft.railSegmentIds ?? []) : [];

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
                railSegmentIds: draft.railSegmentIds,
                boundaryOverrides: draft.boundaryOverrides,
                tracks: draft.tracks.map((t) => ({
                    id: t.serverId,
                    name: t.name,
                    segmentIds: t.segmentIds,
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
                railSegmentIds: saved.railSegmentIds ?? [],
                boundaryOverrides: saved.boundaryOverrides ?? {},
                tracks: (saved.tracks ?? []).map((t) => ({
                    id: t.id, serverId: t.id, name: t.name, segmentIds: t.segmentIds, segments: t.segments,
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
      <Window
          title="🚉 駅管理"
          onClose={onClose}
          zIndex={zIndex}
          onFocus={onFocus}
          defaultPos={{ x: 20, y: 200, width: 360, height: 600 }}
      >
        <div style={{ padding: '14px 16px', height: '100%', overflowY: 'auto' }}>
          {/* 元々の <div className="time-editor__title">...</div> は Window に移譲したため削除 */}

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
                        <div style={{ color: 'var(--amber)', marginBottom: 4 }}>構内範囲</div>
                        <div className="time-editor__note">
                            地図上で駅構内とみなすレールを選択し(Ctrl+クリック/矩形ドラッグ)、下のボタンで登録してください。
                            現在の構内範囲: {(draft.railSegmentIds ?? []).length}区間、選択中: {selectedIds?.size ?? 0}区間。
                        </div>
                        <button className="mode-btn" style={{ marginTop: 4 }} onClick={handleSetRailSegmentIds}>
                            選択中のセグメントを構内範囲に設定
                        </button>

                        {previewBoundaryPoints.length > 0 && (
                            <div style={{ marginTop: 6 }}>
                                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>
                                    境界点({previewBoundaryPoints.length}件。クリックで 出入口→進入専用→進出専用 と切り替え)
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    {previewBoundaryPoints.map((b) => {
                                        const type = draft.boundaryOverrides?.[b.nodeKey] ?? 'both';
                                        const endsLabel = b.segmentEnds
                                            .map((e) => (e.end === 'start' ? '始端' : '終端'))
                                            .join('/');
                                        return (
                                            <button
                                                key={b.nodeKey}
                                                className="mode-btn"
                                                style={{ fontSize: 11, textAlign: 'left' }}
                                                onClick={() => handleCycleBoundaryType(b.nodeKey)}
                                            >
                                                ({b.x.toFixed(1)}, {b.z.toFixed(1)}) {endsLabel} — {BOUNDARY_TYPE_LABEL[type]}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ margin: '10px 0' }}>
                        <div style={{ color: 'var(--amber)', marginBottom: 4 }}>番線</div>
                        {draft.tracks.map((track, ti) => (
                            <div key={track.id} style={{ border: '1px solid var(--line)', borderRadius: 6, padding: 8, marginBottom: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                    <span style={{ width: 12, height: 12, borderRadius: 2, background: track.color, flexShrink: 0 }} />
                                    <span style={{ flex: 1 }}>{track.name}({(track.segmentIds ?? []).length}区間)</span>
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
                                            地図を右クリック →「駅編集」→「ここを停車位置に設定」({track.name}を構成するレール上をクリック)
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
                                    <span>番線の色</span>
                                    <input type="color" value={newTrackColor} onChange={(e) => setNewTrackColor(e.target.value)} />
                                </label>
                                <div className="time-editor__note">
                                    地図上でこの番線を構成するレールを選択してください(Ctrl+クリックで複数選択、
                                    ドラッグで矩形選択)。現在{selectedIds?.size ?? 0}件選択中。
                                </div>
                                {newTrackError && <div className="time-editor__error">{newTrackError}</div>}
                                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                    <button className="mode-btn" disabled={!newTrackName.trim()} onClick={handleConfirmAddTrack}>
                                        選択中のセグメントを番線として登録
                                    </button>
                                    <button className="mode-btn" onClick={() => { setAddingTrack(false); setNewTrackError(null); }}>キャンセル</button>
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
      </Window>
  );
}