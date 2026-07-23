const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { buildRouteProfile } = require('../client/calc/routeProfile');
const { resolveOrderedSegments } = require('../client/calc/orderedRouteResolver');
const { computeSpeedLimitProfile } = require('../client/calc/speedLimitProfile');
const { computeAccelProfile, DEFAULT_G } = require('../client/calc/accelProfile');
const { generateTimetable, tickToClock, clockToTick, TICKS_PER_SECOND } = require('../client/calc/timetableGenerator');
const { STOP_ICON_IDS, DEFAULT_STOP_ICON_ID } = require('../client/calc/stopIconShapes');
const { buildPath } = require('../client/calc/routeBuilder');
const { formationLength } = require('../client/calc/formation');
const { resolveStopVariant } = require('../client/calc/stopVariantResolver');

const app = express();
const PORT = process.env.PORT || 4500;

// RTMAのデータ保存先。Minecraftの saves/<ワールド名>/rtma/ を指す想定。
// 未設定の場合は動作確認用のサンプルデータを使う(実際のワールドが無くても試せる)。
const DATA_DIR = process.env.RTMA_DATA_DIR || path.join(__dirname, '..', 'sample-data');

app.use(express.json());

// クライアント(Vite+React)のビルド済み静的ファイルを配信する。
// 開発時はViteの開発サーバー(npm run dev、client/側)を別途使うのでdistは無くてもよい。
// 本番運用時は client/ で `npm run build` した後にこのサーバーだけ起動すればよい。
const clientDistDir = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));
}

// プレイヤーの顔アイコン画像
// (Mod側がログイン時に saves/<world>/rtma/images/players/<name>.png として保存する)
app.use('/images/players', express.static(path.join(DATA_DIR, 'images', 'players')));

// タイムテーブル計算結果の中にNaN/Infinityが紛れていないか検査する。
// JSON.stringifyはNaN/Infinityをnullに変換してしまうため、そのまま保存すると
// Mod側(TimetableLoader、double[]へのGsonデシリアライズ)がクラッシュする。
// 計算ロジック側の不備(想定外の入力による発散)を検出できるよう、
// 早期に分かりやすいエラーとして弾く。
function findNonFiniteNumber(value, pathPrefix = '') {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? null : pathPrefix || '(root)';
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const found = findNonFiniteNumber(value[i], `${pathPrefix}[${i}]`);
      if (found) return found;
    }
    return null;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      const found = findNonFiniteNumber(value[key], pathPrefix ? `${pathPrefix}.${key}` : key);
      if (found) return found;
    }
  }
  return null;
}

// rails-geometry.json(静的ジオメトリ) と rails-state.json(動的な開通状態等) を統合し、
// 従来のrails.json互換の配列(1レコード=1RailSegment)を返す。
// Mod側(RailWorldScanner/RailStore)が、分岐器の切替のたびに路線全体を書き直す無駄を
// 避けるために2ファイルへ分割して書き出すようになったため、Web側はここで統合する。
// ジオメトリファイルが無い/壊れている場合はnullを返す。状態ファイルが無い場合は
// (サーバー起動直後などでまだ書き出されていない場合)、状態は空として扱う。
function loadMergedRails() {
  const geometryPath = path.join(DATA_DIR, 'rails-geometry.json');
  const statePath = path.join(DATA_DIR, 'rails-state.json');

  let geometryList;
  try {
    geometryList = JSON.parse(fs.readFileSync(geometryPath, 'utf-8'));
  } catch {
    return null;
  }

  let stateList = [];
  try {
    stateList = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  } catch {
    stateList = [];
  }

  const stateById = new Map();
  for (const s of stateList) {
    if (s && s.id) {
      stateById.set(s.id, s);
    }
  }

  return geometryList.map((g) => {
    const s = stateById.get(g.id) || {};
    return {
      ...g,
      liveData: s.liveData ?? false,
      lastUpdatedTick: s.lastUpdatedTick ?? 0,
      isActiveRoute: s.isActiveRoute ?? null,
      activeRouteSource: s.activeRouteSource ?? null,
      pointMovements: s.pointMovements ?? null,
    };
  });
}

