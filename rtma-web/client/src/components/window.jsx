// Window.jsx
import React from 'react';
import { Rnd } from 'react-rnd';

export function Window({
                           title,
                           children,
                           onClose,
                           isActive = false,
                           isOpen = true,
                           onFocus,
                           zIndex = 10,
                           defaultPos = { x: 80, y: 80, width: 380, height: 260 }
                       }) {
    return (
        <Rnd
            className="window-rnd"
            style={{
                zIndex,
                display: isOpen ? "block":"none",
            }}
            default={{
                x: defaultPos.x,
                y: defaultPos.y,
                width: defaultPos.width,
                height: defaultPos.height,
            }}
            minWidth={220}
            minHeight={120}
            bounds="parent"
            dragHandleClassName="window__header" // ヘッダーのみドラッグ可能にする
            onMouseDown={onFocus} // ウィンドウをクリックしたらフォーカスを移す
        >
            <div className={`window ${isActive ? 'is-active' : ''}`}>
                {/* ヘッダーバー */}
                <div className="window__header">
                    <div className="window__title-group">
                        <span className="window__dot" />
                        <span className="window__title">{title}</span>
                    </div>
                    <div className="window__controls">
                        <button
                            className="window__close-btn"
                            onClick={(e) => {
                                e.stopPropagation(); // ドラッグやフォーカスイベントの連動を防止
                                onClose();
                            }}
                            title="閉じる"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* コンテンツ領域 */}
                <div className="window__body">
                    {children}
                </div>
            </div>
        </Rnd>
    );
}