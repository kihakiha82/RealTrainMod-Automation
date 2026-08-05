import { useEffect, useRef, useState, useCallback } from 'react';
import Map2D from './components/Map2D';
import TimeEditPanel from './components/windows/TimeEditPanel.jsx';
import RouteEditPanel from './components/windows/RouteEditPanel.jsx';
import StationEditPanel from './components/windows/StationEditPanel.jsx';
import { fetchRails, fetchPlayerPosition, fetchTime, saveTime, fetchRouteProfile, fetchTrainSpecs,  fetchTrainAssignments, saveRoute, fetchStations, fetchRoutes, deleteRoute, fetchLines, saveLine, deleteLine, fetchDiagrams, fetchDiagram, saveDiagram, deleteDiagram } from './api';
import { extrapolateTime, extrapolateFullDateTime, formatDateTime } from './timeUtils';
import { findRailRoute } from './mapEngine/railGraph';
import SimpleStaffPanel from "./components/windows/SimpleStaffPanel.jsx";
import TimetableEditPanel from "./components/windows/TimetableEditPanel.jsx";
import RouteManagerPanel from "./components/windows/RouteManagerPanel.jsx";
import LineEditPanel from "./components/windows/LineEditPanel.jsx";
import LineManagerPanel from "./components/windows/LineManagerPanel.jsx";
import DiagramEditPanel from "./components/windows/DiagramEditPanel.jsx";
import DiagramManagerPanel from "./components/windows/DiagramManagerPanel.jsx";
import {TimetablePanel} from "./components/windows/TimetablePanel.jsx";
import { deriveStationSlots } from './routeStationSlots.js';