// レールデータ(読み取り専用。Mod側が書き出すrails-geometry.json/rails-state.jsonを統合して返す)
app.get('/api/rails', (req, res) => {
  const merged = loadMergedRails();
  if (!merged) {
    res.status(404).json({
      error: 'rails-geometry.jsonが見つかりません',
      path: path.join(DATA_DIR, 'rails-geometry.json'),
    });
    return;
  }
  res.json(merged);
});

// 選択されたレールを順序付き経路として受け取り、RouteProfile(距離順の1本の配列)を計算する。
// Web側(mapEngine/railGraph.js#findRailRoute)が組み立てた { id, reversed }[] を受け取り、
// サーバー側で保持しているrails-geometry.json/rails-state.json(source of truth)と
// 突き合わせて実体化してから計算する。
// body: { route: { id: string, reversed: boolean }[] }
app.post('/api/route-profile', (req, res) => {
  const { route } = req.body;
  if (!Array.isArray(route) || route.length === 0) {
    res.status(400).json({ error: 'routeは1件以上の { id, reversed } の配列である必要があります' });
    return;
  }

  const allSegments = loadMergedRails();
  if (!allSegments) {
    res.status(404).json({
      error: 'rails-geometry.jsonが見つかりません',
      path: path.join(DATA_DIR, 'rails-geometry.json'),
    });
    return;
  }

  try {
    const orderedSegments = resolveOrderedSegments(route, allSegments);
    const profile = buildRouteProfile(orderedSegments);
    res.json(profile);
  } catch (resolveErr) {
    // route中のidがrails-geometry.json側に見つからない等(路線が更新された場合に起こりうる)
    res.status(400).json({ error: resolveErr.message });
  }
});

