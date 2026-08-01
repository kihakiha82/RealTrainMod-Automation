import { useState } from 'react';
import { Window } from '../Window.jsx';

/**
 * 系統(Route)管理パネル。ヘッダーの「🛤 系統編集」ボタンから開く。
 *
 * 従来、系統の新規作成は「レールを右クリック→経由点を積む→RouteEditPanelで保存」の
 * フローしかなく、一度保存した系統を後から呼び出して編集する手段が無かった
 * (常にPOST /api/routesが新規idを発行していたわけではないが、UI上は再編集する
 * 導線が無かった)。このパネルはその入口を提供する:
 *
 *   - 既存系統の一覧表示(名前・タグ・経由点数)
 *   - 「新規作成」: 編集中の状態をクリアし、地図上での経由点追加を開始できる状態にする
 *   - 「編集」: 選択した系統のwaypointsをApp.jsx側の編集state(routeEditWaypoints等)に
 *     読み込み、RouteEditPanel(経由点編集+保存)を呼び出せる状態にする
 *   - 「削除」: DELETE /api/routesで削除する。他の時刻表から参照されている場合は
 *     409が返るので、参照している時刻表名を一覧表示した上で「強制削除」を選べるようにする
 *     (StationEditPanelの駅削除と同じ「警告付き強制削除」パターン)
 *
 * 実際の経由点編集・保存UIはRouteEditPanel(isRouteEditActiveでApp.jsx側から表示制御)が担当する。
 * このパネルは一覧・入り口のみを担当し、役割を分離している。
 *
 * props:
 *   routes: Route[](App.jsx側で保持しているroutesList)
 *   editingRouteId: string | null(現在RouteEditPanelで編集中の系統id)
 *   isLoading: boolean
 *   loadError: string | null
 *   onRefresh: () => void
 *   onNew: () => void
 *   onEdit: (route: Route) => void
 *   onDelete: (id: string, opts?: { force?: boolean }) => Promise<{ conflict: boolean, referencingTimetables?: {name:string}[] }>
 */
