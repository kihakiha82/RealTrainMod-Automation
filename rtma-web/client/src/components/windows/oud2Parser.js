// oud2Parser.js
// OuDiaSecond2 (.oud2) ファイルを TimetablePanel が期待する
// { stations, trains } 形式に変換するブラウザ側パーサー。
//
// 対応範囲(現時点):
//   - 駅の並び・番線ラベル・発着表示形式(Ekijikokukeisiki)・番線表示可否(JikokuhyouTrackOmit)
//   - Dia. 内の Kudari./Nobori. それぞれの列車(Ressya.)の 列車番号・列車名・種別・EkiJikoku(時刻)
// 対応しない範囲(意図的にスコープ外):
//   - Station.json 相当の駅データ(番線→RailSegment 等)生成
//   - Route(系統)/waypoint 定義の生成
//   - 運用(Unyou)チェーンの解決(運用番号・始発駅作業・終着駅作業は空文字のまま)
//
// 単一の .oud2 テキストから Kudari/Nobori 両方を一度にパースして返す。
// TimetablePanel 側で方向を選んで使う。

const SYUBETSU_NAMES = [
    '普通', '快速', '急行', '特急', '区快',
    '寝台特急', '寝台急行', '貨物', '高速貨物', '回送',
];

function matchFirst(text, regex) {
    const m = text.match(regex);
    return m ? m[1] : null;
}

function matchAllGroups(text, regex) {
    return [...text.matchAll(regex)].map((m) => m[1]);
}

function splitOnce(s, sep) {
    const i = s.indexOf(sep);
    return i === -1 ? [s, ''] : [s.slice(0, i), s.slice(i + 1)];
}

// "44230" -> [4, 42] (末尾2桁は秒。存在しても表示上は切り捨てる)
function parseTimeHM(s) {
    const L = s.length;
    let hl;
    if (L === 3 || L === 4) hl = L - 2;
    else if (L === 5 || L === 6) hl = L - 4;
    else return null;
    const h = parseInt(s.slice(0, hl), 10);
    const m = parseInt(s.slice(hl, hl + 2), 10);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return [h, m];
}

function fmtHM(hm) {
    if (!hm) return null;
    const [h, m] = hm;
    return `${h}${m < 10 ? '0' + m : m}`;
}

// 駅の Ekijikokukeisiki を、見る方向(kudari/nobori)における 発/着 表示可否に変換する
function directionFlags(keisiki, direction) {
    switch (keisiki) {
        case 'Jikokukeisiki_Hatsu':
            return { hasDep: true, hasArr: false };
        case 'Jikokukeisiki_Chaku':
            return { hasDep: false, hasArr: true };
        case 'Jikokukeisiki_Hatsuchaku':
            return { hasDep: true, hasArr: true };
        case 'Jikokukeisiki_NoboriChaku':
            // 上り方向では着のみの終端駅、下り方向では発のみの起点駅として扱う
            return direction === 'nobori' ? { hasDep: false, hasArr: true } : { hasDep: true, hasArr: false };
        case 'Jikokukeisiki_KudariChaku':
            return direction === 'kudari' ? { hasDep: false, hasArr: true } : { hasDep: true, hasArr: false };
        default:
            return { hasDep: true, hasArr: false };
    }
}

function parseStationsForDirection(rosenPart, direction) {
    const blocks = rosenPart.split('Eki.\n').slice(1);
    return blocks.map((b, idx) => {
        const name = matchFirst(b, /^Ekimei=([^\n]+)/) || `駅${idx + 1}`;
        const keisiki = matchFirst(b, /Ekijikokukeisiki=([^\n]+)/) || 'Jikokukeisiki_Hatsu';
        const omit = matchFirst(b, /JikokuhyouTrackOmit=([^\n]+)/);
        const hasTrack = omit === null;
        const trackLabels = matchAllGroups(b, /TrackRyakusyou=([^\n]+)/g);
        const tracklists = matchAllGroups(b, /TrackName=([^\n]+)/g);
        const flags = directionFlags(keisiki, direction);
        const displayType = flags.hasDep && flags.hasArr ? 'arr_dep' : flags.hasArr ? 'arr_only' : 'dep_only';
        return {
            id: `st${idx}`,
            name,
            hasTrack,
            hasDep: flags.hasDep,
            hasArr: flags.hasArr,
            displayType, // TimetablePanel の buildStationSubRows はこちらを参照する
            _trackLabels: trackLabels,
            trackLists: tracklists,
        };
    });
}