// 簡易運行: 経路(始点→終点)+車両+出発時刻から「簡易スタフ」(発車・到着時刻と
// 速度プロファイル)を計算する。中間駅は無し(始点・終点の2駅だけの時刻表)。
// body: {
//   route: { id, reversed, sStart?, sEnd? }[],   // /api/route-profileと同じ形式
//   trainResourceName: string,                    // trainspecs.jsonのキー(例:"kiha600")
//   departure: { hour, minute, second },          // 出発時刻(日付はまだ扱わない簡易版)
// }
app.post('/api/simple-schedule', (req, res) => {
  const { route, trainResourceName, departure } = req.body;

  if (!Array.isArray(route) || route.length === 0) {
    res.status(400).json({ error: 'routeは1件以上の { id, reversed } の配列である必要があります' });
    return;
  }
  if (typeof trainResourceName !== 'string' || !trainResourceName) {
    res.status(400).json({ error: 'trainResourceNameが必要です' });
    return;
  }
  const { hour, minute, second } = departure || {};
  if (
      typeof hour !== 'number' || hour < 0 || hour > 23 ||
      typeof minute !== 'number' || minute < 0 || minute > 59 ||
      typeof second !== 'number' || second < 0 || second > 59
  ) {
    res.status(400).json({ error: '不正な出発時刻です({ hour, minute, second }が必要)' });
    return;
  }

  const specsPath = path.join(DATA_DIR, 'trainspecs.json');

  const allSegments = loadMergedRails();
  if (!allSegments) {
    res.status(404).json({
      error: 'rails-geometry.jsonが見つかりません',
      path: path.join(DATA_DIR, 'rails-geometry.json'),
    });
    return;
  }

  let trainSpecs;
  try {
    trainSpecs = JSON.parse(fs.readFileSync(specsPath, 'utf-8'));
  } catch {
    res.status(404).json({ error: 'trainspecs.jsonが見つかりません', path: specsPath });
    return;
  }

  const trainSpec = trainSpecs[trainResourceName];
  if (!trainSpec) {
    res.status(400).json({ error: `車両specが見つかりません: ${trainResourceName}` });
    return;
  }

  let profile;
  try {
    const orderedSegments = resolveOrderedSegments(route, allSegments);
    profile = buildRouteProfile(orderedSegments);
  } catch (resolveErr) {
    res.status(400).json({ error: resolveErr.message });
    return;
  }

  const { points } = profile;
  if (points.length < 2) {
    res.status(400).json({ error: '経路が短すぎます(点数が2未満)' });
    return;
  }
  const lastIndex = points.length - 1;

  const vmax = Math.max(...trainSpec.maxSpeedStages);
  const aAccelBase = trainSpec.acceleration;
  // ブレーキ性能はtrainspecs.jsonにまだ無いため、暫定的に加速度と同じ値を代用する。
  // 較正済みの値が用意でき次第、trainSpec側にフィールドを追加して差し替える。
  const aBrakeBase = trainSpec.acceleration;

  const vLimit = computeSpeedLimitProfile(points, { vmax, stationIndices: [0, lastIndex] });
  const { aAccelNet, aBrakeNet } = computeAccelProfile(points, {
    aAccelBase,
    aBrakeBase,
    g: DEFAULT_G,
  });

  const startTick = clockToTick(hour, minute, second);
  const stationIndices = [
    { name: '始点', index: 0, s: points[0].s },
    { name: '終点', index: lastIndex, s: points[lastIndex].s },
  ];

  let result;
  try {
    result = generateTimetable(points, vLimit, aAccelNet, aBrakeNet, stationIndices, { startTick });
  } catch (genErr) {
    res.status(400).json({ error: genErr.message });
    return;
  }

  // 各駅の時刻に、時計表示(時:分:秒)と日をまたいだかどうか(dayOffset)を添えて返す
  const secondsPerDay = 86400;
  const withClock = (tick) => ({
    ...tickToClock(tick),
    dayOffset: Math.floor(tick / TICKS_PER_SECOND / secondsPerDay),
  });
  const schedule = result.schedule.map((entry) => ({
    ...entry,
    arrivalClock: entry.arrivalTick != null ? withClock(entry.arrivalTick) : null,
    departureClock: entry.departureTick != null ? withClock(entry.departureTick) : null,
  }));

  const responseBody = {
    trainResourceName,
    departure,
    brakeSpecEstimated: true,
    totalLength: profile.totalLength,
    schedule,
  };

  // NaN/Infinityが紛れたまま保存すると、Mod側でのdouble[]デシリアライズが
  // クラッシュしてMinecraftサーバー自体が落ちてしまう(過去に発生した実例)。
  // 保存・応答前に必ず検査し、混入していたら500エラーとしてここで止める。
  const badPath = findNonFiniteNumber(responseBody);
  if (badPath) {
    console.error(`[simple-schedule] 非有限な値(NaN/Infinity)が計算結果に含まれています: ${badPath}`);
    res.status(500).json({
      error: `時刻表計算の結果に不正な値(NaN/Infinity)が含まれています: ${badPath}。` +
        '経路上のレール(極端なカント値等)を確認してください。',
    });
    return;
  }

  res.json(responseBody);
});

// 車両性能データ(読み取り専用。サーバー起動時に1回だけMod側が書き出すtrainspecs.jsonをそのまま返す)
app.get('/api/trainspecs', (req, res) => {
  const filePath = path.join(DATA_DIR, 'trainspecs.json');
  fs.readFile(filePath, 'utf-8', (err, data) => {
    if (err) {
      res.status(404).json({ error: 'trainspecs.jsonが見つかりません', path: filePath });
      return;
    }
    res.type('application/json').send(data);
  });
});

// ワールド内の列車状態(読み取り専用。マップ上への列車表示に使う)
app.get('/api/trains', (req, res) => {
  const filePath = path.join(DATA_DIR, 'trains.json');
  fs.readFile(filePath, 'utf-8', (err, data) => {
    if (err) {
      res.status(404).json({ error: 'trains.jsonが見つかりません', path: filePath });
      return;
    }
    res.type('application/json').send(data);
  });
});

// プレイヤー座標(読み取り専用。初期表示の中心をプレイヤー位置にするために使う)
app.get('/api/player', (req, res) => {
  const filePath = path.join(DATA_DIR, 'player.json');
  fs.readFile(filePath, 'utf-8', (err, data) => {
    if (err) {
      res.status(404).json({ error: 'player.jsonが見つかりません', path: filePath });
      return;
    }
    res.type('application/json').send(data);
  });
});

