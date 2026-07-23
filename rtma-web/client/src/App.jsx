import { useEffect, useRef, useState } from 'react';
import Map2D from './components/Map2D';
import TimeEditor from './components/TimeEditor';
import RouteEditPanel from './components/RouteEditPanel';
import StationEditPanel from './components/StationEditPanel';
import { fetchRails, fetchPlayerPosition, fetchTime, saveTime, fetchRouteProfile, fetchTrainSpecs, fetchSimpleSchedule, saveTimetable, fetchTrainAssignments, assignTrain, unassignTrain, saveRoute, fetchStations } from './api';
import { extrapolateTime, extrapolateFullDateTime, formatDateTime } from './timeUtils';
import { findRailRoute } from './mapEngine/railGraph';

export default function App() {
  const [segments,       setSegments]       = useState([]);
  const [player,         setPlayer]         = useState(null);
  const [isServerRunning,setIsServerRunning]= useState(false);
  const [status,         setStatus]         = useState('接続待機中...');
  const [timeSnapshot,   setTimeSnapshot]   = useState(null);
  const [clockText,      setClockText]      = useState('');
  // (予測)ラベルもReact stateで管理 — TimeEditorと同じパターン
  const [isExtrapolating,setIsExtrapolating]= useState(false);
  const [serverSnapshot, setServerSnapshot] = useState(null);
  // 選択中レール(seg.id)のSet。将来のプロパティパネル等、選択を使う機能はここを参照する想定
  const [selectedIds,    setSelectedIds]    = useState(() => new Set());
  // 簡易運行: 右クリックメニュー「始点を設定」「終点を設定」でマークした、レール上の点。
  // { segId, s, x, z } | null (s: そのセグメント自身の座標系でのstartからの距離)
  const [routeStart,     setRouteStart]     = useState(null);
  const [routeEnd,       setRouteEnd]       = useState(null);
  // 経路計算(/api/route-profile)の結果。{ ok, totalLength, pointCount } | { error } | null
  const [routeResult,    setRouteResult]    = useState(null);
  const [isComputingRoute, setIsComputingRoute] = useState(false);
  // 計算された経路セグメント列。{ id, reversed }[] | null
  const [routePath,      setRoutePath]      = useState(null);

  // 路線編集(4a/4b): 右クリックメニュー「経由点として追加」で組み立てていく経由点。
  // { segId, s, x, z, stationId, trackId }[]。stationId/trackIdはRouteEditPanelでの
  // 駅アタッチ操作(4b)によりnull以外になる。
  const [routeEditWaypoints, setRouteEditWaypoints] = useState([]);
  // routeEditWaypointsから毎回計算するプレビュー経路(railGraph.findRailRouteをwaypoint間で
  // 順にチェインした結果。サーバー側buildPathの簡易なクライアント版)。
  // 各entryに _legIndex(waypoints[i]〜[i+1]間のどのレッグ由来か)を付与し、
  // 経路上への挿入(4b)時に「どの2waypoint間に挿入するか」を逆引きできるようにしてある。
  // { id, reversed, sStart?, sEnd?, _legIndex }[] | null
  const [routeEditPath,      setRouteEditPath]      = useState(null);
  // waypoint間が繋がっていない場合のエラー。{ atIndex } | null
  const [routeEditError,     setRouteEditError]     = useState(null);
  const [routeEditSaveStatus,setRouteEditSaveStatus]= useState(null); // 'saving' | 'saved' | 'error' | null
  const [routeEditSaveError, setRouteEditSaveError] = useState(null);

  // 駅管理パネル(5章/4c)。右クリック「駅編集」カテゴリで拾ったrailPointを
  // StationEditPanelへpropsとして橋渡しするためのstate。
  const [showStationEditPanel, setShowStationEditPanel] = useState(false);
  const [pendingTrackPoint, setPendingTrackPoint] = useState(null);
  const [pendingStopPoint,  setPendingStopPoint]  = useState(null);

  // 地図上に駅の長方形・番線の枠線・停車位置アイコンを描画するための駅一覧。
  // RouteEditPanel/StationEditPanelでの保存・削除のたびにrefreshMapStationsで再取得する。
  const [mapStations, setMapStations] = useState([]);
  async function refreshMapStations() {
    try {
      setMapStations(await fetchStations());
    } catch (e) {
      console.warn('駅一覧の取得に失敗しました(地図表示用)', e);
    }
  }

  // 簡易スタフ: 車両一覧(trainspecs.json)、選択中の車両、出発時刻、計算結果
  const [trainSpecs,     setTrainSpecs]     = useState(null); // { [resourceName]: spec } | null
  const [selectedTrain,  setSelectedTrain]  = useState('');
  const [departureTime,  setDepartureTime]  = useState({ hour: 8, minute: 0, second: 0 });
  const [schedule,       setSchedule]       = useState(null); // /api/simple-scheduleの戻り値 | null
  const [isComputingSchedule, setIsComputingSchedule] = useState(false);
  const [scheduleError,  setScheduleError]  = useState(null);
  const [saveStaffName,  setSaveStaffName]  = useState('');
  const [saveStaffStatus,setSaveStaffStatus]= useState(null); // 'saving' | 'saved' | 'error' | null

  // 列車への適用
  const [trains,         setTrains]         = useState([]); // /api/trains の現在値
  const [assignments,    setAssignments]     = useState({}); // /api/train-assignments の現在値
  const [assignStatus,   setAssignStatus]    = useState({}); // { [uuid]: 'assigning'|'assigned'|'error' }

  const mapRef          = useRef(null);
  const hasCenteredRef  = useRef(false);
  // player.jsonのゲーム状態をtimeSnapshotへ橋渡しするref
  const playerStateRef  = useRef({ isServerRunning: false, isPaused: false });
  // time pollを即座に起動するためのref(playerポーリングから呼ぶ)
  const timePollNowRef  = useRef(null);
  // (予測)への切り替えタイマー
  const extraTimerRef   = useRef(null);
  // setInterval内のstaleクロージャを防ぐため、常に最新のtimeSnapshotをrefでも保持する
  const timeSnapshotRef = useRef(null);
  const snapshotRef = useRef(null);

  /**
   * レール右クリックメニューの項目が実行された時に呼ばれる。
   * itemIdはmapEngine/contextMenuSchema.jsで定義したid(例: 'simple-operation:set-start-point')。
   * railPointはクリック位置に一番近い、対象セグメント上の点({ segId, s, x, z })。
   * 「始点を設定」「終点を設定」だけ実処理(簡易運行の始点/終点を記憶する)を行い、
   * それ以外(「点の編集」「レール情報の表示」)はまだ見た目のみ(プレースホルダー)。
   */
  function handleRailContextMenuAction(itemId, targetIds, railPoint) {
    if (itemId === 'simple-operation:set-start-point') {
      setRouteStart(railPoint ?? null);
      setRouteResult(null); // 始点/終点が変わったら前回の計算結果は無効なのでクリアする
      setRoutePath(null);   // 経路もクリア
      setSchedule(null);    // 簡易スタフも無効
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
    if (itemId === 'route-edit:add-waypoint') {
      if (!railPoint) return;
      // クリック位置が既存の経路(routeEditPath)の途中に乗っていれば、その位置に挿入する。
      // 乗っていなければ(routeEditPathがまだ無い/どのレッグにも該当しない)末尾に追加する。
      const legIndex = findInsertionLegIndex(routeEditPath, railPoint);
      const next = [...routeEditWaypoints];
      if (legIndex == null) {
        next.push(railPoint);
      } else {
        next.splice(legIndex + 1, 0, railPoint);
      }
      setRouteEditWaypoints(next);
      recomputeRouteEditPath(next);
      setRouteEditSaveStatus(null);
      setRouteEditSaveError(null);
      return;
    }
    if (itemId === 'station-edit:add-track') {
      if (!railPoint) return;
      setPendingTrackPoint(railPoint);
      return;
    }
    if (itemId === 'station-edit:set-stop-position') {
      if (!railPoint) return;
      setPendingStopPoint(railPoint);
      return;
    }
    console.log('[ContextMenu] action:', itemId, 'targets:', targetIds);
  }

  /** 始点/終点マーカーをドラッグして位置が確定した時に呼ばれる */
  function handleRoutePointDrag(role, point) {
    if (role === 'start') setRouteStart(point);
    else setRouteEnd(point);
    setRouteResult(null); // 位置が変わったら前回の計算結果・経路は無効
    setRoutePath(null);
    setSchedule(null);
    setSaveStaffStatus(null);
  }

  /**
   * 路線編集(4a/4b)のwaypoint列から、railGraph.findRailRouteをwaypoint間で順にチェインして
   * プレビュー経路を組み立てる。サーバー側server.js#buildPathの簡易なクライアント版
   * (実際の保存時にはサーバー側で真実源のwaypointsから再計算されるので、ここでの結果は
   * あくまでプレビュー・保存前バリデーション用)。
   * 各entryに、どのwaypointペア(レッグ)由来かを示す_legIndexを付与する
   * (4b: 経路上への挿入位置を逆引きするために使う)。
   * 戻り値: { path } | { error: 'UNREACHABLE', atIndex }
   */
  function computeRouteEditPath(waypoints, segs) {
    if (waypoints.length < 2) return { path: [] };
    const path = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
      const leg = findRailRoute(segs, waypoints[i], waypoints[i + 1]);
      if (!leg) return { error: 'UNREACHABLE', atIndex: i };
      for (const entry of leg) {
        path.push({ ...entry, _legIndex: i });
      }
    }
    return { path };
  }

  /**
   * railPoint(クリック位置)が、現在のrouteEditPathのどのレッグ(waypoint[i]〜[i+1]間)上に
   * 乗っているかを逆引きする。乗っていなければnull(=末尾に追加すべき、という扱いになる)。
   * 同じsegIdが複数のレッグに登場しうる(往復するレッグ等)ので、sStart/sEndのトリム範囲に
   * railPoint.sが収まるものを優先し、無ければ最初に見つかったものを使う。
   */
  function findInsertionLegIndex(path, railPoint) {
    if (!path || path.length === 0 || !railPoint) return null;
    const candidates = path.filter((entry) => entry.id === railPoint.segId);
    if (candidates.length === 0) return null;
    const withinTrim = candidates.find((entry) =>
      entry.sStart == null || (railPoint.s >= entry.sStart && railPoint.s <= entry.sEnd)
    );
    return (withinTrim ?? candidates[0])._legIndex;
  }

  /** waypoints更新後、プレビュー経路を再計算してstateに反映する共通処理 */
  function recomputeRouteEditPath(nextWaypoints) {
    if (nextWaypoints.length < 2) {
      setRouteEditPath(null);
      setRouteEditError(null);
      return;
    }
    const result = computeRouteEditPath(nextWaypoints, segments);
    if (result.error) {
      setRouteEditError(result);
      setRouteEditPath(null);
    } else {
      setRouteEditError(null);
      setRouteEditPath(result.path);
    }
  }

  /** 路線編集: 最後に追加した経由点を1つ取り消す */
  function handleRemoveLastWaypoint() {
    const next = routeEditWaypoints.slice(0, -1);
    setRouteEditWaypoints(next);
    recomputeRouteEditPath(next);
    setRouteEditSaveStatus(null);
    setRouteEditSaveError(null);
  }

  /** 路線編集: 経由点・保存状態を全てクリアする(名前・タグはRouteEditPanel内部stateなので触らない) */
  function handleClearRouteEdit() {
    setRouteEditWaypoints([]);
    setRouteEditPath(null);
    setRouteEditError(null);
    setRouteEditSaveStatus(null);
    setRouteEditSaveError(null);
  }

  /** 路線編集: 現在のwaypointsと、RouteEditPanelから渡された名前・タグでPOST /api/routesへ保存する */
  async function handleSaveRouteEdit(name, tags) {
    if (!name.trim() || routeEditWaypoints.length < 2) return;
    setRouteEditSaveStatus('saving');
    setRouteEditSaveError(null);
    try {
      const waypointsPayload = routeEditWaypoints.map((wp) => ({
        segId: wp.segId,
        s: wp.s,
        x: wp.x,
        z: wp.z,
        stationId: wp.stationId ?? null,
        trackId: wp.trackId ?? null,
      }));
      await saveRoute({ name: name.trim(), tags, waypoints: waypointsPayload });
      setRouteEditSaveStatus('saved');
    } catch (e) {
      setRouteEditSaveStatus('error');
      setRouteEditSaveError(e.message);
    }
  }

  /** 路線編集(4b): waypoints[index]に駅/番線を紐付ける(RouteEditPanel側で駅・番線の作成/選択が確定した後に呼ばれる) */
  function handleAttachStation(index, { stationId, trackId }) {
    setRouteEditWaypoints((prev) => prev.map((wp, i) => (i === index ? { ...wp, stationId, trackId } : wp)));
    setRouteEditSaveStatus(null);
    setRouteEditSaveError(null);
  }

  /** 路線編集(4b): waypoints[index]の駅紐付けを解除する(route.json側のみの変更。Station自体は消さない) */
  function handleDetachStation(index) {
    setRouteEditWaypoints((prev) => prev.map((wp, i) => (i === index ? { ...wp, stationId: null, trackId: null } : wp)));
    setRouteEditSaveStatus(null);
    setRouteEditSaveError(null);
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

  /** 簡易運行: 現在の始点/終点からrailGraphで経路を求め、/api/route-profileへ渡す */
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

  // timeSnapshotRefを常に最新に保つ(setInterval内から参照するため)
  useEffect(() => { timeSnapshotRef.current = timeSnapshot; }, [timeSnapshot]);

  // ── timeポーリング ──────────────────────────────────
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

        // 新データ受信直後は確定値 → 1秒後から(予測)に切り替え
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

    // playerポーリングから「今すぐ実行」できる関数を外部に公開
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

  // ── playerポーリング ────────────────────────────────
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

        // isServerRunning or isPaused が変化したら、5秒を待たずにtimeSnapshotを即更新
        const prev = playerStateRef.current;
        if (prev.isServerRunning !== newState.isServerRunning ||
            prev.isPaused        !== newState.isPaused) {

          setServerSnapshot(prev =>
              prev ? {
                ...prev,
                ...newState,
              } : prev
          );

          if (snapshotRef.current) {
            snapshotRef.current = {
              ...snapshotRef.current,
              ...newState,
            };
          }

          // isServerRunning=false になった瞬間、timeポーリングも即起動
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

  // ── isServerRunning=false中の予測時間自動書き戻し ──────
  // サーバーが止まっている間も補間でローカルの時計を進め続け、
  // 30秒おきにtime.jsonへ書き戻す。次回Minecraft起動時に正確な時刻を引き継ぐため。
  // (saveTimeはapi.jsからimportする想定)
  useEffect(() => {
    if (isServerRunning) return;

    const writeback = async () => {

      const snap = snapshotRef.current;
      if (!snap) return;

      const now = Date.now();

      const full = extrapolateFullDateTime(
          snap,
          now
      );

      if (!full) return;

      await saveTime({
        year: full.year,
        dayOfYear: full.dayOfYear,
        hour: full.hour,
        minute: full.minute,
        second: full.second,
      });

      // ←ここでstateは触らない

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

    // 開始時に一度保存
    writeback();

    const interval = setInterval(writeback, 5000);

    return () => clearInterval(interval);
  }, [isServerRunning]);

  // ── 時計の更新(rAF) ─────────────────────────────────
  // isExtrapolating/timeSnapshotが変わったらループを張り直す
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
              formatDateTime(current) +
              frozen +
              predict
          );
        }
      }

      frame = requestAnimationFrame(update);
    };

    frame = requestAnimationFrame(update);

    return () => cancelAnimationFrame(frame);
  }, []);

  // ── railsポーリング ─────────────────────────────────
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

  // ── trainsポーリング(5秒ごと。Minecraft未起動時はスキップ) ─────────────────
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

  // ── 駅一覧(地図上の長方形・番線枠線・停車位置アイコン表示用)。1回だけ取得し、
  // 以後はRouteEditPanel/StationEditPanel保存時のrefreshMapStations呼び出しで更新する ──
  useEffect(() => {
    refreshMapStations();
  }, []);

  // ── 車両データ(trainspecs)の取得。簡易スタフの車両選択に使う。1回だけでよい ──
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
          {/* 路線編集(4a/4b)の詳細操作パネルはmap-root側のRouteEditPanelに移設。ここでは件数だけ表示する */}
          {routeEditWaypoints.length > 0 && (
              <div className="topbar__status">
                路線編集: 経由点{routeEditWaypoints.length}点
                {routeEditError && <span style={{ color: 'var(--red)', marginLeft: 6 }}>✗未接続あり</span>}
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
          {/* 列車への適用パネル: スタフが保存済みで列車が1両以上ワールドにいる場合に表示 */}
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
            <button
                className={`mode-btn${showStationEditPanel ? ' is-active' : ''}`}
                onClick={() => setShowStationEditPanel((v) => !v)}
            >
              🚉 駅管理
            </button>
          </div>
        </header>

        <main className="map-root">
          <Map2D
              segments={segments}
              player={player}
              selectedIds={selectedIds}
              routePath={routePath}
              routeEditPath={routeEditPath}
              routeWaypoints={routeEditWaypoints}
              stations={mapStations}
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
          {routeEditWaypoints.length > 0 && (
              <RouteEditPanel
                  waypoints={routeEditWaypoints}
                  error={routeEditError}
                  saveStatus={routeEditSaveStatus}
                  saveError={routeEditSaveError}
                  onRemoveLast={handleRemoveLastWaypoint}
                  onClear={handleClearRouteEdit}
                  onSave={handleSaveRouteEdit}
                  onAttach={handleAttachStation}
                  onDetach={handleDetachStation}
                  onStationsChanged={refreshMapStations}
              />
          )}
          {showStationEditPanel && (
              <StationEditPanel
                  trainSpecs={trainSpecs}
                  pendingTrackPoint={pendingTrackPoint}
                  onConsumeTrackPoint={() => setPendingTrackPoint(null)}
                  pendingStopPoint={pendingStopPoint}
                  onConsumeStopPoint={() => setPendingStopPoint(null)}
                  onClose={() => setShowStationEditPanel(false)}
                  onStationsChanged={refreshMapStations}
              />
          )}
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