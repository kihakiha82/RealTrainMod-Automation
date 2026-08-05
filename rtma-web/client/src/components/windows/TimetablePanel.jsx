// TimetablePanel.jsx
import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Window } from '../Window';
import {
    stations as REAL_STATIONS,
    trains as REAL_TRAINS,
} from './timetableData';
import './TimetablePanel.css';

const EMPTY_ENTRY = {};
const DEFAULT_TYPE = {};

// ------------------------------------------------------------------
// 実データ(米倉鉄道 江乃原線 下り時刻表)は timetableData.js から読み込む。
// stations: [{ id, name, hasTrack, hasDep, hasArr }, ...]
// trains:   [{ id, trainNo, duty, type, name, startStation, startWork,
//              endStation, endWork, times: { [stationId]: { track, dep, arr } } }, ...]
// ------------------------------------------------------------------

const TRAIN_TYPES = {
    普通: { className: 'tt-type-local' },
    快速: { className: 'tt-type-rapid' },
    区快: { className: 'tt-type-sectionRapid' },
    急行: { className: 'tt-type-express' },
    特急: { className: 'tt-type-limitedExpress' },
    寝台特急: { className: 'tt-type-sleeperLimited' },
    寝台急行: { className: 'tt-type-sleeperExpress' },
    回送: { className: 'tt-type-outOfService' },
};

// 番線は着発の間に表示する: hasDep→dep, hasTrack→track, hasArr→arr の順に積む
function buildStationSubRows(station) {
    const rows = [];
    if (station.hasArr) rows.push('arr');
    if (station.hasTrack) rows.push('track');
    if (station.hasDep) rows.push('dep');
    return rows;
}

const SUB_ROW_LABEL = { track: '番線', dep: '発', arr: '着' };

/**
 * ダイヤ表示エリアの一番右に常に1本だけ表示する「空列車」列。
 * 右クリックで新規列車を追加する方式ではなく、この空列のセルを直接クリックすることが
 * そのまま新規列車の時刻編集の入り口になる(handleCellMouseDown参照)。
 * timesを空オブジェクトにしておくことで、どの駅の行も自動的に「・・」(未入力)表示になる。
 */
const EMPTY_TRAIN = {
    id: '__empty__',
    trainNo: '', duty: '', type: '', name: '', number: '',
    startStation: '', startWork: '', endStation: '', endWork: '',
    times: {},
};

const META_ROWS = [
    { key: 'trainNo', label: '列車番号' },
    { key: 'duty', label: '運用番号' },
    { key: 'type', label: '列車種別' },
    { key: 'name', label: '列車名' },
    { key: 'number', label: '号数' },
    { key: 'startStation', label: '始発駅' },
    { key: 'startWork', label: '始発駅作業' },
    { key: 'endStation', label: '終着駅' },
    { key: 'endWork', label: '終着駅作業' },
];