// 現在のRTMA時刻(読み取り専用。Web側でクライアントサイド補間して滑らかに表示する)
app.get('/api/time', (req, res) => {
  const filePath = path.join(DATA_DIR, 'time.json');
  fs.readFile(filePath, 'utf-8', (err, data) => {
    if (err) {
      res.status(404).json({ error: 'time.jsonが見つかりません', path: filePath });
      return;
    }
    res.type('application/json').send(data);
  });
});

// RTMA時刻の上書き(isServerRunning=falseのとき、Web側からMinecraft起動前の時刻を設定する)
// 次回Minecraft起動時にこのファイルを読み込んでRtmaCalendarDataを初期化する。
app.post('/api/time', (req, res) => {
  const { year, dayOfYear, hour, minute, second } = req.body;

  // 簡易バリデーション
  if (
      typeof year !== 'number' || year < 1 ||
      typeof dayOfYear !== 'number' || dayOfYear < 1 || dayOfYear > 365 ||
      typeof hour !== 'number' || hour < 0 || hour > 23 ||
      typeof minute !== 'number' || minute < 0 || minute > 59 ||
      typeof second !== 'number' || second < 0 || second > 59
  ) {
    res.status(400).json({ error: '不正な時刻データです' });
    return;
  }

  const filePath = path.join(DATA_DIR, 'time.json');
  const data = JSON.stringify({ mode: 'RTMA', year, dayOfYear, hour, minute, second }, null, 2);
  fs.writeFile(filePath, data, 'utf-8', (err) => {
    if (err) {
      res.status(500).json({ error: 'time.jsonへの書き込みに失敗しました' });
      return;
    }
    res.json({ ok: true });
  });
});

// 時刻表の読み込み
app.get('/api/timetables/:name', (req, res) => {
  const filePath = timetableFilePath(req.params.name);
  fs.readFile(filePath, 'utf-8', (err, data) => {
    if (err) {
      res.status(404).json({ error: '時刻表が見つかりません', path: filePath });
      return;
    }
    res.type('application/json').send(data);
  });
});

// 時刻表の一覧
app.get('/api/timetables', (req, res) => {
  const dir = path.join(DATA_DIR, 'timetables');
  fs.readdir(dir, (err, files) => {
    if (err) {
      res.json([]);
      return;
    }
    const names = files.filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
    res.json(names);
  });
});

// 時刻表の保存。Minecraftを起動していなくても保存できる(ファイルへの書き込みのみ)。
app.post('/api/timetables/:name', (req, res) => {
  const dir = path.join(DATA_DIR, 'timetables');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = timetableFilePath(req.params.name);
  fs.writeFile(filePath, JSON.stringify(req.body, null, 2), 'utf-8', (err) => {
    if (err) {
      res.status(500).json({ error: '保存に失敗しました' });
      return;
    }
    res.json({ ok: true });
  });
});

function timetableFilePath(name) {
  // 簡易的なパス traversal 対策
  const safeName = String(name).replace(/[^a-zA-Z0-9_\-]/g, '');
  return path.join(DATA_DIR, 'timetables', `${safeName}.json`);
}

// ── train-assignments(列車↔スタフの紐付け) ──────────────────────────────────
//
// train-assignments.json は Web側が書き、Mod側(AssignmentReader)が読む唯一のファイル。
// trains.json はMod→Web専用(読み取り専用)なので、逆方向の通信はこのファイルで行う。
// フォーマット: { "<uuid>": { "timetableName": string, "assignedAt": {h,m,s} } }

function assignmentFilePath() {
  return path.join(DATA_DIR, 'train-assignments.json');
}

function readAssignments() {
  try {
    return JSON.parse(fs.readFileSync(assignmentFilePath(), 'utf-8'));
  } catch {
    return {};
  }
}

function writeAssignments(assignments) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(assignmentFilePath(), JSON.stringify(assignments, null, 2), 'utf-8');
}

// 全紐付けを返す。trains.jsonの現在状態とマージして列車の現在位置・速度も添える
app.get('/api/train-assignments', (req, res) => {
  const assignments = readAssignments();

  // trains.jsonで現在ワールドにいる列車情報を付加する(いなければ空でよい)
  let trainsByUuid = {};
  try {
    const trains = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'trains.json'), 'utf-8'));
    for (const t of trains) trainsByUuid[t.uuid] = t;
  } catch { /* trains.jsonが無い(Minecraft未起動)場合は無視 */ }

  const result = {};
  for (const [uuid, entry] of Object.entries(assignments)) {
    result[uuid] = { ...entry, train: trainsByUuid[uuid] ?? null };
  }
  res.json(result);
});

