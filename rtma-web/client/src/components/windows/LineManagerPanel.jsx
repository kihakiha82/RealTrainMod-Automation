import { useState } from 'react';
import { Window } from '../Window.jsx';

/**
 * 路線(Line)管理パネル。ヘッダーの「🚋 路線編集」ボタンから開く。
 * RouteManagerPanelと同じ「一覧・新規作成・編集・削除」の入口の役割だが、路線は
 * 他のどのエンティティからも参照されないため(1.2節・server.js側コメント参照)、
 * 削除に409警告付き強制削除は不要 — 単純に確認なしで削除できる
 * (系統・時刻表と違い、参照整合性が壊れる心配がない)。
 *
 * 実際の駅並び替え編集UIはLineEditPanel(isLineEditActiveでApp.jsx側から表示制御)が担当する。
 *
 * props:
 *   lines: Line[](App.jsx側で保持しているlinesList)
 *   editingLineId: string | null(現在LineEditPanelで編集中の路線id)
 *   isLoading: boolean
 *   loadError: string | null
 *   onRefresh: () => void
 *   onNew: () => void
 *   onEdit: (line: Line) => void
 *   onDelete: (id: string) => Promise<void> | void
 */
export default function LineManagerPanel({
                                             lines, editingLineId, isLoading, loadError,
                                             onRefresh, onNew, onEdit, onDelete,
                                             onClose, zIndex, onFocus,
                                         }) {
    const [deletingId, setDeletingId] = useState(null);
    const [deleteError, setDeleteError] = useState(null);

    async function handleDeleteClick(line) {
        setDeletingId(line.id);
        setDeleteError(null);
        try {
            await onDelete(line.id);
        } catch (e) {
            setDeleteError(e.message);
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <Window
            title="🚋 路線編集"
            defaultPos={{ x: 20, y: 80, width: 360, height: 460 }}
            onClose={onClose}
            zIndex={zIndex}
            onFocus={onFocus}
        >
            <div style={{ padding: '14px 16px', height: '100%', overflowY: 'auto' }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    <button className="time-editor__btn" style={{ flex: 1 }} onClick={onNew}>
                        ＋ 新規作成
                    </button>
                    <button className="mode-btn" onClick={onRefresh} title="一覧を再取得">⟳</button>
                </div>

                {isLoading && <div className="time-editor__note">読み込み中...</div>}
                {loadError && <div className="time-editor__error">路線一覧の取得に失敗しました: {loadError}</div>}
                {deleteError && <div className="time-editor__error">削除に失敗しました: {deleteError}</div>}

                {!isLoading && !loadError && lines.length === 0 && (
                    <div className="time-editor__note">
                        まだ路線がありません。「新規作成」を押して、駅をダイヤグラム表示順に追加してください。
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                    {lines.map((line) => {
                        const isEditing = line.id === editingLineId;
                        return (
                            <div
                                key={line.id}
                                style={{
                                    display: 'flex', flexDirection: 'column', gap: 4,
                                    padding: '8px 10px', borderRadius: 4,
                                    border: isEditing ? '1px solid var(--amber)' : '1px solid transparent',
                                    background: isEditing ? 'rgba(232,163,61,0.10)' : 'rgba(255,255,255,0.03)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{
                                        width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                                        background: line.color || 'var(--text-dim)',
                                    }} />
                                    <span style={{ flex: 1, fontWeight: 'bold' }}>{line.name}</span>
                                    {isEditing && (
                                        <span style={{ color: 'var(--amber)', fontSize: 11 }}>編集中</span>
                                    )}
                                </div>
                                <div style={{ fontSize: 11, opacity: 0.75 }}>
                                    駅{line.stationIds?.length ?? 0}件
                                    {line.tags?.length > 0 && ` / ${line.tags.join(', ')}`}
                                </div>
                                <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                                    <button className="mode-btn" style={{ flex: 1 }} onClick={() => onEdit(line)}>
                                        編集
                                    </button>
                                    <button
                                        className="mode-btn"
                                        style={{ flex: 1, color: 'var(--red)' }}
                                        disabled={deletingId === line.id}
                                        onClick={() => handleDeleteClick(line)}
                                    >
                                        {deletingId === line.id ? '削除中...' : '削除'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Window>
    );
}