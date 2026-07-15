import { useEffect, useRef, useState } from 'react';
import Map2D from './components/Map2D';
import TimeEditor from './components/TimeEditor';
import { fetchRails, fetchPlayerPosition, fetchTime, saveTime, fetchRouteProfile } from './api';
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
  // 簡易運行: 右クリックメニュー「点を設定」「終点を設定」でマークしたセグメントid
  const [routeStartId,   setRouteStartId]   = useState(null);
  const [routeEndId,     setRouteEndId]     = useState(null);
  // 経路計算(/api/route-profile)の結果。{ ok, totalLength, pointCount } | { error } | null
  const [routeResult,    setRouteResult]    = useState(null);
  const [isComputingRoute, setIsComputingRoute] = useState(false);

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
   * 「点を設定」「終点を設定」だけ実処理(簡易運行の始点/終点セグメントを記憶する)を行い、
   * それ以外(「点の編集」「レール情報の表示」)はまだ見た目のみ(プレースホルダー)。
   */
  function handleRailContextMenuAction(itemId, targetIds) {
    if (itemId === 'simple-operation:set-start-point') {
      setRouteStartId(targetIds[0] ?? null);
      setRouteResult(null); // 始点/終点が変わったら前回の計算結果は無効なのでクリアする
      return;
    }
    if (itemId === 'simple-operation:set-end-point') {
      setRouteEndId(targetIds[0] ?? null);
      setRouteResult(null);
      return;
    }
    console.log('[ContextMenu] action:', itemId, 'targets:', targetIds);
  }

  /** 簡易運行: 現在の始点/終点からrailGraphで経路を求め、/api/route-profileへ渡す */
  async function handleComputeRoute() {
    if (!routeStartId || !routeEndId) return;
    setIsComputingRoute(true);
    setRouteResult(null);
    try {
      const route = findRailRoute(segments, routeStartId, routeEndId);
      if (!route) {
        setRouteResult({ error: '始点と終点が線路で繋がっていません' });
        return;
      }
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
          {(routeStartId || routeEndId) && (
              <div className="topbar__status">
                簡易運行: 始点{routeStartId ? '✓' : '未設定'} / 終点{routeEndId ? '✓' : '未設定'}
                <button
                    className="mode-btn"
                    style={{ marginLeft: 8 }}
                    disabled={!routeStartId || !routeEndId || isComputingRoute}
                    onClick={handleComputeRoute}
                >
                  {isComputingRoute ? '計算中...' : '経路を計算'}
                </button>
                <button
                    className="mode-btn"
                    style={{ marginLeft: 4 }}
                    onClick={() => { setRouteStartId(null); setRouteEndId(null); setRouteResult(null); }}
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
          <div className="topbar__modes">
            <button className="mode-btn is-active">2D</button>
            <button className="mode-btn" disabled title="準備中">3D</button>
            <button className="mode-btn" onClick={() => mapRef.current?.resetView()}>
              ⟳ 全体表示
            </button>
          </div>
        </header>

        <main className="map-root">
          <Map2D
              segments={segments}
              player={player}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onContextMenuAction={handleRailContextMenuAction}
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
