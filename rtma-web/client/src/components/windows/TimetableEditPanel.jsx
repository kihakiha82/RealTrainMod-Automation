import { Fragment, useEffect, useMemo, useState } from 'react';
import { fetchRoutes, calculateRouteTimetable, saveTimetable, fetchTimetableList, fetchTimetable, deleteTimetable } from '../../api.js';
import { Window } from '../Window.jsx';

/**
 * 時刻表(Timetable)編集パネル。表形式(着発時刻テーブル)までを扱う土台。
 *
 * 流れ: 系統を選ぶ → 系統上の各駅ごとに [停車/通過] [番線] [停車位置] [停車秒数] を入力
 *       → 計算(/api/calc/route-timetable)→ 結果テーブル表示 → 名前を付けて保存
 *
 * 「📂 保存済み一覧」から既存ダイヤを選んで読み込み、再編集・再保存(同名なら上書き)・
 * 削除ができる(RouteManagerPanelと同じ「警告付き強制削除」パターンをここでも使う)。
 * 一覧にはSimpleStaffPanel由来の旧形式(2駅間の使い捨てスタフ、Route/Stationと紐付かない)
 * も表示されるが、この画面での再編集はschemaVersion===2の新形式のみ対応する。
 *
 * 未対応(今回のスコープ外、今後の拡張ポイント):
 *   - オウディア風ダイヤグラム(線区図)表示
 *   - 1つのダイヤ内で複数列車を並べて編集する機能(今は1系統1列車のみ)
 *
 * props:
 *   stations: Station[](App.jsx側のmapStationsをそのまま渡す想定。tracks[].stops[]を含む)
 *   trainSpecs: { [resourceName]: spec } | null
 *   onClose, zIndex, onFocus: Windowコンポーネント用
 */

const TICKS_PER_SECOND = 20; // client/calc/timetableGenerator.jsと同じ値(Minecraftの1秒=20tick)

/**
 * 系統(Route)のwaypointsから「経路上に現れる駅の並び(origin→intermediate...→terminal)」を
 * 導出する。
 *
 * 【重要】このロジックはserver側 client/calc/timetableAssembler.js の buildSlotsAndLegs()
 * の駅スロット抽出部分と完全に一致させる必要がある(サーバーはstationPlansの各要素が
 * この並びと同じstationId・同じ件数であることを検証するため、ズレると保存前の計算で
 * 必ずエラーになる)。ロジックを変更する場合は両方を同時に直すこと。
 */
function deriveStationSlots(waypoints) {
    if (!Array.isArray(waypoints) || waypoints.length < 2) return [];
    const n = waypoints.length;

    const originIsSingleton = waypoints[0].stationId != null &&
        !(n >= 2 && waypoints[1].stationId === waypoints[0].stationId);
    const terminalIsSingleton = waypoints[n - 1].stationId != null &&
        !(n >= 2 && waypoints[n - 2].stationId === waypoints[n - 1].stationId);

    const slots = [];
    if (originIsSingleton) {
        slots.push({ kind: 'origin', stationId: waypoints[0].stationId });
    }
    for (let i = 0; i < n - 1; i++) {
        const a = waypoints[i];
        const b = waypoints[i + 1];
        if (a.stationId != null && a.stationId === b.stationId) {
            slots.push({ kind: 'intermediate', stationId: a.stationId });
        }
    }
    if (terminalIsSingleton) {
        slots.push({ kind: 'terminal', stationId: waypoints[n - 1].stationId });
    }
    return slots;
}

/**
 * 保存済みダイヤ(v2形式)を読み込んだ際、stationPlansのarrival/departureから
 * 停車秒数を逆算する(編集画面のdwellSeconds入力欄に復元するため)。
 * 日をまたぐ場合(発車が到着より前の時刻になる)は+86400秒として扱う。
 */
function dwellSecondsFromClocks(arrival, departure) {
    if (!arrival || !departure) return 0;
    const toSeconds = (c) => c.hour * 3600 + c.minute * 60 + c.second;
    let diff = toSeconds(departure) - toSeconds(arrival);
    if (diff < 0) diff += 86400;
    return diff;
}

/**
 * 読み込んだstationPlansが、現在選択中の系統から導出したslotsと同じ駅並びかを確認する。
 * (系統のwaypointsが保存後に変更されていた場合、順序や件数がズレて誤爆するのを防ぐ)
 */