// 指定列車にスタフを紐付ける
// body: { timetableName: string, assignedAt: { hour, minute, second } }
app.post('/api/train-assignments/:uuid', (req, res) => {
  const { uuid } = req.params;
  const { timetableName, assignedAt } = req.body;

  if (typeof timetableName !== 'string' || !timetableName) {
    res.status(400).json({ error: 'timetableNameが必要です' });
    return;
  }
  // 指定のスタフが実際に存在するか確認する
  if (!fs.existsSync(timetableFilePath(timetableName))) {
    res.status(404).json({ error: `スタフが見つかりません: ${timetableName}` });
    return;
  }

  const assignments = readAssignments();
  assignments[uuid] = { timetableName, assignedAt: assignedAt ?? null };
  writeAssignments(assignments);
  res.json({ ok: true, uuid, timetableName });
});

// 指定列車の紐付けを解除する
app.delete('/api/train-assignments/:uuid', (req, res) => {
  const { uuid } = req.params;
  const assignments = readAssignments();
  if (!assignments[uuid]) {
    res.status(404).json({ error: `uuid ${uuid} の紐付けが見つかりません` });
    return;
  }
  delete assignments[uuid];
  writeAssignments(assignments);
  res.json({ ok: true, uuid });
});

// ── Station/Route 共通ヘルパー ──────────────────────────────────────────
//
// 設計仕様書(rtma_station_route_design.md) 2章・3章・6章 に対応。
// Station.id / Route.id / Track.id / StopVariant.id / waypoint.id はすべてUUID。
// RailSegment.idと違い、これらは座標から再現できる値ではなく、ユーザーが編集で
// 能動的に作る意味的実体であり、座標・名前が変わっても実体としての同一性を
// 保つ必要があるため(詳細は設計仕様書1章)。

/**
 * プレフィックス付きUUIDを生成する。ログ・デバッグ時に一目で種類が判別できるよう、
 * RailSegment.id(座標由来のハッシュ値)や列車の生UUIDと見た目で区別する目的。
 */
function generateId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

/**
 * タグ配列を正規化する: 文字列以外・空文字を除去し、前後空白をtrimし、重複を除去する。
 * 表記(大文字小文字・かな漢字)自体は保持する(会社名等の正確な表記が大事なため)。
 * フィルタ検索時だけ、比較を大文字小文字・空白無視にする(呼び出し側の責務)。
 */
function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }
  const seen = new Set();
  const result = [];
  for (const tag of tags) {
    if (typeof tag !== 'string') continue;
    const trimmed = tag.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function readJsonArray(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeJsonArray(filePath, arr) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(arr, null, 2), 'utf-8');
}

// ── Station(駅) ────────────────────────────────────────────────────────
//
// station.json は Web側だけが読み書きする(Mod側は関与しない)。
// mod側が最終的に必要とするのは、時刻表計算(4章・簡易運行)を経て確定した
// 数値(停車位置のs等)であって、駅・番線という概念そのものではないため。

function stationFilePath() {
  return path.join(DATA_DIR, 'station.json');
}

