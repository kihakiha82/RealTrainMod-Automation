import { Window } from '../Window.jsx';
import {findRailRoute} from "../../mapEngine/railGraph.js";
import {
    assignTrain,
    fetchRouteProfile,
    fetchSimpleSchedule,
    fetchTrainAssignments,
    saveTimetable,
    unassignTrain
} from "../../api.js";
import {useEffect, useState} from "react";

export default function SimpleStaffPanel({
                                             segments,         // ◀ 追加: 経路計算に必要
                                             trains,           // ◀ 追加: 列車一覧データ
                                             routeStart,       // ◀ 追加: App.jsx 等から渡される始点
                                             routeEnd,         // ◀ 追加: App.jsx 等から渡される終点
                                             onClearRoute,
                                             routePath,
                                             setRoutePath,
                                             onClose,
                                             zIndex,
                                             trainSpecs,
                                             onFocus
                                       }) {

    const [routeResult,    setRouteResult]    = useState(null);
    const [isComputingRoute, setIsComputingRoute] = useState(false);


    const [selectedTrain,  setSelectedTrain]  = useState('');
    const [departureTime,  setDepartureTime]  = useState({ hour: 8, minute: 0, second: 0 });
    const [schedule,       setSchedule]       = useState(null);
    const [isComputingSchedule, setIsComputingSchedule] = useState(false);
    const [scheduleError,  setScheduleError]  = useState(null);
    const [saveStaffName,  setSaveStaffName]  = useState('');
    const [saveStaffStatus,setSaveStaffStatus]= useState(null);

    const [assignments,    setAssignments]     = useState({});
    const [assignStatus,   setAssignStatus]    = useState({});


    useEffect(() => {
        setRouteResult(null);
        setRoutePath(null);
        setSchedule(null);
        setScheduleError(null);
        setSaveStaffStatus(null);
    }, [routeStart, routeEnd]);

    async function handleComputeRoute() {
        if (!routeStart || !routeEnd) return;
        setIsComputingRoute(true);
        setRouteResult(null);
        setRoutePath(null);
        setSchedule(null);
        setScheduleError(null);
        setSaveStaffStatus(null);
        try {
            const route = findRailRoute(segments, routeStart, routeEnd);
            if (!route) {
                setRouteResult({ error: '始点と終点が線路で繋がっていません' });
                return;
            }
            // 計算された経路をstateに保存（ハイライト・矢印表示用）
            setRoutePath(route);

            const profile = await fetchRouteProfile(route);
            setRouteResult({
                ok: true,
                segmentCount: route.length,
                totalLength: profile.totalLength,
                pointCount: profile.points.length,
            });
        } catch (e) {
            setRouteResult({ error: e.message });
        } finally {
            setIsComputingRoute(false);
        }
    }

    async function handleAssignTrain(uuid) {
        if (!saveStaffName) return;
        setAssignStatus(prev => ({ ...prev, [uuid]: 'assigning' }));
        try {
            await assignTrain(uuid, saveStaffName, departureTime);
            const data = await fetchTrainAssignments();
            setAssignments(data);
            setAssignStatus(prev => ({ ...prev, [uuid]: 'assigned' }));
        } catch (e) {
            setAssignStatus(prev => ({ ...prev, [uuid]: 'error' }));
        }
    }

    /** 指定列車のスタフ紐付けを解除する */
    async function handleUnassignTrain(uuid) {
        try {
            await unassignTrain(uuid);
            const data = await fetchTrainAssignments();
            setAssignments(data);
            setAssignStatus(prev => { const next = { ...prev }; delete next[uuid]; return next; });
        } catch (e) {
            console.warn('紐付け解除に失敗しました', e);
        }
    }

    /** 簡易スタフ: 現在の経路(routePath)+選択中の車両+出発時刻から簡易スタフを計算する */
    async function handleComputeSchedule() {
        if (!routePath || !selectedTrain) return;
        setIsComputingSchedule(true);
        setScheduleError(null);
        setSchedule(null);
        setSaveStaffStatus(null);
        try {
            const result = await fetchSimpleSchedule(routePath, selectedTrain, departureTime);
            setSchedule(result);
        } catch (e) {
            setScheduleError(e.message);
        } finally {
            setIsComputingSchedule(false);
        }
    }

    /** 簡易スタフの保存(既存の時刻表保存APIにそのまま保存する) */
    async function handleSaveStaff() {
        if (!schedule || !saveStaffName) return;
        setSaveStaffStatus('saving');
        try {
            await saveTimetable(saveStaffName, schedule);
            setSaveStaffStatus('saved');
        } catch (e) {
            setSaveStaffStatus('error');
        }
    }

    /** tick由来のclock({hour,minute,second,dayOffset})を "HH:MM:SS" (+n日)表示に整形する */
    function formatScheduleClock(clock) {
        if (!clock) return '--:--:--';
        const pad = (n) => String(n).padStart(2, '0');
        const base = `${pad(clock.hour)}:${pad(clock.minute)}:${pad(clock.second)}`;
        return clock.dayOffset > 0 ? `${base} (+${clock.dayOffset}日)` : base;
    }



    // ── train-assignmentsポーリング(スタフが保存・解除されたら即反映 + 5秒ごと) ──
    useEffect(() => {
        let timer;
        let cancelled = false;
        const poll = async () => {
            try {
                const data = await fetchTrainAssignments();
                if (!cancelled) setAssignments(data);
            } catch { /* 無視 */ }
            finally { if (!cancelled) timer = setTimeout(poll, 5000); }
        };
        poll();
        return () => { cancelled = true; clearTimeout(timer); };
    }, []);

    return (
        <Window
            title="📋 簡易運行設定"
            defaultPos={{ x: 300, y: 100, width: 380, height: 420 }}
            onClose={onClose}
            zIndex={zIndex}
            onFocus={onFocus}
        >
            <div style={{ padding: '14px 16px', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* 1. 経路計算セクション */}
                <div style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                    <div style={{ marginBottom: '8px', fontSize: '12px' }}>
                        始点: {routeStart ? '✓ 選択済' : '未設定'} / 終点: {routeEnd ? '✓ 選択済' : '未設定'}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="mode-btn" disabled={!routeStart || !routeEnd || isComputingRoute} onClick={handleComputeRoute}>
                            {isComputingRoute ? '計算中...' : '経路を計算'}
                        </button>
                        <button className="mode-btn" onClick={onClearRoute}>
                            クリア
                        </button>
                    </div>

                    {routeResult?.ok && (
                        <div style={{ marginTop: '8px', color: 'var(--green)', fontSize: '11px' }}>
                            ✓ {routeResult.segmentCount}区間 / 距離{routeResult.totalLength.toFixed(1)} / 点数{routeResult.pointCount}
                        </div>
                    )}
                    {routeResult?.error && (
                        <div style={{ marginTop: '8px', color: 'var(--red)', fontSize: '11px' }}>✗ {routeResult.error}</div>
                    )}
                </div>

                {/* 2. スタフ作成セクション */}
                {routeResult?.ok && (
                    <div style={{ padding: '8px', border: '1px solid var(--line)', borderRadius: '6px' }}>
                        <div style={{ fontSize: '12px', marginBottom: '8px' }}>スタフ作成</div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '40px' }}>車両:</span>
                                <select value={selectedTrain} onChange={(e) => setSelectedTrain(e.target.value)} disabled={!trainSpecs} style={{ flex: 1, padding: '4px' }}>
                                    {!trainSpecs && <option>読込中...</option>}
                                    {trainSpecs && Object.keys(trainSpecs).map((name) => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '40px' }}>出発:</span>
                                {/* input type="time" の value 組み立ては関数化するか、直接記述 */}
                                <input
                                    type="time" step="1"
                                    value={`${String(departureTime.hour).padStart(2, '0')}:${String(departureTime.minute).padStart(2, '0')}:${String(departureTime.second).padStart(2, '0')}`}
                                    onChange={(e) => {
                                        const [h, m, s] = e.target.value.split(':').map(Number);
                                        setDepartureTime({ hour: h || 0, minute: m || 0, second: s || 0 });
                                    }}
                                    style={{ flex: 1, padding: '4px' }}
                                />
                            </label>

                            <button className="mode-btn" disabled={!selectedTrain || isComputingSchedule} onClick={handleComputeSchedule}>
                                {isComputingSchedule ? '計算中...' : 'スタフを作成'}
                            </button>
                        </div>

                        {/* 計算結果表示 */}
                        {schedule && (
                            <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--green)' }}>
                                ✓ {formatScheduleClock(schedule.schedule[0].departureClock)}発 → {formatScheduleClock(schedule.schedule[schedule.schedule.length - 1].arrivalClock)}着
                                <br />(所要{(schedule.schedule[schedule.schedule.length - 1].legDurationTicks / 20).toFixed(1)}秒)
                                {schedule.brakeSpecEstimated && <div style={{ color: 'var(--amber)' }}>⚠ブレーキ性能は暫定値です</div>}
                            </div>
                        )}
                        {scheduleError && <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--red)' }}>✗ {scheduleError}</div>}

                        {/* 保存フォーム */}
                        {schedule && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px' }}>
                                <input
                                    type="text" placeholder="保存名" value={saveStaffName}
                                    onChange={(e) => setSaveStaffName(e.target.value)}
                                    style={{ flex: 1, padding: '4px' }}
                                />
                                <button className="mode-btn" disabled={!saveStaffName || saveStaffStatus === 'saving'} onClick={handleSaveStaff}>
                                    保存
                                </button>
                            </div>
                        )}
                        {saveStaffStatus === 'saved' && <div style={{ fontSize: '11px', color: 'var(--green)', marginTop: '4px' }}>✓ 保存しました</div>}
                        {saveStaffStatus === 'error' && <div style={{ fontSize: '11px', color: 'var(--red)', marginTop: '4px' }}>✗ 保存失敗</div>}
                    </div>
                )}

                {/* 3. 列車への適用セクション */}
                {saveStaffStatus === 'saved' && saveStaffName && trains?.length > 0 && (() => {
                    const candidates = trains.filter(t => t.resourceName === selectedTrain && t.isControlCar);
                    if (candidates.length === 0) return null;
                    return (
                        <div style={{ padding: '8px', border: '1px solid var(--amber)', borderRadius: '6px' }}>
                            <div style={{ fontSize: '12px', marginBottom: '8px', color: 'var(--amber)' }}>列車に適用</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {candidates.map(t => {
                                    const assigned = assignments[t.uuid];
                                    const status = assignStatus[t.uuid];
                                    const label = t.customName || `${t.resourceName} (${t.formationId})`;
                                    return (
                                        <div key={t.uuid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }} title={label}>{label}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {assigned?.timetableName === saveStaffName ? (
                                                    <>
                                                        <span style={{ color: 'var(--green)' }}>✓ 適用中</span>
                                                        <button className="mode-btn" onClick={() => handleUnassignTrain(t.uuid)}>解除</button>
                                                    </>
                                                ) : (
                                                    <button className="mode-btn" disabled={status === 'assigning'} onClick={() => handleAssignTrain(t.uuid)}>
                                                        {status === 'assigning' ? '適用中' : '適用'}
                                                    </button>
                                                )}
                                                {status === 'error' && <span style={{ color: 'var(--red)' }}>✗</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}
            </div>
        </Window>

    )
}