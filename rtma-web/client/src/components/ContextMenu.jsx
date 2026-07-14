import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * 汎用的な右クリックコンテキストメニュー。
 *
 * 中身(項目の意味・階層)は一切知らず、schemaに従って再帰的に描画するだけの
 * 純粋な表示コンポーネント。新しいメニュー項目を増やしたい時は
 * mapEngine/contextMenuSchema.js側にデータを足すだけでよく、このファイルを
 * 変更する必要はない設計にしている。
 *
 * props:
 *   x, y     : メニューを開く画面座標(右クリック時のclientX/clientY)
 *   schema   : メニュー項目の配列。 [{id,label} | {id,label,children:[...]}, ...]
 *   onAction : 末端項目がクリックされた時に呼ばれる (id: string) => void
 *   onClose  : メニューを閉じるべき時(外側クリック/Escape/項目実行後)に呼ばれる () => void
 */
export default function ContextMenu({ x, y, schema, onAction, onClose }) {
  const rootRef = useRef(null);
  // 画面端でメニューがはみ出さないよう、初回描画後に位置を補正する
  const [pos, setPos] = useState({ left: x, top: y, ready: false });

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 8;
    let left = x;
    let top = y;
    if (left + rect.width > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - rect.width - margin);
    }
    if (top + rect.height > window.innerHeight - margin) {
      top = Math.max(margin, window.innerHeight - rect.height - margin);
    }
    setPos({ left, top, ready: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, y]);

  useEffect(() => {
    function handlePointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        onClose();
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    // capture phaseで拾うことで、canvas側のクリック処理(選択操作)より先に外側クリックを検知する
    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onClose]);

  return (
    <div
      ref={rootRef}
      className="context-menu"
      style={{ left: pos.left, top: pos.top, visibility: pos.ready ? 'visible' : 'hidden' }}
    >
      <ContextMenuList items={schema} onAction={onAction} onClose={onClose} />
    </div>
  );
}

/** メニュー1階層分。子を持つ項目はホバーでサブメニューをフライアウト表示する */
function ContextMenuList({ items, onAction, onClose }) {
  const [openId, setOpenId] = useState(null);

  return (
    <div className="context-menu__list">
      {items.map((item) => {
        const hasChildren = Array.isArray(item.children) && item.children.length > 0;
        return (
          <div
            key={item.id}
            className={
              'context-menu__item' + (hasChildren ? ' context-menu__item--parent' : '')
            }
            onMouseEnter={() => setOpenId(item.id)}
            onClick={() => {
              if (hasChildren) return; // 親項目はホバーでサブメニューを開くのみで、クリックでは実行されない
              onAction(item.id);
              onClose();
            }}
          >
            <span className="context-menu__label">{item.label}</span>
            {hasChildren && <span className="context-menu__arrow">▶</span>}
            {hasChildren && openId === item.id && (
              <div className="context-menu__submenu">
                <ContextMenuList items={item.children} onAction={onAction} onClose={onClose} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