/** Track1件のバリデーション。不正ならエラーメッセージ文字列を返す(問題無ければnull) */
function validateTrack(track, trackIndex) {
  if (typeof track.segmentId !== 'string' || !track.segmentId) {
    return `tracks[${trackIndex}].segmentIdは必須です`;
  }
  if (!Array.isArray(track.stops)) {
    return `tracks[${trackIndex}].stopsは配列である必要があります`;
  }
  if (track.color !== undefined && typeof track.color !== 'string') {
    return `tracks[${trackIndex}].colorは文字列である必要があります`;
  }
  for (let i = 0; i < track.stops.length; i++) {
    const stop = track.stops[i];
    if (typeof stop.trainResourceName !== 'string' || !stop.trainResourceName) {
      return `tracks[${trackIndex}].stops[${i}].trainResourceNameは必須です`;
    }
    if (!Number.isInteger(stop.carCount) || stop.carCount < 1) {
      return `tracks[${trackIndex}].stops[${i}].carCountは1以上の整数である必要があります`;
    }
    if (typeof stop.s !== 'number' || !Number.isFinite(stop.s)) {
      return `tracks[${trackIndex}].stops[${i}].sは有限な数値である必要があります`;
    }
    if (stop.color !== undefined && typeof stop.color !== 'string') {
      return `tracks[${trackIndex}].stops[${i}].colorは文字列である必要があります`;
    }
    if (stop.icon !== undefined && !STOP_ICON_IDS.includes(stop.icon)) {
      return `tracks[${trackIndex}].stops[${i}].iconは次のいずれかである必要があります: ${STOP_ICON_IDS.join(', ')}`;
    }
  }
  return null;
}

// ── Station削除/Track削除時の整合性処理(警告付き強制削除方式) ──────────────
//
// 「B: 警告付き強制削除」の実装。route.json内のwaypointが、削除されようとしている
// Station/Trackを参照している場合:
//   - force指定が無ければ削除をブロックし、参照しているRoute一覧を返す(409)
//   - force指定があれば、該当waypointをstationId/trackId=nullに格下げしてから
//     (waypoint自体とpathは維持=経路の形は壊さない)本体を削除する
// Station削除・Station更新でのTrack削除、どちらも同じロジックを共有する。

/**
 * stationId(と、指定があればtrackIdも)を参照しているwaypointを持つRouteを列挙する。
 * @param {Array} routes route.json全体
 * @param {string} stationId
 * @param {string|null} trackId 省略時はstationId一致のみで判定(Station全体の削除用)
 * @returns {Array<{ routeId: string, routeName: string, waypointIds: string[] }>}
 */
function findRoutesReferencing(routes, stationId, trackId = null) {
  const result = [];
  for (const route of routes) {
    const matchedWaypointIds = (route.waypoints ?? [])
      .filter((wp) => wp.stationId === stationId && (trackId === null || wp.trackId === trackId))
      .map((wp) => wp.id);
    if (matchedWaypointIds.length > 0) {
      result.push({ routeId: route.id, routeName: route.name, waypointIds: matchedWaypointIds });
    }
  }
  return result;
}

/**
 * 指定のstationId(・trackId)を参照しているwaypointを、その場でstationId/trackId=nullに
 * 格下げする(waypoint自体・segId/s/x/z・pathは変更しない=経路の形は壊れない)。
 * routes配列を直接書き換える(呼び出し側でwriteJsonArrayすること)。
 */
function downgradeReferencingWaypoints(routes, stationId, trackId = null) {
  for (const route of routes) {
    for (const wp of route.waypoints ?? []) {
      if (wp.stationId === stationId && (trackId === null || wp.trackId === trackId)) {
        wp.stationId = null;
        wp.trackId = null;
      }
    }
  }
}


/**
 * StationのPOST bodyを受け取り、新規id発行・既存id維持・tags正規化・バリデーションを行う。
 * 戻り値: { station, removedTrackIds } | { error }
 * removedTrackIds: 更新前には存在したが、今回のbodyに含まれなくなったtrack.id
 *   (Routeからの参照整合性処理に使う。新規作成時は常に空配列)
 */
