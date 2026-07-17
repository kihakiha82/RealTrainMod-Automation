import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
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
 * routePath: 計算された経路セグメント列({ id, reversed }[])。
 * routeStart, routeEnd: 簡易運行の始点/終点({ segId, s, x, z } | null)。地図上に丸マーカーで表示される。
 * onSelectionChange: ユーザーのクリック操作で選択が変わった時に呼ばれる((Set) => void)。
 * onContextMenuAction: 右クリックメニューの項目が実行された時に呼ばれる
 *   ((itemId, targetIds, railPoint) => void)。railPointはクリック位置に一番近い、
 *   対象セグメント上の点({ segId, s, x, z })。何もしなくても動く(メニュー自体はこの
 *   コンポーネント内で開閉が完結する)ので省略可能。
 */
const Map2D = forwardRef(function Map2D(
  { segments, player, selectedIds, routePath, routeStart, routeEnd, onSelectionChange, onContextMenuAction },
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

  // 右クリックメニューの開閉状態。{ x, y, targetIds, railPoint } | null
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    controllerRef.current = createMap2DController(containerRef.current, {
      onSelectionChange: (ids) => onSelectionChangeRef.current?.(ids),
      onContextMenu: (info) => setContextMenu(info),
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
          schema={RAIL_CONTEXT_MENU_SCHEMA}
          onAction={(itemId) => onContextMenuActionRef.current?.(itemId, contextMenu.targetIds, contextMenu.railPoint)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
});

export default Map2D;