function loadedPlansMatchSlots(plans, slots) {
    if (!Array.isArray(plans) || plans.length !== slots.length) return false;
    return plans.every((p, i) => p.stationId === slots[i].stationId);
}

function pad2(n) {
    return String(n ?? 0).padStart(2, '0');
}

function formatClock(clock) {
    if (!clock) return '—';
    const base = `${pad2(clock.hour)}:${pad2(clock.minute)}:${pad2(clock.second)}`;
    return clock.dayOffset ? `${base}(+${clock.dayOffset}日)` : base;
}

const KIND_LABEL = { origin: '始発', intermediate: '中間', terminal: '終着' };

export default function TimetableEditPanel({ stations, trainSpecs, onClose, zIndex, onFocus }) {
    const [routes, setRoutes] = useState([]);
    const [routesError, setRoutesError] = useState(null);
    const [selectedRouteId, setSelectedRouteId] = useState('');

    const [trainResourceName, setTrainResourceName] = useState('');
    const [departure, setDeparture] = useState({ hour: 6, minute: 0, second: 0 });

    const [rows, setRows] = useState([]);

    const [isComputing, setIsComputing] = useState(false);
    const [computeError, setComputeError] = useState(null);
    const [result, setResult] = useState(null);

    const [timetableName, setTimetableName] = useState('');
    const [saveStatus, setSaveStatus] = useState(null); // 'saving' | 'saved' | 'error' | null
    const [saveError, setSaveError] = useState(null);

    // 系統選択が変わった時に、読み込み中の既存ダイヤ(pendingLoadPlans)があれば
    // それをrowsの初期値として優先的に使う。読み込みが終わればnullに戻す。
    const [pendingLoadPlans, setPendingLoadPlans] = useState(null);

    // ── 保存済み一覧(読込・再編集・削除) ──────────────────────────────────
    const [showList, setShowList] = useState(false);
    const [timetableList, setTimetableList] = useState([]);
    const [listLoading, setListLoading] = useState(false);
    const [listFetchError, setListFetchError] = useState(null);
    const [loadError, setLoadError] = useState(null); // 個別の読込に失敗した時(旧形式選択など)
    const [deletingName, setDeletingName] = useState(null);
    const [deleteError, setDeleteError] = useState(null);
    // 削除しようとしたダイヤが列車に紐付けられていた場合の409競合状態。{ [name]: uuid[] }
    const [deleteConflicts, setDeleteConflicts] = useState({});

    async function refreshTimetableList() {
        setListLoading(true);
        setListFetchError(null);
        try {
            setTimetableList(await fetchTimetableList());
        } catch (e) {
            setListFetchError(e.message);
        } finally {
            setListLoading(false);
        }
    }

    useEffect(() => {
        refreshTimetableList();
    }, []);

    /**
     * 一覧の「編集」から呼ばれる。schemaVersion2の新形式のみ対応
     * (SimpleStaffPanel由来の旧形式スタフはRoute/Stationと紐付いていないため不可)。
     * 系統・車両・出発時刻・保存名を復元し、各駅の停車/通過・番線・停車位置・停車秒数は
     * pendingLoadPlans経由でrows再構築useEffectに渡す(系統選択変更時と同じ経路で反映する)。
     */
    async function handleLoadTimetable(name) {
        setLoadError(null);
        try {
            const body = await fetchTimetable(name);
            if (!body || body.schemaVersion !== 2) {
                setLoadError('この時刻表は旧形式(簡易スタフ)のため、この画面では編集できません。');
                return;
            }
            setPendingLoadPlans(body.stationPlans ?? []);
            setSelectedRouteId(body.routeId ?? '');
            setTrainResourceName(body.trainResourceName ?? '');
            setDeparture(body.departure ?? { hour: 6, minute: 0, second: 0 });
            setTimetableName(name);
            setResult(null);
            setComputeError(null);
            setSaveStatus(null);
            setSaveError(null);
        } catch (e) {
            setLoadError(e.message);
        }
    }

    /** 一覧の「削除」/「強制削除」から呼ばれる */
    async function handleDeleteTimetable(name, force = false) {
        setDeletingName(name);
        setDeleteError(null);
        try {
            const res = await deleteTimetable(name, { force });
            setDeleteConflicts((prev) => {
                const next = { ...prev };
                if (res.conflict) {
                    next[name] = res.referencingUuids;
                } else {
                    delete next[name];
                }
                return next;
            });
            if (!res.conflict) {
                await refreshTimetableList();
                if (timetableName === name) setTimetableName('');
            }
        } catch (e) {
            setDeleteError(e.message);
        } finally {
            setDeletingName(null);
        }
    }

    useEffect(() => {
        let cancelled = false;
        fetchRoutes()
            .then((list) => { if (!cancelled) setRoutes(list); })
            .catch((e) => { if (!cancelled) setRoutesError(e.message); });
        return () => { cancelled = true; };
    }, []);

    const stationsById = useMemo(() => {
        const map = new Map();
        for (const st of stations ?? []) map.set(st.id, st);
        return map;
    }, [stations]);

    const selectedRoute = useMemo(
        () => routes.find((r) => r.id === selectedRouteId) ?? null,
        [routes, selectedRouteId],
    );

    // 系統選択が変わったら、その系統上の駅並びから入力行を作り直す。
    // 既に入力済みの行があれば(同じ駅・同じ並び順の位置なら)値を引き継ぐ。
    // pendingLoadPlansがセットされていて、かつそれが今回のslotsと駅並びが一致する場合は、
    // 既存入力より優先してそちらの値(停車/通過・番線・停車位置・停車秒数)を使う
    // (一覧からの「編集」読込直後の1回だけこの経路を通る)。
    useEffect(() => {
        if (!selectedRoute) { setRows([]); return; }
        const slots = deriveStationSlots(selectedRoute.waypoints);
        const loadPlans = loadedPlansMatchSlots(pendingLoadPlans, slots) ? pendingLoadPlans : null;
        if (pendingLoadPlans && !loadPlans) {
            // 読み込んだダイヤの駅並びが、現在の系統(waypoints変更後)と食い違っている
            setLoadError('保存時から系統の駅並びが変わっているため、各駅の設定は復元できませんでした。');
        }
        setRows((prevRows) => slots.map((slot, i) => {
            const station = stationsById.get(slot.stationId);
            const firstTrack = station?.tracks?.[0] ?? null;
            const firstStop = firstTrack?.stops?.[0] ?? null;
            const loaded = loadPlans?.[i];
            if (loaded) {
                return {
                    stationId: slot.stationId,
                    stationName: station?.name ?? '(不明な駅)',
                    kind: slot.kind,
                    pass: loaded.handling === 'pass',
                    trackId: loaded.trackId ?? firstTrack?.id ?? '',
                    stopId: loaded.stopId ?? firstStop?.id ?? '',
                    dwellSeconds: dwellSecondsFromClocks(loaded.arrival, loaded.departure)
                        || (slot.kind === 'intermediate' ? 30 : 0),
                };
            }
            const prev = prevRows[i]?.stationId === slot.stationId ? prevRows[i] : null;
            return {
                stationId: slot.stationId,
                stationName: station?.name ?? '(不明な駅)',
                kind: slot.kind,
                pass: prev?.pass ?? false,
                trackId: prev?.trackId ?? firstTrack?.id ?? '',
                stopId: prev?.stopId ?? firstStop?.id ?? '',
                dwellSeconds: prev?.dwellSeconds ?? (slot.kind === 'intermediate' ? 30 : 0),
            };
        }));
        if (pendingLoadPlans) setPendingLoadPlans(null);
        setResult(null);
        setComputeError(null);
    }, [selectedRoute, stationsById, pendingLoadPlans]);

    function updateRow(index, patch) {
        setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    }

    function tracksFor(stationId) {
        return stationsById.get(stationId)?.tracks ?? [];
    }

    function stopsFor(stationId, trackId) {
        return tracksFor(stationId).find((t) => t.id === trackId)?.stops ?? [];
    }

    const canCompute = selectedRoute && trainResourceName && rows.length > 0 &&
        rows.every((row) => row.pass || (row.trackId && row.stopId));

    async function handleCompute() {
        setIsComputing(true);
        setComputeError(null);
        setResult(null);
        try {
            const stationPlans = rows.map((row) => (
                row.pass
                    ? { stationId: row.stationId, pass: true }
                    : {
                        stationId: row.stationId,
                        trackId: row.trackId,
                        stopId: row.stopId,
                        dwellTicks: Math.max(0, Math.round((Number(row.dwellSeconds) || 0) * TICKS_PER_SECOND)),
                    }
            ));
            const res = await calculateRouteTimetable({
                routeId: selectedRoute.id,
                trainResourceName,
                departure,
                stationPlans,
            });
            setResult(res);
        } catch (e) {
            setComputeError(e.message);
        } finally {
            setIsComputing(false);
        }
    }

    async function handleSave() {
        if (!result) return;
        setSaveStatus('saving');
        setSaveError(null);
        try {
            // stationPlansWithSchedule(出現順カーソルで対応づけ済み)からarrival/departureを埋め込む。
            const stationPlans = stationPlansWithSchedule.map(({ plan, sched }) => ({
                stationId: plan.stationId,
                handling: plan.handling,
                trackId: plan.trackId ?? undefined,
                stopId: plan.stopId ?? undefined,
                turnback: plan.turnback === true,
                arrival: sched?.arrivalClock
                    ? { hour: sched.arrivalClock.hour, minute: sched.arrivalClock.minute, second: sched.arrivalClock.second }
                    : null,
                departure: sched?.departureClock
                    ? { hour: sched.departureClock.hour, minute: sched.departureClock.minute, second: sched.departureClock.second }
                    : null,
            }));
            await saveTimetable(timetableName.trim(), {
                schemaVersion: 2,
                routeId: result.routeId,
                routeName: result.routeName,
                trainResourceName: result.trainResourceName,
                departure: result.departure,
                stationPlans,
            });
            setSaveStatus('saved');
            await refreshTimetableList();
        } catch (e) {
            setSaveStatus('error');
            setSaveError(e.message);
        }
    }

    // handling==='pass'の駅はresult.scheduleに含まれない(通過駅は着発時刻を持たないため)。
    // 【注意】stationIdをキーにしたMapで対応づけると、始発駅と終着駅が同じ駅になる環状・
    // 折返し系統でキーが衝突し、後勝ちで別駅のデータに上書きされてしまう(実際に起きたバグ)。
    // サーバー側(server.js)は出現順のカーソルでschedule[]とstationPlans[]を対応づけている
    // (stopCursor++)ため、クライアント側も同じ「出現順カーソル」方式で揃える。
    const stationPlansWithSchedule = useMemo(() => {
        if (!result) return [];
        let stopCursor = 0;
        return result.stationPlans.map((plan) => ({
            plan,
            sched: plan.handling === 'stop' ? result.schedule[stopCursor++] : null,
        }));
    }, [result]);

    const trainOptions = Object.keys(trainSpecs ?? {});

    return (
        <Window
            title="🕐 時刻表編集"
            defaultPos={{ x: 380, y: 60, width: 560, height: 560 }}
            onClose={onClose}
            zIndex={zIndex}
            onFocus={onFocus}
        >
            <div style={{ padding: '14px 16px', height: '100%', overflowY: 'auto' }}>
                {routesError && <div className="time-editor__error">系統一覧の取得に失敗しました: {routesError}</div>}

                <div style={{ marginBottom: 12 }}>
                    <button className="mode-btn" onClick={() => setShowList((v) => !v)}>
                        {showList ? '▼ 保存済み一覧を閉じる' : '📂 保存済み一覧を開く'}
                    </button>

                    {showList && (
                        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                            {listLoading && <div className="time-editor__note">読み込み中...</div>}
                            {listFetchError && <div className="time-editor__error">一覧の取得に失敗しました: {listFetchError}</div>}
                            {loadError && <div className="time-editor__error">{loadError}</div>}
                            {deleteError && <div className="time-editor__error">削除に失敗しました: {deleteError}</div>}
                            {!listLoading && !listFetchError && timetableList.length === 0 && (
                                <div className="time-editor__note">まだ保存済みのダイヤはありません。</div>
                            )}
                            {timetableList.map((item) => {
                                const conflict = deleteConflicts[item.name];
                                const isCurrent = item.name === timetableName;
                                return (
                                    <div key={item.name} style={{
                                        padding: '6px 8px', borderRadius: 4, fontSize: 12,
                                        border: isCurrent ? '1px solid var(--amber)' : '1px solid transparent',
                                        background: isCurrent ? 'rgba(232,163,61,0.10)' : 'rgba(255,255,255,0.03)',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ flex: 1, fontWeight: 'bold' }}>{item.name}</span>
                                            {item.kind === 'legacy' && <span style={{ opacity: 0.6 }}>(旧形式・簡易スタフ)</span>}
                                            {isCurrent && <span style={{ color: 'var(--amber)' }}>編集中</span>}
                                        </div>
                                        {item.kind === 'v2' && (
                                            <div style={{ opacity: 0.75 }}>
                                                {item.routeName} / {item.trainResourceName || '(車両未設定)'} / 駅{item.stationCount}件
                                            </div>
                                        )}

                                        {!conflict ? (
                                            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                                <button
                                                    className="mode-btn" style={{ flex: 1 }}
                                                    disabled={item.kind !== 'v2'}
                                                    title={item.kind !== 'v2' ? '旧形式のためこの画面では編集できません' : undefined}
                                                    onClick={() => handleLoadTimetable(item.name)}
                                                >
                                                    編集
                                                </button>
                                                <button
                                                    className="mode-btn" style={{ flex: 1, color: 'var(--red)' }}
                                                    disabled={deletingName === item.name}
                                                    onClick={() => handleDeleteTimetable(item.name, false)}
                                                >
                                                    {deletingName === item.name ? '削除中...' : '削除'}
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ marginTop: 4 }}>
                                                <div className="time-editor__error">
                                                    列車に紐付けられているため削除できません(uuid: {conflict.join(', ')})
                                                </div>
                                                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                                    <button
                                                        className="mode-btn" style={{ flex: 1 }}
                                                        onClick={() => setDeleteConflicts((prev) => {
                                                            const next = { ...prev };
                                                            delete next[item.name];
                                                            return next;
                                                        })}
                                                    >
                                                        キャンセル
                                                    </button>
                                                    <button
                                                        className="mode-btn" style={{ flex: 1, color: 'var(--red)' }}
                                                        disabled={deletingName === item.name}
                                                        onClick={() => handleDeleteTimetable(item.name, true)}
                                                    >
                                                        {deletingName === item.name ? '削除中...' : '強制削除(紐付け解除)'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="time-editor__fields">
                    <label className="time-editor__field">
                        <span>系統</span>
                        <select
                            value={selectedRouteId}
                            onChange={(e) => setSelectedRouteId(e.target.value)}
                            style={{ flex: 1 }}
                        >
                            <option value="">(選択してください)</option>
                            {routes.map((r) => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </label>

                    <label className="time-editor__field">
                        <span>車両</span>
                        <select
                            value={trainResourceName}
                            onChange={(e) => setTrainResourceName(e.target.value)}
                            style={{ flex: 1 }}
                        >
                            <option value="">(選択してください)</option>
                            {trainOptions.map((name) => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </label>

                    <label className="time-editor__field">
                        <span>出発時刻</span>
                        <input type="number" min="0" max="23" value={departure.hour}
                               onChange={(e) => setDeparture((d) => ({ ...d, hour: Number(e.target.value) }))} style={{ width: 48 }} />
                        :
                        <input type="number" min="0" max="59" value={departure.minute}
                               onChange={(e) => setDeparture((d) => ({ ...d, minute: Number(e.target.value) }))} style={{ width: 48 }} />
                        :
                        <input type="number" min="0" max="59" value={departure.second}
                               onChange={(e) => setDeparture((d) => ({ ...d, second: Number(e.target.value) }))} style={{ width: 48 }} />
                    </label>
                </div>

                {rows.length > 0 && (
                    <table className="timetable-edit__table">
                        <thead>
                        <tr>
                            <th>駅</th>
                            <th>扱い</th>
                            <th>番線</th>
                            <th>停車位置</th>
                            <th>停車(秒)</th>
                        </tr>
                        </thead>
                        <tbody>
                        {rows.map((row, i) => {
                            const canPass = row.kind === 'intermediate';
                            const tracks = tracksFor(row.stationId);
                            const stops = stopsFor(row.stationId, row.trackId);
                            return (
                                <tr key={`${row.stationId}-${i}`}>
                                    <td>{row.stationName}<span className="timetable-edit__kind">{KIND_LABEL[row.kind]}</span></td>
                                    <td>
                                        {canPass ? (
                                            <label className="timetable-edit__pass">
                                                <input
                                                    type="checkbox"
                                                    checked={row.pass}
                                                    onChange={(e) => updateRow(i, { pass: e.target.checked })}
                                                />
                                                通過
                                            </label>
                                        ) : (
                                            <span className="timetable-edit__kind">停車</span>
                                        )}
                                    </td>
                                    <td>
                                        {!row.pass && (
                                            <select
                                                value={row.trackId}
                                                onChange={(e) => {
                                                    const nextTrackId = e.target.value;
                                                    const nextFirstStop = stopsFor(row.stationId, nextTrackId)[0]?.id ?? '';
                                                    updateRow(i, { trackId: nextTrackId, stopId: nextFirstStop });
                                                }}
                                            >
                                                <option value="">(選択)</option>
                                                {tracks.map((t) => <option key={t.id} value={t.id}>{t.name || t.id}</option>)}
                                            </select>
                                        )}
                                    </td>
                                    <td>
                                        {!row.pass && (
                                            <select
                                                value={row.stopId}
                                                onChange={(e) => updateRow(i, { stopId: e.target.value })}
                                            >
                                                <option value="">(選択)</option>
                                                {stops.map((s) => (
                                                    <option key={s.id} value={s.id}>{s.trainResourceName ?? s.id}(車{s.carCount ?? '?'}両)</option>
                                                ))}
                                            </select>
                                        )}
                                    </td>
                                    <td>
                                        {!row.pass && (
                                            <input
                                                type="number" min="0"
                                                value={row.dwellSeconds}
                                                onChange={(e) => updateRow(i, { dwellSeconds: Number(e.target.value) })}
                                                style={{ width: 56 }}
                                            />
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                )}

                <button
                    className="time-editor__btn"
                    disabled={!canCompute || isComputing}
                    onClick={handleCompute}
                >
                    {isComputing ? '計算中...' : '計算する'}
                </button>

                {computeError && <div className="time-editor__error">{computeError}</div>}

                {result && (
                    <>
                        <table className="timetable-edit__table" style={{ marginTop: 12 }}>
                            <thead>
                            <tr>
                                <th>駅</th>
                                <th>時刻</th>
                                <th></th>
                            </tr>
                            </thead>
                            <tbody>
                            {stationPlansWithSchedule.map(({ plan, sched }, i) => {
                                const stationName = stationsById.get(plan.stationId)?.name ?? plan.stationId;
                                const isPass = plan.handling === 'pass';
                                return (
                                    <Fragment key={i}>
                                        <tr className="timetable-edit__row timetable-edit__row--arrival">
                                            <td>着</td>
                                            <td className={isPass ? 'timetable-edit__pass-mark' : undefined}>
                                                {isPass ? 'レ' : formatClock(sched?.arrivalClock)}
                                            </td>
                                            <td></td>
                                        </tr>
                                        <tr className="timetable-edit__row timetable-edit__row--station">
                                            <td>{stationName}</td>
                                            <td>{isPass ? '—' : (sched?.trackName ?? '—')}</td>
                                            <td></td>
                                        </tr>
                                        <tr className="timetable-edit__row timetable-edit__row--departure">
                                            <td>発</td>
                                            <td className={isPass ? 'timetable-edit__pass-mark' : undefined}>
                                                {isPass ? 'レ' : formatClock(sched?.departureClock)}
                                            </td>
                                            <td>
                                                {plan.turnback && (
                                                    <span style={{ color: 'var(--amber)' }}>折返</span>
                                                )}
                                            </td>
                                        </tr>
                                    </Fragment>
                                );
                            })}
                            </tbody>
                        </table>

                        <div className="time-editor__fields" style={{ marginTop: 12 }}>
                            <label className="time-editor__field">
                                <span>ダイヤ名</span>
                                <input
                                    type="text"
                                    value={timetableName}
                                    onChange={(e) => setTimetableName(e.target.value)}
                                    style={{ flex: 1 }}
                                />
                            </label>
                        </div>

                        {saveStatus === 'error' && <div className="time-editor__error">{saveError}</div>}
                        {saveStatus === 'saved' && <div className="time-editor__note" style={{ color: 'var(--green)' }}>✓ 保存しました</div>}

                        <button
                            className="time-editor__btn"
                            disabled={!timetableName.trim() || saveStatus === 'saving'}
                            onClick={handleSave}
                        >
                            {saveStatus === 'saving' ? '保存中...' : 'ダイヤを保存'}
                        </button>
                    </>
                )}

                {!selectedRoute && (
                    <div className="time-editor__note">
                        系統を選ぶと、その系統上の駅が一覧表示されます。中間駅は「通過」チェックで
                        通過扱いにできます(始発駅・終着駅は必ず停車します)。
                    </div>
                )}
            </div>
        </Window>
    );
}