function buildStationFromBody(body, existing) {
  const { name, tags, tracks, color } = body;

  if (typeof name !== 'string' || !name.trim()) {
    return { error: 'nameは必須です' };
  }
  if (tracks !== undefined && !Array.isArray(tracks)) {
    return { error: 'tracksは配列である必要があります' };
  }
  if (color !== undefined && typeof color !== 'string') {
    return { error: 'colorは文字列である必要があります' };
  }

  const normalizedTracks = (tracks ?? []).map((track, trackIndex) => {
    const err = validateTrack(track, trackIndex);
    if (err) throw new Error(err);

    const existingTrack = existing?.tracks?.find((t) => t.id === track.id);
    return {
      id: track.id && existingTrack ? track.id : generateId('track'),
      name: typeof track.name === 'string' ? track.name : '',
      segmentId: track.segmentId,
      reversed: !!track.reversed,
      color: track.color ?? existingTrack?.color ?? null,
      stops: track.stops.map((stop) => {
        const existingStop = existingTrack?.stops?.find((s) => s.id === stop.id);
        return {
          id: stop.id && existingStop ? stop.id : generateId('stop'),
          trainResourceName: stop.trainResourceName,
          carCount: stop.carCount,
          s: stop.s,
          color: stop.color ?? existingStop?.color ?? null,
          icon: stop.icon ?? existingStop?.icon ?? DEFAULT_STOP_ICON_ID,
        };
      }),
    };
  });

  const keptTrackIds = new Set(normalizedTracks.map((t) => t.id));
  const removedTrackIds = (existing?.tracks ?? [])
    .map((t) => t.id)
    .filter((id) => !keptTrackIds.has(id));

  return {
    station: {
      id: existing?.id ?? generateId('station'),
      name: name.trim(),
      tags: normalizeTags(tags),
      color: color ?? existing?.color ?? null,
      tracks: normalizedTracks,
    },
    removedTrackIds,
  };
}

app.get('/api/stations', (req, res) => {
  res.json(readJsonArray(stationFilePath()));
});

// 新規作成 or 更新(既存id指定時はupsert)
app.post('/api/stations', (req, res) => {
  const stations = readJsonArray(stationFilePath());
  const existing = req.body.id ? stations.find((s) => s.id === req.body.id) : null;

  let result;
  try {
    result = buildStationFromBody(req.body, existing);
  } catch (e) {
    res.status(400).json({ error: e.message });
    return;
  }
  if (result.error) {
    res.status(400).json({ error: result.error });
    return;
  }

  const { station, removedTrackIds } = result;

  // 更新でTrack(番線)が削除された場合、その番線を参照していたRouteのwaypointを
  // 強制的に格下げする(force指定不要。Station更新時は明示的な削除操作であり、
  // すでにこのTrackが無くなることをユーザーは把握しているため)。
  if (removedTrackIds.length > 0) {
    const routes = readJsonArray(routeFilePath());
    let anyChanged = false;
    for (const trackId of removedTrackIds) {
      const refs = findRoutesReferencing(routes, station.id, trackId);
      if (refs.length > 0) {
        downgradeReferencingWaypoints(routes, station.id, trackId);
        anyChanged = true;
      }
    }
    if (anyChanged) {
      writeJsonArray(routeFilePath(), routes);
    }
  }

  const idx = stations.findIndex((s) => s.id === station.id);
  if (idx >= 0) {
    stations[idx] = station;
  } else {
    stations.push(station);
  }
  writeJsonArray(stationFilePath(), stations);
  res.json(station);
});

// 駅の削除。他のRouteから参照されている場合は、デフォルトでは409を返しブロックする
// (「B: 警告付き強制削除」方式)。?force=true を付けると、参照しているwaypointを
// stationId/trackId=nullに格下げしてから削除を実行する。
app.delete('/api/stations/:id', (req, res) => {
  const stations = readJsonArray(stationFilePath());
  const idx = stations.findIndex((s) => s.id === req.params.id);
  if (idx < 0) {
    res.status(404).json({ error: `駅が見つかりません: ${req.params.id}` });
    return;
  }

  const routes = readJsonArray(routeFilePath());
  const referencingRoutes = findRoutesReferencing(routes, req.params.id);
  const force = req.query.force === 'true';

  if (referencingRoutes.length > 0 && !force) {
    res.status(409).json({
      error: 'この駅は他の路線から参照されているため削除できません。' +
        '?force=true を付けて再度削除すると、参照している経由点を通常の経由点(駅なし)に格下げしてから削除します。',
      referencingRoutes,
    });
    return;
  }

  if (referencingRoutes.length > 0) {
    downgradeReferencingWaypoints(routes, req.params.id);
    writeJsonArray(routeFilePath(), routes);
  }

  stations.splice(idx, 1);
  writeJsonArray(stationFilePath(), stations);
  res.json({ ok: true, id: req.params.id, downgradedRoutes: referencingRoutes.map((r) => r.routeId) });
});

