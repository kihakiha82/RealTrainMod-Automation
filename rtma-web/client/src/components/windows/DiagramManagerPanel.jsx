import { useState } from 'react';
import { Window } from '../Window.jsx';

/**
 * ダイヤ(Diagram、複数列車ダイヤ)管理パネル。ヘッダーの「📊 ダイヤ管理」ボタンから開く。
 * LineManagerPanelと同じく、ダイヤ自体は他のどのエンティティからも参照されないため
 * (Diagram→Timetableの一方向のみ)、削除に警告付き強制削除は不要。
 * 逆方向(この時刻表を参照しているダイヤがあるか)は、時刻表側の削除(TimetableEditPanel)
 * でチェックしている。
 *
 * 実際のtrainRefs(列車の並び)編集UIはDiagramEditPanel(isDiagramEditActiveでApp.jsx側から
 * 表示制御)が担当する。
 *
 * props:
 *   diagrams: Diagram[](メタデータ付き。App.jsx側で保持しているdiagramsList)
 *   editingDiagramId: string | null
 *   isLoading: boolean
 *   loadError: string | null
 *   onRefresh: () => void
 *   onNew: () => void
 *   onEdit: (diagram: Diagram) => void(メタデータのみ受け取り、詳細読込は呼び出し側の責務)
 *   onDelete: (id: string) => Promise<void> | void
 *   editLoadError: string | null(onEdit呼び出し後、詳細取得(fetchDiagram)に失敗した場合)
 */
export default function DiagramManagerPanel({
                                                diagrams, editingDiagramId, isLoading, loadError, editLoadError,
                                                onRefresh, onNew, onEdit, onDelete,
                                                onClose, zIndex, onFocus,
                                            }) {
    const [deletingId, setDeletingId] = useState(null);
    const [deleteError, setDeleteError] = useState(null);

    async function handleDeleteClick(diagram) {
        setDeletingId(diagram.id);
        setDeleteError(null);
        try {
            await onDelete(diagram.id);
        } catch (e) {
            setDeleteError(e.message);
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <Window
            title="📊 ダイヤ管理"
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
                {loadError && <div className="time-editor__error">ダイヤ一覧の取得に失敗しました: {loadError}</div>}
                {editLoadError && <div className="time-editor__error">ダイヤの読込に失敗しました: {editLoadError}</div>}
                {deleteError && <div className="time-editor__error">削除に失敗しました: {deleteError}</div>}

                {!isLoading && !loadError && diagrams.length === 0 && (
                    <div className="time-editor__note">
                        まだダイヤがありません。「新規作成」を押して、保存済みの時刻表を列車として追加してください。
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                    {diagrams.map((diagram) => {
                        const isEditing = diagram.id === editingDiagramId;
                        return (
                            <div
                                key={diagram.id}
                                style={{
                                    display: 'flex', flexDirection: 'column', gap: 4,
                                    padding: '8px 10px', borderRadius: 4,
                                    border: isEditing ? '1px solid var(--amber)' : '1px solid transparent',
                                    background: isEditing ? 'rgba(232,163,61,0.10)' : 'rgba(255,255,255,0.03)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ flex: 1, fontWeight: 'bold' }}>{diagram.name}</span>
                                    {isEditing && (
                                        <span style={{ color: 'var(--amber)', fontSize: 11 }}>編集中</span>
                                    )}
                                </div>
                                <div style={{ fontSize: 11, opacity: 0.75 }}>
                                    {diagram.lineName ? `${diagram.lineName} / ` : ''}
                                    列車{diagram.trainCount}本(下り{diagram.kudariCount}・上り{diagram.noboriCount})
                                    {diagram.tags?.length > 0 && ` / ${diagram.tags.join(', ')}`}
                                </div>
                                <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                                    <button className="mode-btn" style={{ flex: 1 }} onClick={() => onEdit(diagram)}>
                                        編集
                                    </button>
                                    <button
                                        className="mode-btn"
                                        style={{ flex: 1, color: 'var(--red)' }}
                                        disabled={deletingId === diagram.id}
                                        onClick={() => handleDeleteClick(diagram)}
                                    >
                                        {deletingId === diagram.id ? '削除中...' : '削除'}
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