export default function App() {
  const [segments,       setSegments]       = useState([]);
  const [player,         setPlayer]         = useState(null);
  const [isServerRunning,setIsServerRunning]= useState(false);
  const [status,         setStatus]         = useState('接続待機中...');
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

  // 系統編集(再編集対応)。RouteManagerPanel(一覧・新規作成・削除の入口)と、
  // RouteEditPanel(名前/タグ/経由点の実編集)を繋ぐstate。
  const [routesList,        setRoutesList]        = useState([]);
  const [routesLoading,     setRoutesLoading]      = useState(false);
  const [routesLoadError,   setRoutesLoadError]    = useState(null);
  const [editingRouteId,    setEditingRouteId]     = useState(null);
  const [routeEditName,     setRouteEditName]      = useState('');
  const [routeEditTagsInput,setRouteEditTagsInput] = useState('');

  // trueの間だけRouteEditPanelを表示し、地図上での経由点追加(右クリック「経由点として追加」/
  // 駅境界点マーカーのクリック)を有効にする。RouteManagerPanelの「新規作成」/「編集」を
  // 押すとtrueになり、「クリア」(=編集セッションを閉じる)でfalseに戻る。
  const [isRouteEditActive, setIsRouteEditActive] = useState(false);

  // 路線(Line)編集(再編集対応)。系統と同じ「Manager(一覧)+Editor(実編集)」の2枚構成だが、
  // 路線は地図クリックでの経路構築が不要なため、isRouteEditActiveに相当する「セッション
  // 開始/終了」の概念自体は同じくisLineEditActiveで持つ(新規作成/編集を押すとtrue、
  // クリアでfalse)。
  const [linesList,        setLinesList]        = useState([]);
  const [linesLoading,     setLinesLoading]     = useState(false);
  const [linesLoadError,   setLinesLoadError]   = useState(null);
  const [editingLineId,    setEditingLineId]    = useState(null);
  const [lineEditName,     setLineEditName]     = useState('');
  const [lineEditTagsInput,setLineEditTagsInput]= useState('');
  const [lineEditColor,    setLineEditColor]    = useState('#e8a33d');
  const [lineEditStationIds, setLineEditStationIds] = useState([]);
  const [lineEditSaveStatus, setLineEditSaveStatus] = useState(null);
  const [lineEditSaveError,  setLineEditSaveError]  = useState(null);
  const [isLineEditActive, setIsLineEditActive] = useState(false);
  const [showLineManager,  setShowLineManager]  = useState(false);

  async function refreshLinesList() {
    setLinesLoading(true);
    setLinesLoadError(null);
    try {
      setLinesList(await fetchLines());
    } catch (e) {
      setLinesLoadError(e.message);
    } finally {
      setLinesLoading(false);
    }
  }

  /** 路線編集: 名前・タグ・色・駅リスト・再編集中idを全てクリアし、編集セッションを終了する */
  function handleClearLineEdit() {
    setEditingLineId(null);
    setLineEditName('');
    setLineEditTagsInput('');
    setLineEditColor('#e8a33d');
    setLineEditStationIds([]);
    setLineEditSaveStatus(null);
    setLineEditSaveError(null);
    setIsLineEditActive(false);
  }

  /** LineManagerPanelの「新規作成」から呼ばれる */
  function handleStartNewLine() {
    handleClearLineEdit();
    setIsLineEditActive(true);
  }

  /** LineManagerPanelの「編集」から呼ばれる */
  function handleLoadLineForEdit(line) {
    setEditingLineId(line.id);
    setLineEditName(line.name ?? '');
    setLineEditTagsInput((line.tags ?? []).join(', '));
    setLineEditColor(line.color ?? '#e8a33d');
    setLineEditStationIds([...(line.stationIds ?? [])]);
    setLineEditSaveStatus(null);
    setLineEditSaveError(null);
    setIsLineEditActive(true);
    bringToFront('lineEditor');
  }

  /** LineManagerPanelの「削除」から呼ばれる。路線は他から参照されないため確認なしで削除できる */
  async function handleDeleteLineFromManager(id) {
    await deleteLine(id);
    if (id === editingLineId) {
      handleClearLineEdit();
    }
    await refreshLinesList();
  }

  function handleAddLineStation(stationId) {
    setLineEditStationIds((prev) => [...prev, stationId]);
    setLineEditSaveStatus(null);
  }

  function handleRemoveLineStationAt(index) {
    setLineEditStationIds((prev) => prev.filter((_, i) => i !== index));
    setLineEditSaveStatus(null);
  }

  function handleMoveLineStation(index, direction) {
    setLineEditStationIds((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
    setLineEditSaveStatus(null);
  }

  /** 路線編集: editingLineIdがあればbodyにidを含めてupsert(=既存を上書き更新)にする */
  async function handleSaveLineEdit() {
    if (!lineEditName.trim()) return;
    setLineEditSaveStatus('saving');
    setLineEditSaveError(null);
    try {
      const tags = lineEditTagsInput.split(',').map((t) => t.trim()).filter(Boolean);
      const saved = await saveLine({
        id: editingLineId ?? undefined,
        name: lineEditName.trim(),
        tags,
        color: lineEditColor,
        stationIds: lineEditStationIds,
      });
      setEditingLineId(saved.id);
      setLineEditSaveStatus('saved');
      await refreshLinesList();
    } catch (e) {
      setLineEditSaveStatus('error');
      setLineEditSaveError(e.message);
    }
  }

  // ダイヤ(Diagram、複数列車ダイヤ)編集(再編集対応)。Line/Routeと全く同じ
  // 「Manager(一覧)+ Editor(実編集)」構成。DiagramはtimetableName参照の束ねなので、
  // trainRefsは{ id, timetableName, direction }の配列としてそのまま状態に持つ。
  const [diagramsList,        setDiagramsList]        = useState([]);
  const [diagramsLoading,     setDiagramsLoading]     = useState(false);
  const [diagramsLoadError,   setDiagramsLoadError]   = useState(null);
  const [editingDiagramId,    setEditingDiagramId]    = useState(null);
  const [diagramEditName,     setDiagramEditName]     = useState('');
  const [diagramEditTagsInput,setDiagramEditTagsInput]= useState('');
  const [diagramEditLineId,   setDiagramEditLineId]   = useState(null);
  const [diagramEditTrainRefs, setDiagramEditTrainRefs] = useState([]);
  const [diagramEditSaveStatus, setDiagramEditSaveStatus] = useState(null);
  const [diagramEditSaveError,  setDiagramEditSaveError]  = useState(null);
  const [diagramEditLoadError,  setDiagramEditLoadError]  = useState(null); // 詳細読込(fetchDiagram)失敗時
  const [isDiagramEditActive, setIsDiagramEditActive] = useState(false);
  const [showDiagramManager,  setShowDiagramManager]  = useState(false);

  async function refreshDiagramsList() {
    setDiagramsLoading(true);
    setDiagramsLoadError(null);
    try {
      setDiagramsList(await fetchDiagrams());
    } catch (e) {
      setDiagramsLoadError(e.message);
    } finally {
      setDiagramsLoading(false);
    }
  }

  /** ダイヤ編集: 全stateをクリアし、編集セッションを終了する */
  function handleClearDiagramEdit() {
    setEditingDiagramId(null);
    setDiagramEditName('');
    setDiagramEditTagsInput('');
    setDiagramEditLineId(null);
    setDiagramEditTrainRefs([]);
    setDiagramEditSaveStatus(null);
    setDiagramEditSaveError(null);
    setDiagramEditLoadError(null);
    setIsDiagramEditActive(false);
  }

  /** DiagramManagerPanelの「新規作成」から呼ばれる */
  function handleStartNewDiagram() {
    handleClearDiagramEdit();
    setIsDiagramEditActive(true);
  }

  /**
   * DiagramManagerPanelの「編集」から呼ばれる。一覧のdiagramはメタデータのみ
   * (trainRefsを含まない)なので、詳細をfetchDiagram(id)で取得し直す。
   */
  async function handleLoadDiagramForEdit(diagramMeta) {
    setDiagramEditLoadError(null);
    try {
      const diagram = await fetchDiagram(diagramMeta.id);
      setEditingDiagramId(diagram.id);
      setDiagramEditName(diagram.name ?? '');
      setDiagramEditTagsInput((diagram.tags ?? []).join(', '));
      setDiagramEditLineId(diagram.lineId ?? null);
      setDiagramEditTrainRefs([...(diagram.trainRefs ?? [])]);
      setDiagramEditSaveStatus(null);
      setDiagramEditSaveError(null);
      setIsDiagramEditActive(true);
      bringToFront('diagramEditor');
    } catch (e) {
      setDiagramEditLoadError(e.message);
    }
  }

  /** DiagramManagerPanelの「削除」から呼ばれる。ダイヤは他から参照されないため確認なしで削除できる */
  async function handleDeleteDiagramFromManager(id) {
    await deleteDiagram(id);
    if (id === editingDiagramId) {
      handleClearDiagramEdit();
    }
    await refreshDiagramsList();
  }

  function handleAddDiagramTrainRef(timetableName) {
    setDiagramEditTrainRefs((prev) => [...prev, { id: null, timetableName, direction: null }]);
    setDiagramEditSaveStatus(null);
  }

  function handleRemoveDiagramTrainRefAt(index) {
    setDiagramEditTrainRefs((prev) => prev.filter((_, i) => i !== index));
    setDiagramEditSaveStatus(null);
  }

  function handleMoveDiagramTrainRef(index, direction) {
    setDiagramEditTrainRefs((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
    setDiagramEditSaveStatus(null);
  }

  function handleDiagramTrainRefDirectionChange(index, direction) {
    setDiagramEditTrainRefs((prev) => prev.map((r, i) => (i === index ? { ...r, direction } : r)));
    setDiagramEditSaveStatus(null);
  }

  /** ダイヤ編集: editingDiagramIdがあればbodyにidを含めてupsert(=既存を上書き更新)にする */
  async function handleSaveDiagramEdit() {
    if (!diagramEditName.trim()) return;
    setDiagramEditSaveStatus('saving');
    setDiagramEditSaveError(null);
    try {
      const tags = diagramEditTagsInput.split(',').map((t) => t.trim()).filter(Boolean);
      const saved = await saveDiagram({
        id: editingDiagramId ?? undefined,
        name: diagramEditName.trim(),
        tags,
        lineId: diagramEditLineId,
        trainRefs: diagramEditTrainRefs.map((r) => ({
          id: r.id ?? undefined,
          timetableName: r.timetableName,
          direction: r.direction ?? null,
        })),
      });
      setEditingDiagramId(saved.id);
      // サーバーが発行したtrainRefsのid(新規追加分)を反映しておく
      // (再度保存した時に同じ列車が重複追加されるのを防ぐ)。
      setDiagramEditTrainRefs([...(saved.trainRefs ?? [])]);
      setDiagramEditSaveStatus('saved');
      await refreshDiagramsList();
    } catch (e) {
      setDiagramEditSaveStatus('error');
      setDiagramEditSaveError(e.message);
    }
  }

  async function refreshRoutesList() {
    setRoutesLoading(true);
    setRoutesLoadError(null);
    try {
      setRoutesList(await fetchRoutes());
    } catch (e) {
      setRoutesLoadError(e.message);
    } finally {
      setRoutesLoading(false);
    }
  }

  // 駅管理パネル(5章/4c)。右クリック「駅編集」カテゴリで拾ったrailPointを
  // StationEditPanelへpropsとして橋渡しするためのstate。
  const [showStationEditPanel, setShowStationEditPanel] = useState(false);
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

  const snapshotRef = useRef(null);

  //window関連
  const [showTimeEditor, setShowTimeEditor] = useState(false);
  const [showRouteEditPanel, setShowRouteEditPanel] = useState(false);
  const [showStationEditor, setShowStationEditor] = useState(false);
  const [showSimpleStaffPanel, setShowSimpleStaffPanel] = useState(false);
  const [showTimetableEditor, setShowTimetableEditor] = useState(false);
  const [showRouteManager,  setShowRouteManager]   = useState(false);

  const [nextZIndex, setNextZIndex] = useState(150);

  const [windowZIndices, setWindowZIndices] = useState({
    timeEditor: 100,
    routePanel: 100,
    routeManager: 100,
    stationPanel: 100,
    simpleStaffPanel: 100,
    timetableEditor: 100,
    lineManager: 100,
    lineEditor: 100,
    diagramManager: 100,
    diagramEditor: 100,
  });

  //windowを最前面に持ってくる
  const bringToFront = (windowName) => {
    setNextZIndex(prev => {
      const next = prev + 1;
      setWindowZIndices(p => ({ ...p, [windowName]: next }));
      return next;
    });
  };

  //サイドパネル関連
  const [leftWidth, setLeftWidth] = useState(250);
  const isDraggingRef = useRef(false);

  const [showCommentEditor, setShowCommentEditor] = useState(false);

  function closeAllPanels() {
    setShowCommentEditor(false);

  }

  const handleMouseDown = useCallback(() => {
    isDraggingRef.current = true;
    document.body.style.cursor = 'col-resize'; // カーソルをリサイズ用に変更

    // ウィンドウ全体でイベントをリッスンする
    const handleMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      // 最小100px、最大500pxの範囲でリサイズ
      const newWidth = Math.max(100, Math.min(e.clientX, 500));
      setLeftWidth(newWidth);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = 'default';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, []);
  //現在の右画面表示
  const [activeView, setActiveView] = useState('map');

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
      if (!railPoint || !isRouteEditActive) return;
      // クリック位置が、いずれかの駅の境界点と座標的に一致するかを自動判定する
      // (4番: 系統のwaypointはtrackIdを持たず、境界点への一致だけで駅と紐付く)。
      const matchedStationId = findMatchingBoundaryStationId(railPoint);
      addRouteEditWaypoint(railPoint, matchedStationId);
      return;
    }
    if (itemId === 'station-edit:set-stop-position') {
      if (!railPoint) return;
      setPendingStopPoint(railPoint);
      return;
    }
    console.log('[ContextMenu] action:', itemId, 'targets:', targetIds);
  }

  /**
   * 路線編集の経由点リストに1点を追加(または既存プレビュー経路の途中に挿入)する共通処理。
   * 右クリック「経由点として追加」(座標一致でstationIdを判定する必要がある)と、
   * 駅の境界点マーカーのクリック(handleBoundaryMarkerClick。stationIdは既に確定済み)の
   * 両方から呼ばれる。
   */
  function addRouteEditWaypoint(railPoint, stationId) {
    // クリック位置が既存の経路(routeEditPath)の途中に乗っていれば、その位置に挿入する。
    // 乗っていなければ(routeEditPathがまだ無い/どのレッグにも該当しない)末尾に追加する。
    const legIndex = findInsertionLegIndex(routeEditPath, railPoint);
    const newWaypoint = { segId: railPoint.segId, s: railPoint.s, x: railPoint.x, z: railPoint.z, stationId: stationId ?? null };
    const next = [...routeEditWaypoints];
    if (legIndex == null) {
      next.push(newWaypoint);
    } else {
      next.splice(legIndex + 1, 0, newWaypoint);
    }
    setRouteEditWaypoints(next);
    recomputeRouteEditPath(next);
    setRouteEditSaveStatus(null);
    setRouteEditSaveError(null);
  }

  /**
   * 駅の境界点マーカー(map2dController.js#drawBoundaryMarkers)をクリックした時に呼ばれる
   * (再設計仕様書3.1.2節)。マーカー由来のrailPointは、境界点の座標そのものから
   * segId/s/stationIdが既に確定した状態で渡ってくるので、右クリック「経由点として追加」と
   * 同じ挿入ロジック(addRouteEditWaypoint)にそのまま渡せる
   * (findMatchingBoundaryStationIdによる座標一致判定は不要)。
   */
  function handleBoundaryMarkerClick(railPoint) {
    if (!railPoint || !isRouteEditActive) return;
    addRouteEditWaypoint(railPoint, railPoint.stationId ?? null);
  }

  /**
   * クリック位置(railPoint: {segId, s})が、mapStations(地図表示用に取得済みの駅一覧)の
   * いずれかの境界点と座標的に一致するかを判定する。一致すればその駅のidを返す
   * (4番: 系統のwaypointは境界点との一致だけで駅と自動的に紐づく。サーバー側の
   * findMatchingBoundaryと同じロジック・同じ許容誤差)。
   */
  function findMatchingBoundaryStationId(railPoint) {
    const EPS = 1e-3;
    for (const station of mapStations) {
      for (const boundary of station.boundaryPoints ?? []) {
        for (const se of boundary.segmentEnds ?? []) {
          if (se.segmentId !== railPoint.segId) continue;
          const seg = segments.find((s) => s.id === railPoint.segId);
          if (!seg) continue;
          const expectedS = se.end === 'start' ? 0 : (seg.length ?? 0);
          if (Math.abs(railPoint.s - expectedS) <= EPS) {
            return station.id;
          }
        }
      }
    }
    return null;
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

  /** 路線編集: 指定indexの経由点を1つ削除する(最後尾に限らず、途中の点も削除できる) */
  function handleRemoveWaypointAt(index) {
    const next = routeEditWaypoints.filter((_, i) => i !== index);
    setRouteEditWaypoints(next);
    recomputeRouteEditPath(next);
    setRouteEditSaveStatus(null);
    setRouteEditSaveError(null);
  }

  /** 路線編集: 経由点の並び順を1つ前(direction=-1)/後(direction=+1)に入れ替える */
  function handleMoveWaypoint(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= routeEditWaypoints.length) return;
    const next = [...routeEditWaypoints];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setRouteEditWaypoints(next);
    recomputeRouteEditPath(next);
    setRouteEditSaveStatus(null);
    setRouteEditSaveError(null);
  }

  /**
   * 路線編集: 経由点・保存状態・名前/タグ・再編集中idを全てクリアし、編集セッション自体を
   * 終了する(isRouteEditActive=false → RouteEditPanelが閉じ、地図上での経由点追加も
   * 再び無効になる)。「クリア」(RouteEditPanelの❌/クリアボタン)から呼ばれる。
   */
  function handleClearRouteEdit() {
    setRouteEditWaypoints([]);
    setRouteEditPath(null);
    setRouteEditError(null);
    setRouteEditSaveStatus(null);
    setRouteEditSaveError(null);
    setEditingRouteId(null);
    setRouteEditName('');
    setRouteEditTagsInput('');
    setIsRouteEditActive(false);
  }

  /**
   * 系統管理パネル(RouteManagerPanel)の「新規作成」ボタンから呼ばれる。
   * 編集セッションを白紙に戻した上で、今度はisRouteEditActiveをtrueにし、
   * 経由点0点の状態でRouteEditPanelを開く(地図上での経由点追加もここから有効になる)。
   */
  function handleStartNewRoute() {
    handleClearRouteEdit();
    setIsRouteEditActive(true);
    bringToFront('routePanel');
  }

  /**
   * 系統管理パネル(RouteManagerPanel)の「編集」ボタンから呼ばれる。
   * 既存系統のwaypointsを路線編集state(routeEditWaypoints)へ読み込み、
   * 名前・タグも復元した上でeditingRouteIdをセットする。
   * これにより既存のRouteEditPanel(isRouteEditActiveで表示)がそのまま
   * 「再編集モード」として機能する。
   */
  function handleLoadRouteForEdit(route) {
    const waypoints = (route.waypoints ?? []).map((wp) => ({
      segId: wp.segId,
      s: wp.s,
      x: wp.x,
      z: wp.z,
      stationId: wp.stationId ?? null,
    }));
    setRouteEditWaypoints(waypoints);
    recomputeRouteEditPath(waypoints);
    setEditingRouteId(route.id);
    setRouteEditName(route.name ?? '');
    setRouteEditTagsInput((route.tags ?? []).join(', '));
    setRouteEditSaveStatus(null);
    setRouteEditSaveError(null);
    setIsRouteEditActive(true);
    bringToFront('routePanel');
  }

  // 系統ツリーの「下り時刻表」表示用。TimetablePanel(OuDiaSecond風の見た目のみ、
  // 列車データはまだ空)を系統ごとに開けるようにする。同じ系統を複数回開いても
  // 増えないよう、系統id+方向をkeyにして管理する(上りは追記1のとおり今は未対応)。
  // { key, routeId, routeName, stations }[]
  const [openTimetablePanels, setOpenTimetablePanels] = useState([]);

  /**
   * 系統(Route)のwaypointsから、TimetablePanelが要求する形の駅リスト
   * ({ id, name, hasTrack, hasDep, hasArr }[])を、系統に含まれる駅の順序どおりに作る。
   * 列車データがまだ無いため着発パターンは仮の規則: 始発駅は発のみ、終着駅は着のみ、
   * 中間駅は着発両方(番線は今回のスコープ外なのでhasTrack=falseで統一)。
   */
  function getRouteStationsForTimetable(route) {
    const slots = deriveStationSlots(route.waypoints);
    return slots.map((slot) => {
      const station = mapStations.find((s) => s.id === slot.stationId);
      return {
        id: slot.stationId,
        name: station?.name ?? '(不明な駅)',
        hasTrack: false,
        hasArr: slot.kind !== 'origin',
        hasDep: slot.kind !== 'terminal',
      };
    });
  }

  /** 系統ツリーの「下り時刻表」クリックから呼ばれる。既に開いていれば前面に出すだけ */
  function handleOpenDownTimetable(route) {
    const key = `timetable_${route.id}_kudari`;
    setOpenTimetablePanels((prev) => {
      if (prev.some((p) => p.key === key)) return prev;
      return [...prev, {
        key,
        routeId: route.id,
        routeName: route.name,
        stations: getRouteStationsForTimetable(route),
      }];
    });
    bringToFront(key);
  }

  function handleCloseTimetablePanel(key) {
    setOpenTimetablePanels((prev) => prev.filter((p) => p.key !== key));
  }

  /**
   * 系統管理パネルの「削除」ボタンから呼ばれる。deleteRoute()の結果(409競合の場合は
   * { conflict: true, referencingTimetables }、成功時は{ conflict: false, ... })を
   * そのまま呼び出し元(RouteManagerPanel)に返し、競合時のUI(強制削除の確認)は
   * RouteManagerPanel側の責務とする(StationEditPanelのdeleteConflict stateと同じ形)。
   * 編集中だった系統が実際に削除された場合は、編集stateもクリアする。
   */
  async function handleDeleteRouteFromManager(id, { force = false } = {}) {
    const result = await deleteRoute(id, { force });
    if (result.conflict) return result;
    if (id === editingRouteId) {
      handleClearRouteEdit();
    }
    await refreshRoutesList();
    return result;
  }

  /**
   * 路線編集: 現在のwaypointsと、RouteEditPanelから渡された名前・タグでPOST /api/routesへ保存する。
   * editingRouteIdがセットされていれば、そのidをbodyに含めてupsert(=既存を上書き更新)にする。
   * 保存が成功したら、返ってきたidをeditingRouteIdへ反映する(新規作成直後でも、以降の
   * 「保存」ボタンは同じ系統の更新になり、押すたびに重複作成されることを防ぐ)。
   */
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
      }));
      const saved = await saveRoute({
        id: editingRouteId ?? undefined,
        name: name.trim(),
        tags,
        waypoints: waypointsPayload,
      });
      setEditingRouteId(saved.id);
      setRouteEditSaveStatus('saved');
      await refreshRoutesList();
    } catch (e) {
      setRouteEditSaveStatus('error');
      setRouteEditSaveError(e.message);
    }
  }

  /**
   * 路線編集(4番再設計): waypoints[index]の駅紐付けを手動で解除する。
   * 通常は境界点との座標一致で自動的に紐付く/外れるが、コード上の座標一致が
   * 意図と異なる場合(隣接駅の境界点にたまたま近い等)の手動オーバーライドとして残す。
   */
  function handleDetachStation(index) {
    setRouteEditWaypoints((prev) => prev.map((wp, i) => (i === index ? { ...wp, stationId: null } : wp)));
    setRouteEditSaveStatus(null);
    setRouteEditSaveError(null);
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


  // ── timeポーリング ──────────────────────────────────
  useEffect(() => {
    let timer;
    let cancelled = false;

    const poll = async () => {
      try {
        // ★追加: サーバー停止中で、すでに時計の基準(snapshot)を持っているなら、
        // 自分がsaveTimeした粗いデータを読み込んで上書きしてしまうのを防ぐためスキップ。
        if (!playerStateRef.current.isServerRunning && snapshotRef.current) {
          // 何もしない（表示は現在持っているsnapshotRefを基準になめらかに進み続ける）
        } else {
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
        }
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
  // 5秒おきにtime.jsonへ書き戻す。次回Minecraft起動時に正確な時刻を引き継ぐため。
  // (saveTimeはapi.jsからimportする想定)
  useEffect(() => {
    if (isServerRunning) return;

    const writeback = async () => {
      const snap = snapshotRef.current;
      if (!snap) return;

      const now = Date.now();
      const full = extrapolateFullDateTime(snap, now);

      if (!full) return;

      try {
        await saveTime({
          year: full.year,
          dayOfYear: full.dayOfYear,
          hour: full.hour,
          minute: full.minute,
          second: full.second,
        });
      } catch (e) {
        console.warn('バックグラウンドでの時刻保存に失敗しました', e);
      }

      // 【削除】ここで snapshotRef.current を上書きしていた処理を丸ごと消します。
      // 表示用の requestAnimationFrame は、最初に取得した snapshotRef を
      // 基準にミリ秒単位で計算し続けるため、これで完全に滑らかに繋がります。
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
        const current = extrapolateFullDateTime(snap, Date.now());

        if (current) {
          const frozen = current.frozen ? " ⏸" : "";
          const predict = !current.frozen ? " (予測)" : "";

          //年と通日(dayOfYear)から「月・日・曜日」を算出する
          const dateObj = new Date();

          dateObj.setFullYear(current.year, 0, current.dayOfYear);

          const y = String(dateObj.getFullYear()).padStart(4, '0');
          const m = String(dateObj.getMonth() + 1).padStart(2, '0');
          const d = String(dateObj.getDate()).padStart(2, '0');
          const week = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];

          const dateString = `${y}年${m}月${d}日(${week}) `;

          setClockText(
              dateString + formatDateTime(current) + frozen + predict
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



  // ── 駅一覧(地図上の長方形・番線枠線・停車位置アイコン表示用)。1回だけ取得し、
  // 以後はRouteEditPanel/StationEditPanel保存時のrefreshMapStations呼び出しで更新する ──
  useEffect(() => {
    refreshMapStations();
  }, []);

  // ── 系統(Route)一覧(系統編集パネルの一覧表示用)。1回だけ取得し、
  // 以後は保存・削除のたびにrefreshRoutesList呼び出しで更新する ──
  useEffect(() => {
    refreshRoutesList();
  }, []);

  // ── 路線(Line)一覧(路線編集パネルの一覧表示用)。1回だけ取得し、
  // 以後は保存・削除のたびにrefreshLinesList呼び出しで更新する ──
  useEffect(() => {
    refreshLinesList();
  }, []);

  // ── ダイヤ(Diagram)一覧(ダイヤ管理パネルの一覧表示用)。1回だけ取得し、
  // 以後は保存・削除のたびにrefreshDiagramsList呼び出しで更新する ──
  useEffect(() => {
    refreshDiagramsList();
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

        // assignments の初期読み込みもここで行うと良い
        const assignData = await fetchTrainAssignments();
        if (!cancelled) setAssignments(assignData);
      } catch (e) {
        console.warn('データの取得に失敗しました', e);
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

          {/* 路線編集(4a/4b)の詳細操作パネルはmap-root側のRouteEditPanelに移設。ここでは件数だけ表示する */}
          {routeEditWaypoints.length > 0 && (
              <div className="topbar__status">
                路線編集: 経由点{routeEditWaypoints.length}点
                {routeEditError && <span style={{ color: 'var(--red)', marginLeft: 6 }}>✗未接続あり</span>}
              </div>
          )}


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

            <button
                className={`mode-btn${showSimpleStaffPanel ? ' is-active' : ''}`}
                onClick={() => setShowSimpleStaffPanel((v) => !v)}
            >
              簡易運行
            </button>

            <button
                className={`mode-btn${showTimeEditor ? ' is-active' : ''}`}
                onClick={() => setShowTimeEditor((v) => !v)}
            >
              起動前時刻の変更
            </button>

            <button
                className={`mode-btn${showTimetableEditor ? ' is-active' : ''}`}
                onClick={() => setShowTimetableEditor((v) => !v)}
            >
              🕐 時刻表
            </button>

            <button
                className={`mode-btn${showRouteManager ? ' is-active' : ''}`}
                onClick={() => setShowRouteManager((v) => !v)}
            >
              🛤 系統編集
            </button>

            <button
                className={`mode-btn${showLineManager ? ' is-active' : ''}`}
                onClick={() => setShowLineManager((v) => !v)}
            >
              🚋 路線編集
            </button>

            <button
                className={`mode-btn${showDiagramManager ? ' is-active' : ''}`}
                onClick={() => setShowDiagramManager((v) => !v)}
            >
              📊 ダイヤ管理
            </button>
          </div>
        </header>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div className="side-panel" style={{ width: leftWidth }}>
            <div className="tree-panel">
              <div
                  className={`tree-item ${activeView === 'map' ? 'is-selected' : ''}`}
                  onClick={() => {
                    closeAllPanels()
                    setActiveView('map')
                  }
                  }
              >
                <span className="tree-icon">📍</span> 路線図
              </div>
              <details open>
                <summary><span className="tree-icon">🛤️</span> 系統</summary>
                <div className="tree-children">
                  <div
                      className={`tree-item ${activeView === 'route' ? 'is-selected' : ''}`}
                      onClick={() => setShowRouteManager((v) => !v)}
                  >
                    <span className="tree-icon" style={{ color: 'greenyellow' }}>Ra</span> 系統一覧
                  </div>
                  {routesList.map((route) => (
                      <details key={route.id} open>
                        <summary
                            className={`tree-item ${editingRouteId === route.id ? 'is-selected' : ''}`}
                            title={route.name}
                        >
                          <span className="tree-icon" style={{ color: 'greenyellow' }}>R</span> {route.name}
                        </summary>
                        <div className="tree-children">
                          <div className="tree-item" onClick={() => handleLoadRouteForEdit(route)}><span className="tree-icon">✏️</span> 系統の編集</div>
                          <div className="tree-item" onClick={() => handleOpenDownTimetable(route)}><span className="tree-icon">🕒</span> 下り時刻表</div>
                          <div className="tree-item"><span className="tree-icon">🕒</span> 上り時刻表</div>
                          <div className="tree-item"><span className="tree-icon">📉</span> ダイヤグラム</div>
                          <div className="tree-item"><span className="tree-icon">🕒</span> 下りカスタマイズ時刻表</div>
                          <div className="tree-item"><span className="tree-icon">🕒</span> 上りカスタマイズ時刻表</div>
                          <div className="tree-item"><span className="tree-icon">🚉</span> 駅時刻表</div>
                          <div className="tree-item"><span className="tree-icon">📋</span> 運用一覧表</div>
                        </div>
                      </details>
                  ))}
                </div>

              </details>
              <details open>
                <summary><span className="tree-icon">📁</span> 路線</summary>
                <div className="tree-children">
                  <div className="tree-item"><span className="tree-icon">🚉</span> 駅</div>
                  <div className="tree-item"><span className="tree-icon">🚆</span> 列車種別</div>
                </div>
              </details>

              <details open>
                <summary><span className="tree-icon">📅</span> ダイヤ</summary>
                <div className="tree-children">
                  <details open>
                    <summary><span className="tree-icon">📄</span> 砂野線</summary>
                    <div className="tree-children">
                      <div className="tree-item"><span className="tree-icon">🕒</span> 下り時刻表</div>
                      <div className="tree-item"><span className="tree-icon">🕒</span> 上り時刻表</div>
                      <div className="tree-item"><span className="tree-icon">📉</span> ダイヤグラム</div>
                      <div className="tree-item"><span className="tree-icon">🕒</span> 下りカスタマイズ時刻表</div>
                      <div className="tree-item"><span className="tree-icon">🕒</span> 上りカスタマイズ時刻表</div>
                      <div className="tree-item"><span className="tree-icon">🚉</span> 駅時刻表</div>
                      <div className="tree-item"><span className="tree-icon">📋</span> 運用一覧表</div>
                    </div>
                  </details>
                </div>
              </details>

              <div
                  className={`tree-item ${activeView === 'comment' ? 'is-selected' : ''}`}
                  onClick={() => {
                    closeAllPanels()
                    setShowCommentEditor(true)
                    setActiveView('comment')
                  }
                  }
              >
                <span className="tree-icon">💬</span> コメント
              </div>
            </div>
          </div>

          <div className="resizer" onMouseDown={handleMouseDown} />

          <main className="screen" style={{ position: 'relative' }}>
            <div className="map-root">
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
                  onBoundaryPointClick={handleBoundaryMarkerClick}
                  routeEditActive={isRouteEditActive}
                  ref={mapRef}
              />
            </div>


            {showCommentEditor && (
                <div className="null-root" style={{position: 'absolute'}}>
                  まだ何もありません
                  <div>
                    駅を作る<br/>
                    系統を作る<br/>
                    時刻表を作る
                  </div>
                </div>
            )}



            {showTimeEditor && (
                <TimeEditPanel
                    snapshot={serverSnapshot}
                    onSaved={async () => {
                      try {
                        const timeData = await fetchTime();
                        const snap = { ...timeData, ...playerStateRef.current, fetchedAtMs: Date.now() };
                        setServerSnapshot(snap);     // 既存のpoll()と同じ更新の仕方に揃える
                        snapshotRef.current = snap;  // ← これが抜けていたのが直接の原因
                        setIsExtrapolating(false);
                      } catch { /* 次の5秒ポーリングで更新される */ }
                    }}
                    isServerRunning={isServerRunning}
                    onClose={() => setShowTimeEditor(false)}
                    zIndex={windowZIndices.timeEditor}
                    onFocus={() => bringToFront('timeEditor')}
                />
            )}
            {showRouteManager && (
                <RouteManagerPanel
                    routes={routesList}
                    editingRouteId={editingRouteId}
                    isLoading={routesLoading}
                    loadError={routesLoadError}
                    onRefresh={refreshRoutesList}
                    onNew={handleStartNewRoute}
                    onEdit={handleLoadRouteForEdit}
                    onDelete={handleDeleteRouteFromManager}
                    onClose={() => setShowRouteManager(false)}
                    zIndex={windowZIndices.routeManager}
                    onFocus={() => bringToFront('routeManager')}
                />
            )}
            {showLineManager && (
                <LineManagerPanel
                    lines={linesList}
                    editingLineId={editingLineId}
                    isLoading={linesLoading}
                    loadError={linesLoadError}
                    onRefresh={refreshLinesList}
                    onNew={handleStartNewLine}
                    onEdit={handleLoadLineForEdit}
                    onDelete={handleDeleteLineFromManager}
                    onClose={() => setShowLineManager(false)}
                    zIndex={windowZIndices.lineManager}
                    onFocus={() => bringToFront('lineManager')}
                />
            )}
            {isLineEditActive && (
                <LineEditPanel
                    stations={mapStations}
                    stationIds={lineEditStationIds}
                    name={lineEditName}
                    tagsInput={lineEditTagsInput}
                    color={lineEditColor}
                    onNameChange={setLineEditName}
                    onTagsInputChange={setLineEditTagsInput}
                    onColorChange={setLineEditColor}
                    onAddStation={handleAddLineStation}
                    onRemoveStationAt={handleRemoveLineStationAt}
                    onMoveStation={handleMoveLineStation}
                    isEditing={editingLineId != null}
                    saveStatus={lineEditSaveStatus}
                    saveError={lineEditSaveError}
                    onSave={handleSaveLineEdit}
                    onClear={handleClearLineEdit}
                    onClose={handleClearLineEdit}
                    zIndex={windowZIndices.lineEditor}
                    onFocus={() => bringToFront('lineEditor')}
                />
            )}
            {showDiagramManager && (
                <DiagramManagerPanel
                    diagrams={diagramsList}
                    editingDiagramId={editingDiagramId}
                    isLoading={diagramsLoading}
                    loadError={diagramsLoadError}
                    editLoadError={diagramEditLoadError}
                    onRefresh={refreshDiagramsList}
                    onNew={handleStartNewDiagram}
                    onEdit={handleLoadDiagramForEdit}
                    onDelete={handleDeleteDiagramFromManager}
                    onClose={() => setShowDiagramManager(false)}
                    zIndex={windowZIndices.diagramManager}
                    onFocus={() => bringToFront('diagramManager')}
                />
            )}
            {isDiagramEditActive && (
                <DiagramEditPanel
                    trainRefs={diagramEditTrainRefs}
                    name={diagramEditName}
                    tagsInput={diagramEditTagsInput}
                    lineId={diagramEditLineId}
                    onNameChange={setDiagramEditName}
                    onTagsInputChange={setDiagramEditTagsInput}
                    onLineIdChange={setDiagramEditLineId}
                    onAddTrainRef={handleAddDiagramTrainRef}
                    onRemoveTrainRefAt={handleRemoveDiagramTrainRefAt}
                    onMoveTrainRef={handleMoveDiagramTrainRef}
                    onDirectionChange={handleDiagramTrainRefDirectionChange}
                    isEditing={editingDiagramId != null}
                    saveStatus={diagramEditSaveStatus}
                    saveError={diagramEditSaveError}
                    onSave={handleSaveDiagramEdit}
                    onClear={handleClearDiagramEdit}
                    onClose={handleClearDiagramEdit}
                    zIndex={windowZIndices.diagramEditor}
                    onFocus={() => bringToFront('diagramEditor')}
                />
            )}
            {isRouteEditActive && (
                <RouteEditPanel
                    waypoints={routeEditWaypoints}
                    error={routeEditError}
                    saveStatus={routeEditSaveStatus}
                    saveError={routeEditSaveError}
                    name={routeEditName}
                    tagsInput={routeEditTagsInput}
                    onNameChange={setRouteEditName}
                    onTagsInputChange={setRouteEditTagsInput}
                    isEditing={editingRouteId != null}
                    onRemoveLast={handleRemoveLastWaypoint}
                    onRemoveAt={handleRemoveWaypointAt}
                    onMove={handleMoveWaypoint}
                    onClear={handleClearRouteEdit}
                    onSave={handleSaveRouteEdit}
                    onDetach={handleDetachStation}
                    onStationsChanged={refreshMapStations}
                    zIndex={windowZIndices.routePanel}
                    onFocus={() => bringToFront('routePanel')}
                />
            )}
            {showStationEditPanel && (
                <StationEditPanel
                    segments={segments}
                    selectedIds={selectedIds}
                    trainSpecs={trainSpecs}
                    pendingStopPoint={pendingStopPoint}
                    onConsumeStopPoint={() => setPendingStopPoint(null)}
                    onClose={() => setShowStationEditPanel(false)}
                    onStationsChanged={refreshMapStations}
                    zIndex={windowZIndices.stationPanel}
                    onFocus={() => bringToFront('stationPanel')}
                />
            )}

            {showSimpleStaffPanel && (
                <SimpleStaffPanel
                    segments={segments}            // 経路計算用
                    trains={trains}                // 列車一覧
                    routeStart={routeStart}   // App.jsx側で管理している始点
                    routeEnd={routeEnd}       // App.jsx側で管理している終点
                    onClearRoute={() => {
                      setRouteStart(null);
                      setRouteEnd(null);
                      setRoutePath(null);
                    }}
                    routePath={routePath}
                    trainSpecs={trainSpecs}
                    setRoutePath={(route) => setRoutePath(route)}
                    onClose={() => setShowSimpleStaffPanel(false)}
                    zIndex={windowZIndices.simpleStaffPanel}
                    onFocus={() => bringToFront('simpleStaffPanel')}
                />
            )}

            {showTimetableEditor && (
                <TimetableEditPanel
                    stations={mapStations}
                    trainSpecs={trainSpecs}
                    onClose={() => setShowTimetableEditor(false)}
                    zIndex={windowZIndices.timetableEditor}
                    onFocus={() => bringToFront('timetableEditor')}
                />
            )}

            {openTimetablePanels.map((panel, i) => (
                <TimetablePanel
                    key={panel.key}
                    title={`${panel.routeName} 下り時刻表`}
                    stations={panel.stations}
                    trains={[]}
                    defaultPos={{ x: 60 + i * 24, y: 60 + i * 24, width: 1000, height: 620 }}
                    onClose={() => handleCloseTimetablePanel(panel.key)}
                    onFocus={() => bringToFront(panel.key)}
                    zIndex={windowZIndices[panel.key]}
                />
            ))}
          </main>
        </div>



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