function setsEqual(a, b) {
    if (a === b) return true;
    if (a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
}

function TimeInputModal({ cellInfo, onSave, onClose }) {
    const [value, setValue] = useState(cellInfo.currentValue || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(value);
    };

    const labelName = SUB_ROW_LABEL[cellInfo.sub] || '';

    return (
        <div className="tt-modal-overlay" onClick={onClose}>
            <div className="tt-modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>{labelName} の入力</h3>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={cellInfo.sub === 'track' ? '例: 1' : '例: 1205'}
                        autoFocus
                    />
                    <div className="tt-modal-actions">
                        <button type="submit">保存</button>
                        <button type="button" onClick={onClose}>キャンセル</button>
                    </div>
                </form>
            </div>
        </div>
    );
}


// ------------------------------------------------------------------
// 列ヘッダーセル・時刻セルは React.memo で切り出し、選択状態が変わった
// セル/列だけを再レンダリングする(でないとドラッグの度に毎回全セルを
// 作り直すことになり、カクつきの主因になる)。
// ------------------------------------------------------------------

const HeaderCell = React.memo(function HeaderCell({
                                                      colIndex,
                                                      metaKey,
                                                      content,
                                                      typeClassName,
                                                      isSelected,
                                                      isEmptyCol,
                                                      onMouseDown,
                                                      onMouseEnter,
                                                  }) {
    const handleDown = useCallback((e) => onMouseDown(colIndex, e), [onMouseDown, colIndex]);
    const handleEnter = useCallback(() => onMouseEnter(colIndex), [onMouseEnter, colIndex]);

    const className =
        'tt-meta-cell' +
        (metaKey === 'type' ? ' ' + (typeClassName || '') : '') +
        (metaKey === 'name' ? ' tt-vertical' : '') +
        (metaKey === 'trainNo' ? ' tt-train-no' : '') +
        (metaKey === 'number' ? ' tt-number-cell' : '') +
        (metaKey === 'startStation' || metaKey === 'endStation' ? ' tt-overflow-cell' : '') +
        (isSelected ? ' tt-col-selected' : '') +
        (isEmptyCol ? ' tt-empty-col' : '');

    return (
        <th className={className} onMouseDown={handleDown} onMouseEnter={handleEnter}>
            <div className="tt-cell-inner">
                {isEmptyCol && metaKey === 'trainNo' ? (
                    <span className="tt-empty-col-hint" title="この列のセルをクリックすると新しい列車の時刻編集を開始します"></span>
                ) : metaKey === 'name' ? (
                    content
                        ?.split('\n')
                        .map((line, li) => <div key={li}>{line}</div>)
                ) : metaKey === 'number' ? (
                    content ? (
                        <>
                            <span>{content}</span>
                            <span>号</span>
                        </>
                    ) : null
                ) : (
                    content
                )}
            </div>
        </th>
    );
});

const TimeCell = React.memo(function TimeCell({
                                                  rowKey,
                                                  colIndex,
                                                  sub,
                                                  entry,
                                                  typeClassName,
                                                  isCellSelected,
                                                  isColSelected,
                                                  isEmptyCol,
                                                  onMouseDown,
                                                  onMouseEnter,
                                                  onDoubleClick,
                                                  stationId,
                                                  train,
                                              }) {
    const handleDown = useCallback((e) => onMouseDown(rowKey, colIndex, e), [onMouseDown, rowKey, colIndex]);
    const handleEnter = useCallback(() => onMouseEnter(rowKey, colIndex), [onMouseEnter, rowKey, colIndex]);

    const handleDouble = useCallback(() => {
        onDoubleClick(stationId, sub, train, entry[sub]);
    }, [onDoubleClick, stationId, sub, train, entry]);

    const value = entry.pass ? (sub === 'track' ? '' : 'ﾚ') : entry[sub];

    const className =
        'tt-time-cell' +
        (sub === 'track' ? ' tt-track-cell' : '') +
        (value === 'ﾚ' || value === 'レ' ? ' tt-cell-pass' : '') +
        (value ? ' ' + (typeClassName || '') : ' tt-empty') +
        (isCellSelected ? ' tt-cell-selected' : '') +
        (isColSelected ? ' tt-col-selected' : '') +
        (isEmptyCol ? ' tt-empty-col' : '');

    return (
        <td className={className}
            onMouseDown={handleDown}
            onMouseEnter={handleEnter}
            onDoubleClick={handleDouble}
        >
            {value || '・・'}
        </td>
    );
});

// ------------------------------------------------------------------
// TimetablePanel 本体
// ------------------------------------------------------------------

export function TimetablePanel({
                                   title = '下り時刻表',
                                   trains: trainsProp,
                                   stations: stationsProp,
                                   onClose,
                                   isActive = false,
                                   isOpen = true,
                                   onFocus,
                                   zIndex = 10,
                                   defaultPos = { x: 60, y: 60, width: 1000, height: 620 },
                               }) {
    const stations = stationsProp || REAL_STATIONS;
    const trains = trainsProp || REAL_TRAINS;
    const [trainList, setTrainList] = useState(() => trainsProp || REAL_TRAINS);

    // ② 編集中のセル情報を保持する State
    // 例: { train, stationId, sub, currentValue, rowKey, colIndex }
    const [editingCell, setEditingCell] = useState(null);
    // ダイヤ表示エリアの一番右に、常に1本だけ空列車列を追加する。
    // このEMPTY_TRAINは実データではなく表示専用(新規列車追加はここをクリックする入口)。
    const displayTrains = useMemo(() => [...trainList, EMPTY_TRAIN], [trainList]);
    const emptyColIndex = trainList.length;

    // 選択状態
    // selectedCells: Set<"rowKey|colIndex">   … セル単位の選択(縦方向の範囲を含む)
    // selectedColumns: Set<colIndex>          … 列(列車)単位の選択
    const [selectedCells, setSelectedCells] = useState(() => new Set());
    const [selectedColumns, setSelectedColumns] = useState(() => new Set());

    // ドラッグ中の状態は再レンダリングを起こさなくてよいので ref で保持
    const dragRef = useRef({
        active: false,
        mode: null, // 'cell' | 'column'
        anchorCol: null,
        baseCols: new Set(),
    });

    useEffect(() => {
        function endDrag() {
            dragRef.current.active = false;
            dragRef.current.mode = null;
        }
        window.addEventListener('mouseup', endDrag);
        return () => window.removeEventListener('mouseup', endDrag);
    }, []);

    const selectColumnRange = useCallback((anchorCol, currentCol, baseCols) => {
        const lo = Math.min(anchorCol, currentCol);
        const hi = Math.max(anchorCol, currentCol);
        const range = new Set(baseCols);
        for (let c = lo; c <= hi; c++) range.add(c);

        // 内容が変わっていなければ setState 自体をスキップし、無駄な再レンダリングを避ける
        setSelectedColumns((prev) => (setsEqual(prev, range) ? prev : range));
        setSelectedCells((prev) => (prev.size === 0 ? prev : new Set()));
    }, []);

    // --- 列ヘッダー(列車番号などのメタ行)操作 ---
    const handleHeaderMouseDown = useCallback(
        (colIndex, e) => {
            e.preventDefault();
            const ctrl = e.ctrlKey || e.metaKey;
            const base = ctrl ? new Set(selectedColumns) : new Set();
            dragRef.current = {
                active: true,
                mode: 'column',
                anchorCol: colIndex,
                anchorRowKey: null,
                baseCols: base,
            };
            const next = new Set(base);
            next.add(colIndex);
            setSelectedColumns(next);
            setSelectedCells(new Set());
        },
        [selectedColumns]
    );

    const handleHeaderMouseEnter = useCallback(
        (colIndex) => {
            const drag = dragRef.current;
            if (!drag.active || drag.mode !== 'column') return;
            selectColumnRange(drag.anchorCol, colIndex, drag.baseCols);
        },
        [selectColumnRange]
    );

    // --- 時刻セル(番線・発・着)操作 ---
    const handleCellMouseDown = useCallback((rowKey, colIndex, e) => {
        e.preventDefault();

        if (colIndex === emptyColIndex) {
            // 時刻編集への入り口としてのログ出力（今後の実装用）
            // return; を削除して、下の選択処理へ進ませる
        }

        // これ以降の処理が空列車列でも実行されるようになる
        dragRef.current = {
            active: true,
            mode: 'cell',
            anchorCol: colIndex,
            baseCols: new Set(),
        };
        setSelectedCells(new Set([`${rowKey}|${colIndex}`]));
        setSelectedColumns(new Set());
    }, [emptyColIndex]);

    const handleCellMouseEnter = useCallback(
        (rowKey, colIndex) => {
            const drag = dragRef.current;
            if (!drag.active) return;

            if (drag.mode === 'cell') {
                // セル選択中にドラッグでどこかへ移動したら(縦・横どちらでも)列選択へ遷移する
                drag.mode = 'column';
                drag.baseCols = new Set();
                selectColumnRange(drag.anchorCol, colIndex, drag.baseCols);
            } else if (drag.mode === 'column') {
                selectColumnRange(drag.anchorCol, colIndex, drag.baseCols);
            }
        },
        [selectColumnRange]
    );

    const isColSelected = (colIndex) => selectedColumns.has(colIndex);
    const isCellSelected = (rowKey, colIndex) =>
        selectedCells.has(`${rowKey}|${colIndex}`);

    // ④ 時刻/番線の保存処理
    const handleSaveValue = useCallback((newValue) => {
        if (!editingCell) return;

        const { train, stationId, sub } = editingCell;

        if (train.id === '__empty__') {
            // ▼ 空列車セルから編集した場合：新しい列車データを生成して末尾に追加
            const newTrain = {
                id: `train_${Date.now()}`,
                trainNo: '', // 仮の番号（必要に応じて入力ウィンドウで設定）
                duty: '',
                type: '普通',
                name: '',
                number: '',
                startStation: '',
                startWork: '',
                endStation: '',
                endWork: '',
                times: {
                    [stationId]: {
                        [sub]: newValue,
                    },
                },
            };
            setTrainList((prev) => [...prev, newTrain]);
        } else {
            // ▼ 既存列車のセルを編集した場合：該当セルのみ書き換え
            setTrainList((prev) =>
                prev.map((t) => {
                    if (t.id !== train.id) return t;
                    const prevStationTime = t.times[stationId] || {};
                    return {
                        ...t,
                        times: {
                            ...t.times,
                            [stationId]: {
                                ...prevStationTime,
                                [sub]: newValue,
                            },
                        },
                    };
                })
            );
        }

        // 編集終了
        setEditingCell(null);
    }, [editingCell]);


    const handleCellDoubleClick = useCallback((stationId, sub, train, currentValue) => {
        setEditingCell({
            train,
            stationId,
            sub,
            currentValue: currentValue || '',
        });
        console.log(stationId +"を編集")
    }, []);

    return (
        <Window
            title={title}
            onClose={onClose}
            isActive={isActive}
            isOpen={isOpen}
            onFocus={onFocus}
            zIndex={zIndex}
            defaultPos={defaultPos}
        >
            <div className="tt-scroll">
                <table className="tt-table">
                    <colgroup>
                        <col className="tt-col-label-major" />
                        <col className="tt-col-label-minor" />
                        {displayTrains.map((t) => (
                            <col key={t.id} className="tt-col-time" />
                        ))}
                    </colgroup>

                    <thead>
                    {META_ROWS.map((meta) => (
                        <tr key={meta.key}>
                            {meta.key === META_ROWS[0].key && (
                                <th
                                    className="tt-corner"
                                    colSpan={2}
                                    rowSpan={META_ROWS.length}
                                />
                            )}
                            {displayTrains.map((train, colIndex) => (
                                <HeaderCell
                                    key={train.id}
                                    colIndex={colIndex}
                                    metaKey={meta.key}
                                    content={train[meta.key]}
                                    typeClassName={(TRAIN_TYPES[train.type] || {}).className}
                                    isSelected={isColSelected(colIndex)}
                                    isEmptyCol={colIndex === emptyColIndex}
                                    onMouseDown={handleHeaderMouseDown}
                                    onMouseEnter={handleHeaderMouseEnter}
                                />
                            ))}
                        </tr>
                    ))}
                    </thead>

                    <tbody>
                    {stations.map((station) => {
                        const subRows = buildStationSubRows(station);
                        return subRows.map((sub, subIdx) => {
                            const rowKey = `${station.id}_${sub}`;
                            return (
                                <tr
                                    key={rowKey}
                                    className={sub === 'track' ? 'tt-track-row' : ''}
                                >
                                    {subIdx === 0 && (
                                        <td
                                            className={
                                                "tt-station-name" +
                                                (station.hasTrack === true ? ' tt-main-station' : '')
                                            }
                                            rowSpan={subRows.length}
                                        >
                                            {station.name}
                                        </td>
                                    )}
                                    <td className="tt-sub-label">{SUB_ROW_LABEL[sub]}</td>
                                    {displayTrains.map((train, colIndex) => (
                                        <TimeCell
                                            key={train.id}
                                            rowKey={rowKey}
                                            colIndex={colIndex}
                                            sub={sub}
                                            entry={train.times[station.id] || EMPTY_ENTRY}
                                            typeClassName={(TRAIN_TYPES[train.type] || {}).className}
                                            isCellSelected={isCellSelected(rowKey, colIndex)}
                                            isColSelected={isColSelected(colIndex)}
                                            isEmptyCol={colIndex === emptyColIndex}
                                            onMouseDown={handleCellMouseDown}
                                            onMouseEnter={handleCellMouseEnter}
                                            onDoubleClick={handleCellDoubleClick}
                                            stationId={station.id}
                                            train={train}
                                        />
                                    ))}
                                </tr>
                            );
                        });
                    })}
                    </tbody>
                </table>
            </div>

            {/* editingCell が存在するときだけ入力モーダルを表示 */}
            {editingCell && (
                <TimeInputModal
                    cellInfo={editingCell}
                    onSave={handleSaveValue}
                    onClose={() => setEditingCell(null)}
                />
            )}
        </Window>
    );
}