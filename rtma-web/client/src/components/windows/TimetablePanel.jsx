// TimetablePanel.jsx
import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Window } from '../Window';
import {
    stations as REAL_STATIONS,
    trains as REAL_TRAINS,
} from './timetableData';
import { parseOud2 } from './oud2Parser';
import './TimetablePanel.css';

const EMPTY_ENTRY = {};
// ------------------------------------------------------------------
// 実データ(米倉鉄道 江乃原線 下り時刻表)は timetableData.js から読み込む。
// stations: [{ id, name, hasTrack, hasDep, hasArr, displayType }, ...]
// trains:   [{ id, trainNo, duty, type, name, startStation, startWork,
//              endStation, endWork, times: { [stationId]: { track, dep, arr } } }, ...]
//
// .oud2 ファイルを直接読み込んで置き換えることもできる(oud2Parser.js 参照)。
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
function buildStationSubRows(station, isLast) {
    const rows = [];

    // routeStationSlots 側から渡ってくる想定のプロパティ
    // 指定がない場合は、最後の駅は 'arr_only'、それ以外は 'dep_only' とする
    const displayType = station.displayType || (isLast ? 'arr_only' : 'dep_only');

    if (displayType === 'arr_only' || displayType === 'arr_dep') {
        rows.push('arr');
    }

    // 番線の有無は今回のスコープ外のためそのまま
    if (station.hasTrack) {
        rows.push('track');
    }

    if (displayType === 'dep_only' || displayType === 'arr_dep') {
        rows.push('dep');
    }

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

/**
 * 時刻入力ポップアップ。
 *
 * 【今回の変更点】
 * 1. 発/着を別ウィンドウにせず、同じ駅・同じ列車の着時刻/発時刻を1つのポップアップで
 *    まとめて入力できるようにした(番線は今回のスコープ外のまま)。
 * 2. 汎用のWindowコンポーネント(ドラッグ可能な独立ウィンドウ)を使うのをやめ、
 *    ダブルクリックしたセルの真上に来るよう、そのセルのgetBoundingClientRect()を
 *    基準に position:fixed で直接配置するポップオーバーにした。
 *    Windowは「デフォルト位置に浮かぶ独立ウィンドウ」を想定したコンポーネントで、
 *    セルの位置に正確に追従させる用途には合わないため。
 *
 * anchorRect: ダブルクリックされたセルのgetBoundingClientRect()の結果
 * (left/top/width/height の値だけを渡ってきたプレーンオブジェクトとして保持)。
 * ポップアップの左下端がセルの左上端の少し上に来るよう、CSS側でtranslateY(-100%)している
 * (ポップアップ自体の高さをJS側で事前に知らなくて済むようにするため)。
 *
 * 【重要】このコンポーネントの外側(TimetablePanel)はWindow(react-rndの<Rnd>)の中に
 * あり、<Rnd>は位置決めにCSSのtransformを使っている。transformを持つ祖先の内側で
 * position:fixedを使うと、それは画面(ビューポート)ではなくその祖先が基準点になってしまい、
 * getBoundingClientRect()で取ったビューポート基準の座標とズレる。そのため
 * createPortal()でdocument.body直下に描画し、Rndの外に出すことでこれを回避している。
 */
function TimeInputModal({ cellInfo, stationName, onSave, onClose }) {
    const [arrValue, setArrValue] = useState(cellInfo.arr || '');
    const [depValue, setDepValue] = useState(cellInfo.dep || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ arr: arrValue, dep: depValue });
    };

    const { anchorRect } = cellInfo;

    return createPortal(
        <div className="tt-modal-overlay" onClick={onClose}>
            <div
                className="tt-modal-popover"
                style={{ left: anchorRect.left, top: anchorRect.top }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="tt-modal-title">{stationName} の時刻入力</div>
                <form onSubmit={handleSubmit}>
                    <div className="tt-modal-fields">
                        <label className="tt-modal-field">
                            <span>着</span>
                            <input
                                type="text"
                                value={arrValue}
                                onChange={(e) => setArrValue(e.target.value)}
                                placeholder="例: 1205"
                                autoFocus={cellInfo.clickedSub === 'arr'}
                            />
                        </label>
                        <label className="tt-modal-field">
                            <span>発</span>
                            <input
                                type="text"
                                value={depValue}
                                onChange={(e) => setDepValue(e.target.value)}
                                placeholder="例: 1206"
                                autoFocus={cellInfo.clickedSub === 'dep'}
                            />
                        </label>
                    </div>
                    <div className="tt-modal-actions">
                        <button type="button" onClick={onClose}>キャンセル</button>
                        <button type="submit">OK</button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
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
                    <span className="tt-empty-col-hint" title="この列のセルをクリックすると新しい列車の時刻編集を開始します">＋</span>
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
                                                  showSeconds,

                                              }) {
    const handleDown = useCallback((e) => onMouseDown(rowKey, colIndex, e), [onMouseDown, rowKey, colIndex]);
    const handleEnter = useCallback(() => onMouseEnter(rowKey, colIndex), [onMouseEnter, rowKey, colIndex]);



    // 発/着どちらの行をダブルクリックしても、同じ駅・同じ列車の着発をまとめて編集する
    // ポップアップを開く(番線行は今回のスコープ外)。ポップアップをセルの真上に
    // 出すため、このセル自身のgetBoundingClientRect()をここで取得して渡す。
    const handleDouble = useCallback((e) => {
        if (sub === 'track') return;
        const rect = e.currentTarget.getBoundingClientRect();
        onDoubleClick(stationId, train, entry, sub, {
            left: rect.left, top: rect.top, width: rect.width, height: rect.height,
        });
    }, [onDoubleClick, stationId, train, entry, sub]);

    const value = entry.pass ? (sub === 'track' ? '' : 'ﾚ') : entry[sub];

    const className =
        'tt-time-cell' +
        (sub === 'track' ? ' tt-track-cell' : '') +
        (value === 'ﾚ' || value === 'レ' ? ' tt-cell-pass' : '') +
        (value ? ' ' + (typeClassName || '') : ' tt-empty') +
        (isCellSelected ? ' tt-cell-selected' : '') +
        (isColSelected ? ' tt-col-selected' : '') +
        (isEmptyCol ? ' tt-empty-col' : '');

    const formatTimeDisplay = (timeVal, showSeconds) => {
        if (!timeVal) return '';
        const str = String(timeVal);

        if (showSeconds && str.substring(5, 6) === "") {
            if (str.length === 4) {
                return str + "00";
            }
            if (str.length === 3) {
                return str + "00";
            }

        }
        // 秒表示OFF かつ 6桁以上の場合は、最初の4桁(時分)だけ切り出して表示
        if (!showSeconds && str.length === 6) {
            return str.substring(0, 4);
        } else if (!showSeconds && str.length === 5) {
            return str.substring(0, 3);
        }
        return str;
    };

    let displayValue;
    if (entry.pass) {
        displayValue = sub === 'track' ? '' : 'ﾚ';
    } else if (sub === 'arr') {
        displayValue = formatTimeDisplay(entry.arr, showSeconds);
    } else if (sub === 'dep') {
        displayValue = formatTimeDisplay(entry.dep, showSeconds);
    } else if (sub === 'track') {
        displayValue = entry.track || '';
    } else {
        displayValue = value;
    }


    return (
        <td className={className}
            onMouseDown={handleDown}
            onMouseEnter={handleEnter}
            onDoubleClick={handleDouble}
        >
            {displayValue || '・・'}
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
    // --- .oud2 ファイル読み込み(ブラウザ側で即パース→即反映) ---
    // customData: { kudari: {stations, trains} | null, nobori: {stations, trains} | null } | null
    const [customData, setCustomData] = useState(null);
    const [direction, setDirection] = useState('kudari');
    const [loadedFileName, setLoadedFileName] = useState('');
    const [loadError, setLoadError] = useState(null);

    const activeParsed = customData ? customData[direction] : null;
    const stations = activeParsed?.stations || stationsProp || REAL_STATIONS;

    const [trainList, setTrainList] = useState(() => trainsProp || REAL_TRAINS);

    // customData(読み込んだファイル)や方向(下り/上り)が変わったら、
    // 編集中の trainList をその方向の列車データで丸ごと置き換える。
    // (既存データへの手編集は、新しいファイルを読み込んだ時点で破棄される)
    useEffect(() => {
        if (!activeParsed) return;
        setTrainList(activeParsed.trains);
        setSelectedCells(new Set());
        setSelectedColumns(new Set());
        setEditingCell(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeParsed]);

    const handleFileSelected = useCallback((e) => {
        const file = e.target.files && e.target.files[0];
        // 同じファイルを選び直しても onChange が発火するようにしておく
        e.target.value = '';
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = parseOud2(String(reader.result));
                setCustomData(parsed);
                setDirection(parsed.kudari ? 'kudari' : 'nobori');
                setLoadedFileName(file.name);
                setLoadError(null);
            } catch (err) {
                console.error(err);
                setLoadError(err.message || 'ファイルの解析に失敗しました');
            }
        };
        reader.onerror = () => setLoadError('ファイルの読み込みに失敗しました');
        reader.readAsText(file, 'utf-8');
    }, []);

    const displayTitle = customData
        ? `${direction === 'kudari' ? '下り' : '上り'}時刻表 - ${loadedFileName}`
        : title;

    // 編集中のセル情報を保持する State。
    // { train, stationId, arr, dep, anchorRect } | null
    const [editingCell, setEditingCell] = useState(null);
    const [showSeconds, setShowSeconds] = useState(false);

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
            // 時刻編集への入り口としてのログ出力(今後の実装用)
            console.log('[TimetablePanel] 空列車セルの編集を開始:', { rowKey, colIndex });
            // return; せず、下の選択処理へそのまま進める(選択自体は通常どおり行う)
        }

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

    // 発/着どちらのセルをダブルクリックしても、同じ駅・同じ列車の両方をまとめて
    // 編集できるポップアップを開く。entryには現在のarr/depが両方入っている。
    const handleCellDoubleClick = useCallback((stationId, train, entry, sub, anchorRect) => { // sub を受け取る
        setEditingCell({
            train,
            stationId,
            arr: entry.arr || '',
            dep: entry.dep || '',
            anchorRect,
            clickedSub: sub,
        });
    }, []);

    // 時刻/番線の保存処理。着/発をまとめて1回で書き込む。
    const handleSaveValue = useCallback(({ arr, dep }) => {
        if (!editingCell) return;

        const { train, stationId } = editingCell;
        const nextEntry = { arr, dep };

        if (train.id === '__empty__') {
            // ▼ 空列車セルから編集した場合: 新しい列車データを生成して末尾に追加
            const newTrain = {
                id: `train_${Date.now()}`,
                trainNo: '', // 仮の番号(必要に応じて別途、列車番号欄から入力する想定)
                duty: '',
                type: '普通',
                name: '',
                number: '',
                startStation: '',
                startWork: '',
                endStation: '',
                endWork: '',
                times: {
                    [stationId]: nextEntry,
                },
            };
            setTrainList((prev) => [...prev, newTrain]);
        } else {
            // ▼ 既存列車のセルを編集した場合: 該当駅の着発だけ書き換え
            setTrainList((prev) =>
                prev.map((t) => {
                    if (t.id !== train.id) return t;
                    return {
                        ...t,
                        times: {
                            ...t.times,
                            [stationId]: nextEntry,
                        },
                    };
                })
            );
        }

        setEditingCell(null);
    }, [editingCell]);

    const editingStationName = editingCell
        ? (stations.find((s) => s.id === editingCell.stationId)?.name ?? '')
        : '';

    return (
        <Window
            title={displayTitle}
            onClose={onClose}
            isActive={isActive}
            isOpen={isOpen}
            onFocus={onFocus}
            zIndex={zIndex}
            defaultPos={defaultPos}
        >
            <div className="tt-scroll">
                <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <label>
                        <input
                            type="checkbox"
                            checked={showSeconds}
                            onChange={(e) => setShowSeconds(e.target.checked)}
                        />
                        秒を表示する
                    </label>

                    {/* --- .oud2 読み込みツールバー ---
                        ブラウザ側で FileReader により直接読み込み、oud2Parser.js でパースして
                        その場で stations/trains を差し替える。サーバーへの送信は行わない。 */}
                    <label style={{ fontSize: '12px', cursor: 'pointer' }}>
                        <input
                            type="file"
                            accept=".oud2"
                            onChange={handleFileSelected}
                            style={{ display: 'none' }}
                        />
                        <span style={{ border: '1px solid #999', borderRadius: '3px', padding: '2px 8px' }}>
                            .oud2を読み込む
                        </span>
                    </label>

                    {customData && customData.kudari && customData.nobori && (
                        <label style={{ fontSize: '12px' }}>
                            方向:
                            <select
                                value={direction}
                                onChange={(e) => setDirection(e.target.value)}
                                style={{ marginLeft: '4px' }}
                            >
                                <option value="kudari">下り</option>
                                <option value="nobori">上り</option>
                            </select>
                        </label>
                    )}

                    {customData && !loadError && (
                        <span style={{ fontSize: '12px', color: '#555' }}>
                            {loadedFileName} を読み込み済み(列車 {trainList.length} 本)
                        </span>
                    )}

                    {loadError && (
                        <span style={{ fontSize: '12px', color: '#c00' }}>
                            読み込みエラー: {loadError}
                        </span>
                    )}
                </div>
                <table className="tt-table">
                    <colgroup>
                        <col className="tt-col-label-major" />
                        <col className="tt-col-label-minor" />
                        {displayTrains.map((t) => (
                            <col key={t.id} className="tt-col-time" style={showSeconds ? {width : "56px"} : {}} />
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
                    {stations.map((station, index) => {
                        const isLast = index === stations.length - 1; // 最後の駅かどうかの判定を追加
                        const subRows = buildStationSubRows(station, isLast); // isLast を渡す
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
                                            showSeconds={showSeconds}
                                        />
                                    ))}
                                </tr>
                            );
                        });
                    })}
                    </tbody>
                </table>
            </div>

            {/* editingCellが存在するときだけ、ダブルクリックしたセルの真上に入力ポップアップを表示 */}
            {editingCell && (
                <TimeInputModal
                    cellInfo={editingCell}
                    stationName={editingStationName}
                    onSave={handleSaveValue}
                    onClose={() => setEditingCell(null)}
                />
            )}
        </Window>
    );
}