function parseField(field, station) {
    if (field === '') return {};

    if (!field.includes(';')) {
        // 運行区間内・停車なし(通過): "<進入側番線Index>$<出発側番線Index>"
        const [beforeIdx, afterIdx] = splitOnce(field, '$');
        const idxStr = beforeIdx || afterIdx;
        const trackIdx = /^\d+$/.test(idxStr) ? parseInt(idxStr, 10) : null;
        let trackLabel = null;
        if (trackIdx !== null && station._trackLabels && trackIdx >= 0 && trackIdx < station._trackLabels.length) {
            trackLabel = station._trackLabels[trackIdx];
        }
        return trackLabel ? { pass: true, track: trackLabel } : { pass: true };
    }

    const [before, restRaw] = splitOnce(field, ';');
    let timesPart, after;
    if (restRaw.includes('$')) {
        const i = restRaw.lastIndexOf('$');
        timesPart = restRaw.slice(0, i);
        after = restRaw.slice(i + 1);
    } else {
        timesPart = restRaw;
        after = before;
    }

    const trackIdx = /^\d+$/.test(before) ? parseInt(before, 10) : null;
    let trackLabel = null;
    if (trackIdx !== null && station._trackLabels && trackIdx >= 0 && trackIdx < station._trackLabels.length) {
        trackLabel = station._trackLabels[trackIdx];
    }

    const entry = {};
    if (trackLabel) entry.track = trackLabel;

    if (timesPart.includes('/')) {
        const [chakuS, hatsuS] = splitOnce(timesPart, '/');
        if (chakuS) entry.arr = chakuS;
        if (hatsuS) entry.dep = hatsuS;

    } else if (timesPart) {
        const t = timesPart;
        if (station.hasDep && !station.hasArr) entry.dep = t;
        else if (station.hasArr && !station.hasDep) entry.arr = t;
        else entry.dep = t;
    }
    return entry;
}

function parseTrains(sectionText, stations) {
    const blocks = sectionText.split('Ressya.\n').slice(1);
    const trains = [];

    blocks.forEach((b, i) => {
        const syubetsu = matchFirst(b, /Syubetsu=([^\n]+)/);
        const bangou = matchFirst(b, /Ressyabangou=([^\n]+)/);
        const mei = matchFirst(b, /Ressyamei=([^\n]+)/);
        const gousu = matchFirst(b, /Gousuu=([^\n]+)/);
        const ekijikoku = matchFirst(b, /EkiJikoku=([^\n]*)/);
        const syuIdx = syubetsu !== null ? parseInt(syubetsu, 10) : 0;
        const raw = ekijikoku || '';
        const fields = raw.split(',');

        const times = {};
        let firstIdx = null;
        let lastIdx = null;
        stations.forEach((station, idx) => {
            const field = idx < fields.length ? fields[idx] : '';
            const entry = parseField(field, station);
            if (Object.keys(entry).length > 0) {
                times[station.id] = entry;
                if (firstIdx === null) firstIdx = idx;
                lastIdx = idx;
            }
        });
        if (firstIdx === null) return; // 有効な時刻を1つも持たない列車データはスキップ

        trains.push({
            id: `t${i}`,
            trainNo: bangou || '',
            duty: '',
            type: SYUBETSU_NAMES[syuIdx] || '普通',
            name: mei || '',
            number: gousu || '',
            startStation: stations[firstIdx].name,
            startWork: '',
            endStation: stations[lastIdx].name,
            endWork: '',
            times,
        });
    });

    return trains;
}

function stripInternalFields(stations) {
    return stations.map(({ _trackLabels, ...rest }) => rest);
}

function splitDiaSections(content) {
    const diaIdx = content.indexOf('Dia.');
    if (diaIdx === -1) {
        throw new Error('Dia.(ダイヤ)セクションが見つかりませんでした。有効な .oud2 ファイルか確認してください。');
    }
    const diaPart = content.slice(diaIdx);
    const kudariIdx = diaPart.indexOf('Kudari.');
    const noboriIdx = diaPart.indexOf('Nobori.');

    let kudariPart = '';
    let noboriPart = '';
    if (kudariIdx !== -1) {
        const end = noboriIdx !== -1 ? noboriIdx : diaPart.length;
        kudariPart = diaPart.slice(kudariIdx + 'Kudari.\n'.length, end);
    }
    if (noboriIdx !== -1) {
        noboriPart = diaPart.slice(noboriIdx + 'Nobori.\n'.length);
    }
    return { kudariPart, noboriPart };
}

/**
 * .oud2 のテキスト全文を受け取り、下り・上りそれぞれの
 * { stations, trains } を返す。
 *
 * @param {string} text  .oud2 ファイルの内容(BOM除去・改行正規化済みを推奨)
 * @returns {{ kudari: {stations, trains}, nobori: {stations, trains} }}
 */
export function parseOud2(text) {
    const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');

    const diaIdx = normalized.indexOf('Dia.');
    if (diaIdx === -1) {
        throw new Error('Dia.(ダイヤ)セクションが見つかりませんでした。有効な .oud2 ファイルか確認してください。');
    }
    const rosenPart = normalized.slice(0, diaIdx);
    if (!rosenPart.includes('Eki.\n')) {
        throw new Error('駅(Eki.)の定義が見つかりませんでした。');
    }

    const { kudariPart, noboriPart } = splitDiaSections(normalized);

    const result = { kudari: null, nobori: null };

    if (kudariPart) {
        const stationsKudari = parseStationsForDirection(rosenPart, 'kudari');
        const trains = parseTrains(kudariPart, stationsKudari);
        result.kudari = { stations: stationsKudari, trains };
    }
    if (noboriPart) {
        const stationsNobori = parseStationsForDirection(rosenPart, 'nobori');
        const trains = parseTrains(noboriPart, stationsNobori);
        result.nobori = { stations: stationsNobori, trains };
    }

    if (!result.kudari && !result.nobori) {
        throw new Error('Kudari./Nobori. のいずれの列車データも見つかりませんでした。');
    }

    return result;
}