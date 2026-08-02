import { useEffect, useState } from 'react';
import { Window } from '../Window.jsx';
import { fetchLines, fetchTimetableList } from '../../api.js';

/**
 * ダイヤ(Diagram、複数列車ダイヤ)編集パネル。
 *
 * ダイヤは「既存の時刻表(Timetable、1列車分の計算済みの着発時刻)を複数まとめて、
 * 上り/下りでグルーピングしたもの」。OuDiaSecondのDia(ダイヤ)がKudari/Noboriそれぞれに
 * 複数のRessya(列車)を持つのと同じ構造。実際の着発時刻計算はTimetable側の責務のまま
 * なので、ここではtimetableNameの参照リストを組み立てるだけ(計算結果を二重に持たない)。
 *
 * 路線(Line)は表示軸(駅の並び順)として任意で紐付けられるが、このスコープでは
 * 「どの路線のダイヤか」を記録するだけで、実際の視覚化(駅の並びに沿った時刻-距離グラフ)
 * はまだ実装しない(次のフェーズ)。
 *
 * RouteEditPanel/LineEditPanelと同じく、name/tagsInput/lineId/trainRefsはApp.jsx側に
 * 状態を持ち上げた制御コンポーネント。lines/timetablesの選択肢はRouteEditPanelが
 * stationsを自前で取得するのと同じパターンで、このパネル自身がfetchする。
 *
 * props:
 *   trainRefs: { id, timetableName, direction: 'kudari'|'nobori'|null }[]
 *   name, tagsInput, lineId: string
 *   onNameChange, onTagsInputChange, onLineIdChange: (v: string) => void
 *   onAddTrainRef: (timetableName: string) => void
 *   onRemoveTrainRefAt: (index: number) => void
 *   onMoveTrainRef: (index: number, direction: -1 | 1) => void
 *   onDirectionChange: (index: number, direction: 'kudari'|'nobori'|null) => void
 *   isEditing: boolean
 *   saveStatus: 'saving' | 'saved' | 'error' | null
 *   saveError: string | null
 *   onSave: () => void
 *   onClear: () => void
 *   zIndex, onFocus, onClose: Windowコンポーネント用
 */
export default function DiagramEditPanel({
                                             trainRefs,
                                             name, tagsInput, lineId,
                                             onNameChange, onTagsInputChange, onLineIdChange,
                                             onAddTrainRef, onRemoveTrainRefAt, onMoveTrainRef, onDirectionChange,
                                             isEditing, saveStatus, saveError, onSave, onClear,
                                             zIndex, onFocus, onClose,
                                         }) {
    const [lines, setLines] = useState([]);
    const [linesError, setLinesError] = useState(null);
    const [timetables, setTimetables] = useState([]);
    const [timetablesError, setTimetablesError] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                setLines(await fetchLines());
            } catch (e) {
                setLinesError(e.message);
            }
        })();
        (async () => {
            try {
                const list = await fetchTimetableList();
                // v2形式(TimetableEditPanel由来)のみをダイヤの列車候補にする。
                // 旧形式(簡易スタフ)はRoute/Stationと紐付いておらず、ダイヤの一員として
                // 表示しても駅並びが分からず意味を持たないため除外する。
                setTimetables(list.filter((t) => t.kind === 'v2'));
            } catch (e) {
                setTimetablesError(e.message);
            }
        })();
    }, []);

    const timetablesByName = new Map(timetables.map((t) => [t.name, t]));
    const canSave = name.trim().length > 0;
    const titleSuffix = isEditing ? `再編集中: ${name || '(無題)'}` : `新規作成・列車${trainRefs.length}本`;

    return (
        <Window
            title={`📊 ダイヤ編集(${titleSuffix})`}
            defaultPos={{ x: 380, y: 80, width: 380, height: 500 }}
            onClose={onClose}
            zIndex={zIndex}
            onFocus={onFocus}
        >
            <div style={{ padding: '14px 16px', height: '100%', overflowY: 'auto' }}>
                {linesError && <div className="time-editor__error">路線一覧の取得に失敗しました: {linesError}</div>}
                {timetablesError && <div className="time-editor__error">時刻表一覧の取得に失敗しました: {timetablesError}</div>}

                <div className="time-editor__fields">
                    <label className="time-editor__field">
                        <span>ダイヤ名</span>
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
                        <span>路線</span>
                        <select value={lineId ?? ''} onChange={(e) => onLineIdChange(e.target.value || null)} style={{ flex: 1 }}>
                            <option value="">(紐付けなし)</option>
                            {lines.map((l) => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                        </select>
                    </label>
                </div>

                <div style={{ display: 'flex', gap: 6, margin: '10px 0 6px' }}>
                    <select
                        style={{ flex: 1 }}
                        value=""
                        onChange={(e) => {
                            if (e.target.value) onAddTrainRef(e.target.value);
                        }}
                    >
                        <option value="">+ 時刻表(列車)を追加...</option>
                        {timetables.map((t) => (
                            <option key={t.name} value={t.name}>
                                {t.name}({t.routeName} / {t.trainResourceName || '車両未設定'})
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {trainRefs.map((ref, index) => {
                        const tt = timetablesByName.get(ref.timetableName);
                        return (
                            <div key={ref.id ?? index} style={{
                                display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                                padding: '4px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.03)',
                            }}>
                                <span style={{ color: 'var(--amber)', width: 18, flexShrink: 0 }}>{index + 1}</span>
                                <span style={{ flex: 1 }}>
                                    {ref.timetableName}
                                    {!tt && <span style={{ color: 'var(--red)' }}>(時刻表が見つかりません)</span>}
                                </span>
                                <select
                                    value={ref.direction ?? ''}
                                    onChange={(e) => onDirectionChange(index, e.target.value || null)}
                                >
                                    <option value="">(方向なし)</option>
                                    <option value="kudari">下り</option>
                                    <option value="nobori">上り</option>
                                </select>
                                <button
                                    className="mode-btn" style={{ padding: '2px 6px' }}
                                    disabled={index === 0}
                                    title="1つ前に移動"
                                    onClick={() => onMoveTrainRef(index, -1)}
                                >↑</button>
                                <button
                                    className="mode-btn" style={{ padding: '2px 6px' }}
                                    disabled={index === trainRefs.length - 1}
                                    title="1つ後に移動"
                                    onClick={() => onMoveTrainRef(index, 1)}
                                >↓</button>
                                <button
                                    className="mode-btn" style={{ color: 'var(--red)' }}
                                    onClick={() => onRemoveTrainRefAt(index)}
                                >削除</button>
                            </div>
                        );
                    })}
                    {trainRefs.length === 0 && (
                        <div className="time-editor__note">
                            上のドロップダウンから、このダイヤに含める列車(保存済みの時刻表)を追加してください。
                            時刻表エディタで新形式(v2)として保存したものだけが選択肢に出ます。
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