export default function RouteManagerPanel({
                                              routes, editingRouteId, isLoading, loadError,
                                              onRefresh, onNew, onEdit, onDelete,
                                              onClose, zIndex, onFocus,
                                          }) {
    const [deletingId, setDeletingId] = useState(null);
    const [deleteError, setDeleteError] = useState(null);
    const [deleteConflicts, setDeleteConflicts] = useState({}); //

    // --- 追加: 複数選択用の状態管理 ---
    const [selectedIds, setSelectedIds] = useState(new Set());

    // 個別のチェックボックス切り替え
    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // 全選択/全解除の切り替え
    const toggleSelectAll = () => {
        if (selectedIds.size === routes.length && routes.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(routes.map(r => r.id)));
        }
    };
    // --------------------------------

    async function handleDeleteClick(route, force = false) {
        setDeletingId(route.id); //[cite: 1]
        setDeleteError(null);
        try {
            const result = await onDelete(route.id, { force }); //[cite: 1]
            setDeleteConflicts((prev) => {
                const next = { ...prev }; //[cite: 1]
                if (result.conflict) {
                    next[route.id] = result.referencingTimetables; //[cite: 1]
                } else {
                    delete next[route.id]; //[cite: 1]
                    // 削除成功時は選択状態からも外す
                    setSelectedIds(selected => {
                        const newSelected = new Set(selected);
                        newSelected.delete(route.id);
                        return newSelected;
                    });
                }
                return next; //[cite: 1]
            });
        } catch (e) {
            setDeleteError(e.message); //[cite: 1]
        } finally {
            setDeletingId(null); //[cite: 1]
        }
    }

    // --- 追加: 一括削除処理 ---
    const handleBulkDelete = async () => {
        if (!window.confirm(`選択した${selectedIds.size}件の系統を削除しますか？`)) return;

        setDeleteError(null);
        let hasError = false;

        // 既存のdeleteConflictsをベースに更新していく
        let currentConflicts = { ...deleteConflicts };

        for (const id of Array.from(selectedIds)) {
            setDeletingId(id);
            try {
                // 強制削除は一括では行わず、競合確認を行う
                const result = await onDelete(id, { force: false });
                if (result.conflict) {
                    currentConflicts[id] = result.referencingTimetables;
                } else {
                    delete currentConflicts[id];
                    // 成功したら選択解除
                    setSelectedIds(prev => {
                        const next = new Set(prev);
                        next.delete(id);
                        return next;
                    });
                }
            } catch (e) {
                setDeleteError(`ID:${id} の削除中にエラーが発生しました: ${e.message}`);
                hasError = true;
                break; // ネットワーク等の致命的エラー時は中断
            }
        }

        // 状態を反映
        setDeleteConflicts(currentConflicts);
        setDeletingId(null);
    };
    // --------------------------------

    return (
        <Window
            title="🛤 系統編集"
            defaultPos={{ x: 20, y: 80, width: 360, height: 460 }} //[cite: 1]
            onClose={onClose} //[cite: 1]
            zIndex={zIndex} //[cite: 1]
            onFocus={onFocus} //[cite: 1]
        >
            <div style={{ padding: '14px 16px', height: '100%', overflowY: 'auto' }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    <button className="time-editor__btn" style={{ flex: 1 }} onClick={onNew}>
                        ＋ 新規作成
                    </button>
                    <button className="mode-btn" onClick={onRefresh} title="一覧を再取得">⟳</button>
                </div>

                {routes.length > 0 && !isLoading && !loadError && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12 }}>
                            <input
                                type="checkbox"
                                checked={selectedIds.size === routes.length && routes.length > 0}
                                onChange={toggleSelectAll}
                            />
                            すべて選択
                        </label>
                        <div style={{ flex: 1 }} />
                        <button
                            className="mode-btn"
                            style={{ color: selectedIds.size > 0 ? 'var(--red)' : 'inherit', fontSize: 12, padding: '4px 8px' }}
                            disabled={selectedIds.size === 0 || deletingId !== null}
                            onClick={handleBulkDelete}
                        >
                            {deletingId ? '処理中...' : `選択中を削除 (${selectedIds.size})`}
                        </button>
                    </div>
                )}
                {/* -------------------------------- */}

                {isLoading && <div className="time-editor__note">読み込み中...</div>} {/*[cite: 1] */}
                {loadError && <div className="time-editor__error">系統一覧の取得に失敗しました: {loadError}</div>} {/*[cite: 1] */}
                {deleteError && <div className="time-editor__error">削除に失敗しました: {deleteError}</div>} {/*[cite: 1] */}

                {!isLoading && !loadError && routes.length === 0 && (
                    <div className="time-editor__note">
                        まだ系統がありません。「新規作成」を押してから、地図上でレールを右クリック→
                        「経由点として追加」で経由点を積み上げてください。
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                    {routes.map((route) => {
                        const isEditing = route.id === editingRouteId; //[cite: 1]
                        const conflict = deleteConflicts[route.id]; //[cite: 1]
                        const isSelected = selectedIds.has(route.id); // 選択状態

                        return (
                            <div
                                key={route.id}
                                style={{
                                    display: 'flex', flexDirection: 'column', gap: 4,
                                    padding: '8px 10px', borderRadius: 4,
                                    // 選択時は背景色を少し変えてハイライトする
                                    border: isEditing ? '1px solid var(--amber)' : isSelected ? '1px solid #aaa' : '1px solid transparent',
                                    background: isEditing ? 'rgba(232,163,61,0.10)' : isSelected ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {/* --- 追加: 個別チェックボックス --- */}
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleSelect(route.id)}
                                        style={{ cursor: 'pointer' }}
                                    />
                                    {/* ---------------------------------- */}

                                    <span style={{ flex: 1, fontWeight: 'bold' }}>{route.name}</span>
                                    {isEditing && (
                                        <span style={{ color: 'var(--amber)', fontSize: 11 }}>編集中</span>
                                    )}
                                </div>
                                <div style={{ fontSize: 11, opacity: 0.75, paddingLeft: 20 /* チェックボックス分のインデント */ }}>
                                    経由点{route.waypoints?.length ?? 0}点
                                    {route.tags?.length > 0 && ` / ${route.tags.join(', ')}`}
                                </div>

                                {!conflict ? (
                                    <div style={{ display: 'flex', gap: 6, marginTop: 2, paddingLeft: 20 }}>
                                        <button className="mode-btn" style={{ flex: 1 }} onClick={() => onEdit(route)}>
                                            編集
                                        </button>
                                        <button
                                            className="mode-btn"
                                            style={{ flex: 1, color: 'var(--red)' }}
                                            disabled={deletingId === route.id} //[cite: 1]
                                            onClick={() => handleDeleteClick(route, false)} //[cite: 1]
                                        >
                                            {deletingId === route.id ? '削除中...' : '削除'}
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ marginTop: 2, paddingLeft: 20 }}>
                                        <div className="time-editor__error">
                                            以下の時刻表から参照されているため削除できません:
                                            {conflict.map((t) => (
                                                <div key={t.name}>・{t.name}</div>
                                            ))}
                                        </div>
                                        <div className="time-editor__note">
                                            強制削除すると、これらの時刻表ごと削除されます。
                                        </div>
                                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                            <button
                                                className="mode-btn" style={{ flex: 1 }}
                                                onClick={() => setDeleteConflicts((prev) => {
                                                    const next = { ...prev }; //[cite: 1]
                                                    delete next[route.id]; //[cite: 1]
                                                    return next; //[cite: 1]
                                                })}
                                            >
                                                キャンセル
                                            </button>
                                            <button
                                                className="mode-btn"
                                                style={{ flex: 1, color: 'var(--red)' }}
                                                disabled={deletingId === route.id} //[cite: 1]
                                                onClick={() => handleDeleteClick(route, true)} //[cite: 1]
                                            >
                                                {deletingId === route.id ? '削除中...' : '強制削除する'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </Window>
    );
}