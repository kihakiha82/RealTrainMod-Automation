import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { createMap2DController } from '../mapEngine/map2dController';

/**
 * 2D地図のReactラッパー。
 * 実際の描画(canvas操作)はmapEngine/map2dController.jsに任せ、
 * このコンポーネントはマウント/アンマウントとpropsの変化を
 * controllerに橋渡しするだけにしている。
 *
 * ref.current.resetView() で親から「全体表示」を呼べる。
 */
const Map2D = forwardRef(function Map2D({ segments, player }, ref) {
  const containerRef = useRef(null);
  const controllerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    controllerRef.current = createMap2DController(containerRef.current);
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

  useImperativeHandle(ref, () => ({
    resetView() {
      controllerRef.current?.resetView();
    },
    centerOn(x, z, scale) {
      controllerRef.current?.centerOn(x, z, scale);
    },
  }));

  return <div ref={containerRef} className="map-canvas-host" />;
});

export default Map2D;