// ── Route(路線) ────────────────────────────────────────────────────────
//
// route.json も station.json と同様、Web側だけが読み書きする。
// waypointsが真実源、pathは毎回再計算できる導出値(キャッシュ)。

function routeFilePath() {
  return path.join(DATA_DIR, 'route.json');
}

function validateWaypoint(wp, index) {
  if (typeof wp.segId !== 'string' || !wp.segId) {
    return `waypoints[${index}].segIdは必須です`;
  }
  if (typeof wp.s !== 'number' || !Number.isFinite(wp.s)) {
    return `waypoints[${index}].sは有限な数値である必要があります`;
  }
  // stationId/trackIdは片方だけ指定されている状態を許さない(駅化するなら両方必須)
  const hasStation = wp.stationId != null;
  const hasTrack = wp.trackId != null;
  if (hasStation !== hasTrack) {
    return `waypoints[${index}]はstationIdとtrackIdを両方指定するか、両方省略する必要があります`;
  }
  return null;
}

/**
 * RouteのPOST bodyを受け取り、新規id発行・既存id維持・tags正規化・バリデーション・
 * path再計算を行う。
 * 戻り値: { route } | { error, atIndex? }
 */
function buildRouteFromBody(body, existing, allSegments) {
  const { name, tags, waypoints } = body;

  if (typeof name !== 'string' || !name.trim()) {
    return { error: 'nameは必須です' };
  }
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    return { error: 'waypointsは2件以上の配列である必要があります' };
  }

  for (let i = 0; i < waypoints.length; i++) {
    const err = validateWaypoint(waypoints[i], i);
    if (err) return { error: err };
  }

  const normalizedWaypoints = waypoints.map((wp) => {
    const existingWp = existing?.waypoints?.find((w) => w.id === wp.id);
    return {
      id: wp.id && existingWp ? wp.id : generateId('wp'),
      segId: wp.segId,
      s: wp.s,
      x: wp.x ?? null,
      z: wp.z ?? null,
      stationId: wp.stationId ?? null,
      trackId: wp.trackId ?? null,
    };
  });

  const pathResult = buildPath(normalizedWaypoints, allSegments);
  if (pathResult.error) {
    return { error: `経路が繋がっていません(waypoints[${pathResult.atIndex}]付近)`, atIndex: pathResult.atIndex };
  }

  return {
    route: {
      id: existing?.id ?? generateId('route'),
      name: name.trim(),
      tags: normalizeTags(tags),
      waypoints: normalizedWaypoints,
      path: pathResult.path,
    },
  };
}

app.get('/api/routes', (req, res) => {
  res.json(readJsonArray(routeFilePath()));
});

// 新規作成 or 更新(既存id指定時はupsert)。pathはサーバー側で再計算する(真実源はwaypoints)。
app.post('/api/routes', (req, res) => {
  const allSegments = loadMergedRails();
  if (!allSegments) {
    res.status(404).json({
      error: 'rails-geometry.jsonが見つかりません',
      path: path.join(DATA_DIR, 'rails-geometry.json'),
    });
    return;
  }

  const routes = readJsonArray(routeFilePath());
  const existing = req.body.id ? routes.find((r) => r.id === req.body.id) : null;

  const result = buildRouteFromBody(req.body, existing, allSegments);
  if (result.error) {
    res.status(400).json({ error: result.error, atIndex: result.atIndex });
    return;
  }

  const { route } = result;
  const idx = routes.findIndex((r) => r.id === route.id);
  if (idx >= 0) {
    routes[idx] = route;
  } else {
    routes.push(route);
  }
  writeJsonArray(routeFilePath(), routes);
  res.json(route);
});

app.delete('/api/routes/:id', (req, res) => {
  const routes = readJsonArray(routeFilePath());
  const idx = routes.findIndex((r) => r.id === req.params.id);
  if (idx < 0) {
    res.status(404).json({ error: `路線が見つかりません: ${req.params.id}` });
    return;
  }
  routes.splice(idx, 1);
  writeJsonArray(routeFilePath(), routes);
  res.json({ ok: true, id: req.params.id });
});

app.listen(PORT, () => {
  console.log(`RTMA Web: http://localhost:${PORT}`);
  console.log(`データディレクトリ: ${DATA_DIR}`);
});