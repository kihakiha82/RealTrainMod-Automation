import { Window } from '../Window.jsx';

/**
 * 路線(Line)編集パネル。
 *
 * 系統(Route)と違い、路線は「ダイヤグラム表示用に駅を順序付きで並べたもの」であって、
 * 物理的な走行経路(waypoints/レール)は持たない(1.2節)。そのため経路探索や地図クリックに
 * よる編集は不要で、駅一覧からのドロップダウン選択+並べ替えという単純なUIで十分。
 *
 * railSegmentIds(所属レール集合)は今回のスコープでは未対応(空のまま保存される)。
 * ダイヤグラム上でのレール強調表示など、実際に使う機能ができた段階で編集UIを追加する。
 *
 * RouteEditPanelと同じく、name/tagsInput/color/stationIdsはApp.jsx側に状態を持ち上げた
 * 制御コンポーネント(RouteManagerPanelから既存路線を読み込んだ際に反映させるため)。
 *
 * props:
 *   stations: Station[](App.jsx側のmapStationsをそのまま渡す想定。ドロップダウンの選択肢)
 *   stationIds: string[](並び順を持つ、現在編集中の駅リスト)
 *   name, tagsInput, color: string
 *   onNameChange, onTagsInputChange, onColorChange: (v: string) => void
 *   onAddStation: (stationId: string) => void
 *   onRemoveStationAt: (index: number) => void
 *   onMoveStation: (index: number, direction: -1 | 1) => void
 *   isEditing: boolean(既存路線を編集中かどうか。falseなら新規作成)
 *   saveStatus: 'saving' | 'saved' | 'error' | null
 *   saveError: string | null
 *   onSave: () => void
 *   onClear: () => void
 *   zIndex, onFocus, onClose: Windowコンポーネント用
 */
export default function LineEditPanel({
                                          stations, stationIds,
                                          name, tagsInput, color,
                                          onNameChange, onTagsInputChange, onColorChange,
                                          onAddStation, onRemoveStationAt, onMoveStation,
                                          isEditing, saveStatus, saveError, onSave, onClear,
                                          zIndex, onFocus, onClose,
                                      }) {
    const stationsById = new Map(stations.map((s) => [s.id, s]));
    const canSave = name.trim().length > 0;
    const titleSuffix = isEditing ? `再編集中: ${name || '(無題)'}` : `新規作成・駅${stationIds.length}件`;

    return (
        <Window
            title={`🚋 路線編集(${titleSuffix})`}
            defaultPos={{ x: 380, y: 80, width: 340, height: 480 }}
            onClose={onClose}
            zIndex={zIndex}
            onFocus={onFocus}
        >
            <div style={{ padding: '14px 16px', height: '100%', overflowY: 'auto' }}>
                <div className="time-editor__fields">
                    <label className="time-editor__field">
                        <span>路線名</span>
                        <input type="text" value={name} onChange={(e) => onNameChange(e.target.value)} style={{ flex: 1 }} />
                    </label>
                    <label className="time-editor__field">
                        <span>タグ</span>
                        <input
                            type="text"
                            placeholder="カンマ区切り"
                            value={tagsInput}
                            onChange={(e) => onTagsInputChange(e.target.value)}
                            style={{ flex: 1 }}
                        />
                    </label>
                    <label className="time-editor__field">
                        <span>色</span>
                        <input type="color" value={color || '#e8a33d'} onChange={(e) => onColorChange(e.target.value)} />
                    </label>
                </div>

                <div style={{ display: 'flex', gap: 6, margin: '10px 0 6px' }}>
                    <select
                        style={{ flex: 1 }}
                        value=""
                        onChange={(e) => {
                            if (e.target.value) onAddStation(e.target.value);
                        }}
                    >
                        <option value="">+ 駅を追加...</option>
                        {stations.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {stationIds.map((stationId, index) => {
                        const station = stationsById.get(stationId);
                        return (
                            <div key={index} style={{
                                display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                                padding: '4px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.03)',
                            }}>
                                <span style={{ color: 'var(--amber)', width: 18, flexShrink: 0 }}>{index + 1}</span>
                                <span style={{ flex: 1 }}>{station?.name ?? `(不明な駅: ${stationId})`}</span>
                                <button
                                    className="mode-btn" style={{ padding: '2px 6px' }}
                                    disabled={index === 0}
                                    title="1つ前に移動"
                                    onClick={() => onMoveStation(index, -1)}
                                >↑</button>
                                <button
                                    className="mode-btn" style={{ padding: '2px 6px' }}
                                    disabled={index === stationIds.length - 1}
                                    title="1つ後に移動"
                                    onClick={() => onMoveStation(index, 1)}
                                >↓</button>
                                <button
                                    className="mode-btn" style={{ color: 'var(--red)' }}
                                    onClick={() => onRemoveStationAt(index)}
                                >削除</button>
                            </div>
                        );
                    })}
                    {stationIds.length === 0 && (
                        <div className="time-editor__note">
                            上のドロップダウンから、ダイヤグラムに表示する駅を順番に追加してください
                            (同じ駅を複数回追加することもできます。環状線・折返し表示など)。
                        </div>
                    )}
                </div>

                {saveError && <div className="time-editor__error">保存に失敗しました: {saveError}</div>}
                {saveStatus === 'saved' && <div className="time-editor__note" style={{ color: 'var(--green)' }}>保存しました</div>}

                <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                    <button className="time-editor__btn" style={{ flex: 1 }} onClick={onClear}>クリア</button>
                    <button
                        className="time-editor__btn" style={{ flex: 1 }}
                        disabled={!canSave || saveStatus === 'saving'}
                        onClick={onSave}
                    >
                        {saveStatus === 'saving' ? '保存中...' : '保存'}
                    </button>
                </div>
            </div>
        </Window>
    );
}