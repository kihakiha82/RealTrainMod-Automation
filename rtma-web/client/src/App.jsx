import React, { useEffect, useRef, useState } from 'react';
import Map2D from './components/Map2D';
import TimeEditor from './components/TimeEditor';
import { fetchRails, fetchPlayerPosition, fetchTime, saveTime, fetchRouteProfile, fetchTrainSpecs, fetchSimpleSchedule, saveTimetable, fetchTrainAssignments, assignTrain, unassignTrain } from './api';
import { extrapolateTime, extrapolateFullDateTime, formatDateTime } from './timeUtils';
import { findRailRoute } from './mapEngine/railGraph';
import { Window } from './components/Window';

export default function App() {
  const [segments,       setSegments]       = useState([]);
  const [player,         setPlayer]         = useState(null);
  const [isServerRunning,setIsServerRunning]= useState(false);
  const [status,         setStatus]         = useState('接続待機中...');
  const [timeSnapshot,   setTimeSnapshot]   = useState(null);
  const [clockText,      setClockText]      = useState('');
  const [isExtrapolating,setIsExtrapolating]= useState(false);
  const [serverSnapshot, setServerSnapshot] = useState(null);
  const [selectedIds,    setSelectedIds]    = useState(() => new Set());

  const [routeStart,     setRouteStart]     = useState(null);
  const [routeEnd,       setRouteEnd]       = useState(null);
  const [routeResult,    setRouteResult]    = useState(null);
  const [isComputingRoute, setIsComputingRoute] = useState(false);
  const [routePath,      setRoutePath]      = useState(null);

  const [trainSpecs,     setTrainSpecs]     = useState(null);
  const [selectedTrain,  setSelectedTrain]  = useState('');
  const [departureTime,  setDepartureTime]  = useState({ hour: 8, minute: 0, second: 0 });
  const [schedule,       setSchedule]       = useState(null);
  const [isComputingSchedule, setIsComputingSchedule] = useState(false);
  const [scheduleError,  setScheduleError]  = useState(null);
  const [saveStaffName,  setSaveStaffName]  = useState('');
  const [saveStaffStatus,setSaveStaffStatus]= useState(null);

  const [trains,         setTrains]         = useState([]);
  const [assignments,    setAssignments]     = useState({});
  const [assignStatus,   setAssignStatus]    = useState({});

  const mapRef          = useRef(null);
  const hasCenteredRef  = useRef(false);
  const playerStateRef  = useRef({ isServerRunning: false, isPaused: false });
  const timePollNowRef  = useRef(null);
  const extraTimerRef   = useRef(null);
  const timeSnapshotRef = useRef(null);
  const snapshotRef     = useRef(null);

  // ----------------------------------------------------
  // タブ・ウィンドウ管理
  // ----------------------------------------------------
  // タブ自体の存在（削除されていなければ true）
  const [isTestTabExists, setIsTestTabExists] = useState(true);
  // ウィンドウの表示/非表示（開いていれば true）
  const [showTestwindow, setshowTestwindow]   = useState(false);

  // Z-Index（最前面表示）管理
  const [activeWindow, setActiveWindow] = useState('test');
  const [zIndices, setZIndices]         = useState({ test: 10, log: 11 });

  const bringToFront = (id) => {
    setActiveWindow(id);
    const maxZ = Math.max(0, ...Object.values(zIndices));
    setZIndices((prev) => ({ ...prev, [id]: maxZ + 1 }));
  };

  // タブクリック時：ウィンドウを開いて最前面へ
  const handleTabClick = (id) => {
    if (id === 'test') {
      setshowTestwindow(true);
      bringToFront('test');
    }
  };

  // タブの×ボタンクリック時：タブ要素自体を削除＆ウィンドウも閉じる
  const handleCloseTab = (id, e) => {
    if (e) e.stopPropagation(); // タブ切り替えイベントとの連動を防止

    if (id === 'test') {
      setIsTestTabExists(false); // タブを一覧から削除
      setshowTestwindow(false);  // ウィンドウも閉じる
    }
  };

  // ----------------------------------------------------
  // レール右クリック等の処理
  // ----------------------------------------------------
  function handleRailContextMenuAction(itemId, targetIds, railPoint) {
    if (itemId === 'simple-operation:set-start-point') {
      setRouteStart(railPoint ?? null);
      setRouteResult(null);
      setRoutePath(null);
      setSchedule(null);
      setSaveStaffStatus(null);
      return;
    }
    if (itemId === 'simple-operation:set-end-point') {
      setRouteEnd(railPoint ?? null);
      setRouteResult(null);
      setRoutePath(null);
      setSchedule(null);
      setSaveStaffStatus(null);
      return;
    }
    console.log('[ContextMenu] action:', itemId, 'targets:', targetIds);
  }

  function handleRoutePointDrag(role, point) {
    if (role === 'start') setRouteStart(point);
    else setRouteEnd(point);
    setRouteResult(null);
    setRoutePath(null);
    setSchedule(null);
    setSaveStaffStatus(null);
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

  function formatScheduleClock(clock) {
    if (!clock) return '--:--:--';
    const pad = (n) => String(n).padStart(2, '0');
    const base = `${pad(clock.hour)}:${pad(clock.minute)}:${pad(clock.second)}`;
    return clock.dayOffset > 0 ? `${base} (+${clock.dayOffset}日)` : base;
  }

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

  useEffect(() => { timeSnapshotRef.current = timeSnapshot; }, [timeSnapshot]);

  // timeポーリング
  useEffect(() => {
    let timer;
    let cancelled = false;

    const poll = async () => {
      try {
        const timeData = await fetchTime();
        if (cancelled) return;

        const snap = {
          ...timeData,
          ...playerStateRef.current,
          fetchedAtMs: Date.now(),
        };

        setServerSnapshot(snap);
        snapshotRef.current = snap;

        setIsExtrapolating(false);
        clearTimeout(extraTimerRef.current);
        extraTimerRef.current = setTimeout(() => {
          if (!cancelled) setIsExtrapolating(true);
        }, 1000);

      } catch (e) {
        console.warn('時刻データの取得に失敗しました', e);
      } finally {
        if (!cancelled) timer = setTimeout(poll, 5000);
      }
    };

    timePollNowRef.current = () => {
      clearTimeout(timer);
      poll();
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(extraTimerRef.current);
    };
  }, []);

  // playerポーリング
  useEffect(() => {
    let timer;
    let cancelled = false;

    const tick = async () => {
      try {
        const pos = await fetchPlayerPosition();
        if (cancelled) return;

        setPlayer(pos);

        const newState = {
          isServerRunning: pos?.isServerRunning ?? false,
          isPaused:        pos?.isPaused        ?? false,
        };
        setIsServerRunning(newState.isServerRunning);

        const prev = playerStateRef.current;
        if (prev.isServerRunning !== newState.isServerRunning ||
            prev.isPaused        !== newState.isPaused) {

          setServerSnapshot(prev =>
              prev ? { ...prev, ...newState } : prev
          );

          if (snapshotRef.current) {
            snapshotRef.current = { ...snapshotRef.current, ...newState };
          }

          if (!newState.isServerRunning) {
            timePollNowRef.current?.();
          }
        }

        playerStateRef.current = newState;

        if (!hasCenteredRef.current) {
          hasCenteredRef.current = true;
          mapRef.current?.centerOn(pos?.x ?? 0, pos?.z ?? 0);
        }
      } catch {
        // 取得失敗時は前回状態を維持
      } finally {
        if (!cancelled) timer = setTimeout(tick, 1000);
      }
    };

    tick();
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  // 時刻書き戻し
  useEffect(() => {
    if (isServerRunning) return;

    const writeback = async () => {
      const snap = snapshotRef.current;
      if (!snap) return;

      const now = Date.now();
      const full = extrapolateFullDateTime(snap, now);
      if (!full) return;

      await saveTime({
        year: full.year,
        dayOfYear: full.dayOfYear,
        hour: full.hour,
        minute: full.minute,
        second: full.second,
      });

      snapshotRef.current = {
        ...snap,
        year: full.year,
        dayOfYear: full.dayOfYear,
        hour: full.hour,
        minute: full.minute,
        second: full.second,
        fetchedAtMs: now,
      };
    };

    writeback();
    const interval = setInterval(writeback, 5000);
    return () => clearInterval(interval);
  }, [isServerRunning]);

  // 時計更新
  useEffect(() => {
    let frame;
    const update = () => {
      const snap = snapshotRef.current;
      if (snap) {
        const current = extrapolateTime(snap, Date.now());
        if (current) {
          const frozen = current.frozen ? " ⏸" : "";
          const predict = !current.frozen ? " (予測)" : "";

          setClockText(
              formatDateTime(current) + frozen + predict
          );
        }
      }
      frame = requestAnimationFrame(update);
    };

    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, []);

  // railsポーリング
  useEffect(() => {
    let timer;
    let cancelled = false;

    const tick = async () => {
      try {
        const rails = await fetchRails();
        if (cancelled) return;
        const pointCount = rails.filter(r => r.isPoint).length;
        setStatus(`更新: ${new Date().toLocaleTimeString()} (区間${rails.length} / ポイント${pointCount})`);
        setSegments(rails);
      } catch (e) {
        if (!cancelled) setStatus(`取得失敗: ${e.message}`);
      } finally {
        if (!cancelled) timer = setTimeout(tick, 3000);
      }
    };

    tick();
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  // trainsポーリング
  useEffect(() => {
    let timer;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch('/api/trains');
        if (res.ok) setTrains(await res.json());
      } catch { /* 未起動時は無視 */ }
      finally { if (!cancelled) timer = setTimeout(poll, 5000); }
    };
    poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  // train-assignmentsポーリング
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

  // trainspecs取得
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const specs = await fetchTrainSpecs();
        if (cancelled) return;
        setTrainSpecs(specs);
        const firstName = Object.keys(specs)[0];
        if (firstName) setSelectedTrain(firstName);
      } catch (e) {
        console.warn('車両データの取得に失敗しました', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
      <div className="app">
        <header className="topbar">
          <div className="topbar__title">
            <span className="topbar__mark">RTMA</span>
            <span className="topbar__sub">運転指令盤</span>
          </div>

          <div className="topbar__clock" style={{ fontSize: '1.2em', fontWeight: 'bold', margin: '0 16px' }}>
            {clockText ? `🕒 ${clockText}` : '🕒 --:--'}
          </div>

          <div className="topbar__status">{status}</div>
          {selectedIds.size > 0 && (
              <div className="topbar__status">
                選択中: {selectedIds.size}本
                <button
                    className="mode-btn"
                    style={{ marginLeft: 8 }}
                    onClick={() => setSelectedIds(new Set())}
                >
                  選択解除
                </button>
              </div>
          )}
          {(routeStart || routeEnd) && (
              <div className="topbar__status">
                簡易運行: 始点{routeStart ? '✓' : '未設定'} / 終点{routeEnd ? '✓' : '未設定'}
                <button
                    className="mode-btn"
                    style={{ marginLeft: 8 }}
                    disabled={!routeStart || !routeEnd || isComputingRoute}
                    onClick={handleComputeRoute}
                >
                  {isComputingRoute ? '計算中...' : '経路を計算'}
                </button>
                <button
                    className="mode-btn"
                    style={{ marginLeft: 4 }}
                    onClick={() => {
                      setRouteStart(null); setRouteEnd(null); setRouteResult(null); setRoutePath(null);
                      setSchedule(null); setScheduleError(null); setSaveStaffStatus(null);
                    }}
                >
                  クリア
                </button>
                {routeResult?.ok && (
                    <span style={{ marginLeft: 8, color: 'var(--green)' }}>
                      ✓ {routeResult.segmentCount}区間 / 距離{routeResult.totalLength.toFixed(1)}ブロック
                      / 点数{routeResult.pointCount}
                    </span>
                )}
                {routeResult?.error && (
                    <span style={{ marginLeft: 8, color: 'var(--red)' }}>✗ {routeResult.error}</span>
                )}
              </div>
          )}
          {routeResult?.ok && (
              <div className="topbar__status" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                簡易スタフ:
                <select
                    value={selectedTrain}
                    onChange={(e) => setSelectedTrain(e.target.value)}
                    disabled={!trainSpecs}
                >
                  {!trainSpecs && <option>車両データ取得中...</option>}
                  {trainSpecs && Object.keys(trainSpecs).map((name) => (
                      <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                出発
                <input
                    type="time"
                    step="1"
                    value={
                        `${String(departureTime.hour).padStart(2, '0')}:` +
                        `${String(departureTime.minute).padStart(2, '0')}:` +
                        `${String(departureTime.second).padStart(2, '0')}`
                    }
                    onChange={(e) => {
                      const [h, m, s] = e.target.value.split(':').map(Number);
                      setDepartureTime({ hour: h || 0, minute: m || 0, second: s || 0 });
                    }}
                />
                <button
                    className="mode-btn"
                    disabled={!selectedTrain || isComputingSchedule}
                    onClick={handleComputeSchedule}
                >
                  {isComputingSchedule ? '計算中...' : 'スタフを作成'}
                </button>

                {schedule && (() => {
                  const start = schedule.schedule[0];
                  const end = schedule.schedule[schedule.schedule.length - 1];
                  return (
                      <span style={{ color: 'var(--green)' }}>
                        ✓ {formatScheduleClock(start.departureClock)}発 →{' '}
                        {formatScheduleClock(end.arrivalClock)}着
                        (所要{(end.legDurationTicks / 20).toFixed(1)}秒)
                        {schedule.brakeSpecEstimated && (
                            <span style={{ marginLeft: 4, color: 'var(--yellow, orange)' }}>
                              ⚠ブレーキ性能は暫定値(加速度と同じ値)です
                            </span>
                        )}
                      </span>
                  );
                })()}
                {scheduleError && (
                    <span style={{ color: 'var(--red)' }}>✗ {scheduleError}</span>
                )}

                {schedule && (
                    <>
                      <input
                          type="text"
                          placeholder="保存名"
                          value={saveStaffName}
                          onChange={(e) => setSaveStaffName(e.target.value)}
                          style={{ width: 100 }}
                      />
                      <button
                          className="mode-btn"
                          disabled={!saveStaffName || saveStaffStatus === 'saving'}
                          onClick={handleSaveStaff}
                      >
                        保存
                      </button>
                      {saveStaffStatus === 'saved' && <span style={{ color: 'var(--green)' }}>✓ 保存しました</span>}
                      {saveStaffStatus === 'error' && <span style={{ color: 'var(--red)' }}>✗ 保存に失敗しました</span>}
                    </>
                )}
              </div>
          )}
          {saveStaffStatus === 'saved' && saveStaffName && trains.length > 0 && (() => {
            const candidates = trains.filter(
                t => t.resourceName === selectedTrain && t.isControlCar
            );
            if (candidates.length === 0) return null;
            return (
                <div className="topbar__status" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  列車に適用:
                  {candidates.map(t => {
                    const assigned = assignments[t.uuid];
                    const status = assignStatus[t.uuid];
                    const label = t.customName || `${t.resourceName} (formationId:${t.formationId})`;
                    return (
                        <span key={t.uuid} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: '0.9em' }}>{label}</span>
                          {assigned?.timetableName === saveStaffName ? (
                              <>
                                <span style={{ color: 'var(--green)' }}>✓ 適用中</span>
                                <button className="mode-btn" onClick={() => handleUnassignTrain(t.uuid)}>
                                  解除
                                </button>
                              </>
                          ) : (
                              <button
                                  className="mode-btn"
                                  disabled={status === 'assigning'}
                                  onClick={() => handleAssignTrain(t.uuid)}
                              >
                                {status === 'assigning' ? '適用中...' : '適用'}
                              </button>
                          )}
                          {status === 'error' && <span style={{ color: 'var(--red)' }}>✗</span>}
                        </span>
                    );
                  })}
                </div>
            );
          })()}
          <div className="topbar__modes">
            <button className="mode-btn is-active">2D</button>
            <button className="mode-btn" disabled title="準備中">3D</button>
            <button className="mode-btn" onClick={() => mapRef.current?.resetView()}>
              ⟳ 全体表示
            </button>

            {/* 消去されたタブを復活させるためのボタン（隠れてしまった場合に便利） */}
            {!isTestTabExists && (
                <button
                    className="mode-btn"
                    onClick={() => {
                      setIsTestTabExists(true);
                      setshowTestwindow(true);
                    }}
                >
                  ＋ testタブを復元
                </button>
            )}

            {isTestTabExists && (
                <button
                    className={`mode-btn ${showTestwindow ? 'is-active' : ''}`}
                    onClick={() => setshowTestwindow(!showTestwindow)}
                >
                  test
                </button>
            )}
          </div>
        </header>

        {/* タブエリア */}
        <div className="tab-bar">
          {isTestTabExists && (
              <div
                  className={`tab-item ${showTestwindow && activeWindow === 'test' ? 'is-active' : ''}`}
                  onClick={() => handleTabClick('test')}
              >
                <span className="tab-title">test</span>
                <button
                    className="tab-close-btn"
                    onClick={(e) => handleCloseTab('test', e)}
                    title="タブを閉じる"
                >
                  ✕
                </button>
              </div>
          )}

        </div>

        <main className="map-root">
          <Map2D
              segments={segments}
              player={player}
              selectedIds={selectedIds}
              routePath={routePath}
              routeStart={routeStart}
              routeEnd={routeEnd}
              onSelectionChange={setSelectedIds}
              onContextMenuAction={handleRailContextMenuAction}
              onRoutePointChange={handleRoutePointDrag}
              ref={mapRef}
          />
          {!isServerRunning && (
              <TimeEditor
                  snapshot={serverSnapshot}
                  onSaved={async () => {
                    try {
                      const timeData = await fetchTime();
                      setTimeSnapshot({ ...timeData, ...playerStateRef.current, fetchedAtMs: Date.now() });
                      setIsExtrapolating(false);
                    } catch { /* 次の5秒ポーリングで更新される */ }
                  }}
              />
          )}

          <Window
              title="TIME_EDITOR.CONFIG"
              isOpen={showTestwindow}
              isActive={activeWindow === 'test'}
              zIndex={zIndices.test}
              onFocus={() => bringToFront('test')}
              onClose={() => setshowTestwindow(false)}
              defaultPos={{ x: 20, y: 20, width: 280, height: 220 }}
          >
            aaa
          </Window>
        </main>

        <footer className="legend">
          <span className="legend__item">
            <span className="legend__swatch legend__swatch--main" />定位側 開通中
          </span>
          <span className="legend__item">
            <span className="legend__swatch legend__swatch--branch" />反位側 開通中
          </span>
          <span className="legend__item">
            <span className="legend__swatch legend__swatch--idle" />非開通側
          </span>
          <span className="legend__item">
            <span className="legend__swatch legend__swatch--rail" />通常区間
          </span>
        </footer>
      </div>
  );
}