import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { createMap2DController } from '../mapEngine/map2dController';
import { RAIL_CONTEXT_MENU_SCHEMA } from '../mapEngine/contextMenuSchema';
import ContextMenu from './ContextMenu';

/**
 * 2D地図のReactラッパー。
 * 実際の描画(canvas操作)はmapEngine/map2dController.jsに任せ、
 * このコンポーネントはマウント/アンマウントとpropsの変化を
 * controllerに橋渡しするだけにしている。
 *
 * ref.current.resetView() で親から「全体表示」を呼べる。
 *
 * selectedIds: 選択中セグメントのidのSet(controlled)。
 * routePath: 計算された経路セグメント列({ id, reversed }[])。簡易運行のプレビュー用。
 * routeEditPath: 路線編集モードのプレビュー経路。routePathと見た目のロジックを共有する。
 * routeWaypoints: 路線編集モードの経由点({ segId, s, x, z }[])。番号付きマーカーで表示される。
 * stations: 駅一覧(/api/stationsそのまま)。駅の長方形・番線の枠線・停車位置アイコンの描画に使う。
 * routeStart, routeEnd: 簡易運行の始点/終点({ segId, s, x, z } | null)。地図上に丸マーカーで表示される。
 * onSelectionChange: ユーザーのクリック操作で選択が変わった時に呼ばれる((Set) => void)。
 * onContextMenuAction: 右クリックメニューの項目が実行された時に呼ばれる
 *   ((itemId, targetIds, railPoint) => void)。railPointはクリック位置に一番近い、
 *   対象セグメント上の点({ segId, s, x, z })。何もしなくても動く(メニュー自体はこの
 *   コンポーネント内で開閉が完結する)ので省略可能。
 * onRoutePointChange: 始点/終点マーカーをドラッグして位置が確定した時に呼ばれる
 *   (('start'|'end', { segId, s, x, z }) => void)。
 * onBoundaryPointClick: 駅の境界点マーカーをクリックした時に呼ばれる
 *   (({ segId, s, x, z, stationId, boundaryType }) => void)。系統作成時の
 *   waypoint追加(始点/終点/経由点)にそのまま使える形で渡ってくる。
 * routeEditActive: 系統編集(RouteEditPanel)が開いている(=新規作成中/再編集中)かどうか。
 *   trueの間だけ、右クリックメニューの「経由点として追加」を有効化する
 *   (falseの間はメニュー項目自体をグレーアウトし、クリックしても何も起きないようにする。
 *   境界点マーカークリックのガードはApp.jsx#handleBoundaryMarkerClick側で行う)。
 */
const Map2D = forwardRef(function Map2D(
    { segments, player, selectedIds, routePath, routeEditPath, routeWaypoints, stations, routeStart, routeEnd, onSelectionChange, onContextMenuAction, onRoutePointChange, onBoundaryPointClick, routeEditActive },
    ref
) {
  const containerRef = useRef(null);
  const controllerRef = useRef(null);
  // controller生成時に一度だけ渡すコールバックが、常に最新のprops関数を
  // 参照できるようにrefで橋渡しする(useEffect依存に入れてcontrollerを作り直したくないため)
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;
  const onContextMenuActionRef = useRef(onContextMenuAction);
  onContextMenuActionRef.current = onContextMenuAction;
  const onRoutePointChangeRef = useRef(onRoutePointChange);
  onRoutePointChangeRef.current = onRoutePointChange;
  const onBoundaryPointClickRef = useRef(onBoundaryPointClick);
  onBoundaryPointClickRef.current = onBoundaryPointClick;

  // 右クリックメニューの開閉状態。{ x, y, targetIds, railPoint } | null
  const [contextMenu, setContextMenu] = useState(null);

  // 「経由点として追加」は系統編集パネルが開いている間だけ有効にする。
  // スキーマ自体はcontextMenuSchema.js側の静的データを使い回し、この項目だけ
  // disabled/labelを上書きしたコピーを都度組み立てる(項目数が少ないので毎回作っても軽い)。
  const contextMenuSchema = useMemo(() => {
    if (routeEditActive) return RAIL_CONTEXT_MENU_SCHEMA;
    return RAIL_CONTEXT_MENU_SCHEMA.map((item) => {
      if (item.id !== 'route-edit') return item;
      return {
        ...item,
        children: item.children.map((child) => (
            child.id === 'route-edit:add-waypoint'
                ? { ...child, label: '経由点として追加(要:系統編集を開く)', disabled: true }
                : child
        )),
      };
    });
  }, [routeEditActive]);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    controllerRef.current = createMap2DController(containerRef.current, {
      onSelectionChange: (ids) => onSelectionChangeRef.current?.(ids),
      onContextMenu: (info) => setContextMenu(info),
      onRoutePointChange: (role, point) => onRoutePointChangeRef.current?.(role, point),
      onBoundaryPointClick: (railPoint) => onBoundaryPointClickRef.current?.(railPoint),
    });
    return () => {
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.setSegments(segments);
  }, [segments]);

  useEffect(() => {
    controllerRef.current?.setPlayer(player);
  }, [player]);

  useEffect(() => {
    controllerRef.current?.setSelectedIds(selectedIds);
  }, [selectedIds]);

  useEffect(() => {
    controllerRef.current?.setRoutePath(routePath);
  }, [routePath]);

  useEffect(() => {
    controllerRef.current?.setRouteEditPath(routeEditPath);
  }, [routeEditPath]);

  useEffect(() => {
    controllerRef.current?.setRouteWaypoints(routeWaypoints);
  }, [routeWaypoints]);

  useEffect(() => {
    controllerRef.current?.setStations(stations);
  }, [stations]);

  useEffect(() => {
    controllerRef.current?.setRouteStart(routeStart);
  }, [routeStart]);

  useEffect(() => {
    controllerRef.current?.setRouteEnd(routeEnd);
  }, [routeEnd]);

  useImperativeHandle(ref, () => ({
    resetView() {
      controllerRef.current?.resetView();
    },
    centerOn(x, z, scale) {
      controllerRef.current?.centerOn(x, z, scale);
    },
  }));

  return (
      <div ref={containerRef} className="map-canvas-host">
        {contextMenu && (
            <ContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                schema={contextMenuSchema}
                onAction={(itemId) => onContextMenuActionRef.current?.(itemId, contextMenu.targetIds, contextMenu.railPoint)}
                onClose={() => setContextMenu(null)}
            />
        )}
      </div>
  );
});

export default Map2D;