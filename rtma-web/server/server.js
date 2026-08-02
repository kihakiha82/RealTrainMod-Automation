const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { buildRouteProfile, absoluteSToLocal, insertStations } = require('../client/calc/routeProfile');
const { resolveOrderedSegments } = require('../client/calc/orderedRouteResolver');
const { orderSegmentChain, deriveBoundaryPoints, findRailRoute } = require('../client/calc/railGraph');
const { computeSpeedLimitProfile } = require('../client/calc/speedLimitProfile');
const { computeAccelProfile, DEFAULT_G } = require('../client/calc/accelProfile');
const { generateTimetable, tickToClock, clockToTick, TICKS_PER_SECOND } = require('../client/calc/timetableGenerator');
const { STOP_ICON_IDS, DEFAULT_STOP_ICON_ID } = require('../client/calc/stopIconShapes');
const { assembleRouteTimetableSegments } = require('../client/calc/timetableAssembler');
const { TIMETABLE_SCHEMA_VERSION, validateTimetable, normalizeTimetable } = require('./timetableModel');

// stop.sの範囲検証時の許容誤差(浮動小数点の丸め誤差吸収用)
const EPS_STOP_S = 1e-6;
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

// 系統+駅の構内ルートを結合した、複数駅対応の本格的な時刻表計算。
// 再設計仕様書5.1節の実装。simple-scheduleと異なり、系統(Route)・駅の番線/停車位置・
// 構内ルート(Station.internalRoutes)を実際に結合してからRunningTimeCalculatorへ渡す。
// body: {
//   routeId: string,
//   trainResourceName: string,
//   departure: { hour, minute, second },
//   stationPlans: [                          // 経路上の駅の並び順(始発→…→終着)通りに指定する
//     { stationId, trackId, stopId, dwellTicks? },   // 停車
//     { stationId, pass: true },                     // 通過(中間駅のみ)
//     ...
//   ],
// }
app.post('/api/calc/route-timetable', (req, res) => {
  const { routeId, trainResourceName, departure, stationPlans } = req.body;

  if (typeof routeId !== 'string' || !routeId) {
    res.status(400).json({ error: 'routeIdが必要です' });
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
  if (!Array.isArray(stationPlans)) {
    res.status(400).json({ error: 'stationPlansは配列である必要があります' });
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

  const routes = readJsonArray(routeFilePath());
  const route = routes.find((r) => r.id === routeId);
  if (!route) {
    res.status(404).json({ error: `系統が見つかりません: ${routeId}` });
    return;
  }

  const stations = readJsonArray(stationFilePath());
  const stationsById = new Map(stations.map((s) => [s.id, s]));

  let assembled;
  try {
    assembled = assembleRouteTimetableSegments(route, stationPlans, stationsById, findRailRoute, allSegments);
  } catch (assembleErr) {
    res.status(400).json({ error: assembleErr.message });
    return;
  }

  let orderedSegments;
  try {
    orderedSegments = resolveOrderedSegments(assembled.segRefs, allSegments);
  } catch (resolveErr) {
    res.status(400).json({ error: resolveErr.message });
    return;
  }

  const profile = buildRouteProfile(orderedSegments);
  if (profile.points.length < 2) {
    res.status(400).json({ error: '経路が短すぎます(点数が2未満)' });
    return;
  }

  // 各駅の停止位置(segIndexAfter)を、結合後プロファイルの絶対sへ変換する。
  // (5.1節: enter/exit構内ルートの継ぎ目 = 停止位置そのものなので、再探索は不要)
  const stationsWithS = assembled.stationStops.map((st) => ({
    ...st,
    s: st.segIndexAfter >= orderedSegments.length
        ? profile.totalLength
        : profile.segmentOffsets[st.segIndexAfter].offsetS,
  }));

  const specsPath = path.join(DATA_DIR, 'trainspecs.json');
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

  const vmax = Math.max(...trainSpec.maxSpeedStages);
  const aAccelBase = trainSpec.acceleration;
  // ブレーキ性能はtrainspecs.jsonにまだ無いため、暫定的に加速度と同じ値を代用する(simple-scheduleと同様)。
  const aBrakeBase = trainSpec.acceleration;

  const stationsForProfile = insertStations(profile, stationsWithS.map((st) => ({ name: st.stationName, s: st.s })));

  const vLimit = computeSpeedLimitProfile(stationsForProfile.points, {
    vmax,
    stationIndices: stationsForProfile.stationIndices.map((si) => si.index),
  });
  const { aAccelNet, aBrakeNet } = computeAccelProfile(stationsForProfile.points, {
    aAccelBase,
    aBrakeBase,
    g: DEFAULT_G,
  });

  const startTick = clockToTick(hour, minute, second);
  const dwellTicksByStation = {};
  for (const st of stationsWithS) {
    dwellTicksByStation[st.stationName] = st.dwellTicks ?? 0;
  }

  let result;
  try {
    result = generateTimetable(
        stationsForProfile.points, vLimit, aAccelNet, aBrakeNet,
        stationsForProfile.stationIndices, { startTick, dwellTicksByStation },
    );
  } catch (genErr) {
    res.status(400).json({ error: genErr.message });
    return;
  }

  const secondsPerDay = 86400;
  const withClock = (tick) => ({
    ...tickToClock(tick),
    dayOffset: Math.floor(tick / TICKS_PER_SECOND / secondsPerDay),
  });
  // stationsWithS(駅ごとの番線・停車位置情報)と、generateTimetable()が返すschedule(時刻)を
  // 同じ並び順(始発→終着)で1つずつ対応させ、番線名等を時刻表エントリにマージする。
  const schedule = result.schedule.map((entry, i) => ({
    ...entry,
    stationId: stationsWithS[i]?.stationId ?? null,
    trackId: stationsWithS[i]?.trackId ?? null,
    trackName: stationsWithS[i]?.trackName ?? null,
    stopId: stationsWithS[i]?.stopId ?? null,
    arrivalClock: entry.arrivalTick != null ? withClock(entry.arrivalTick) : null,
    departureClock: entry.departureTick != null ? withClock(entry.departureTick) : null,
  }));

  const responseBody = {
    routeId,
    routeName: route.name,
    trainResourceName,
    departure,
    brakeSpecEstimated: true,
    totalLength: profile.totalLength,
    schedule,
    // 手順6の永続データモデルへ変換しやすいよう、駅計画も正規化して返す。
    // turnback(4.4節)はここではユーザー入力を信用せず、assembleRouteTimetableSegments()が
    // 進入・進出ルートのreversed比較から自動導出した値(assembled.stationStops)を採用する。
    // stationPlansには通過(pass)駅も含まれるが、assembled.stationStopsは停車駅のみ(pass駅は
    // recordStopが呼ばれない)なので、両者は同じ相対順序を保ったまま停車駅だけを消費して対応させる。
    stationPlans: (() => {
      let stopCursor = 0;
      return stationPlans.map((plan) => {
        if (plan.pass) {
          return { ...plan, handling: 'pass', turnback: false };
        }
        const derived = assembled.stationStops[stopCursor++];
        return { ...plan, handling: 'stop', turnback: derived?.turnback === true };
      });
    })(),
  };

  const badPath = findNonFiniteNumber(responseBody);
  if (badPath) {
    console.error(`[route-timetable] 非有限な値(NaN/Infinity)が計算結果に含まれています: ${badPath}`);
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

// 時刻表の一覧(一覧管理パネル用にメタデータ付きで返す)。
// schemaVersion===2の新形式(TimetableEditPanel由来)は系統名・列車・駅数を添えて返す。
// SimpleStaffPanel由来の旧形式(2駅間の使い捨てスタフ)はRoute/Stationと紐付いていない
// ため、name/kind:'legacy'のみを返す(一覧には出すが、再編集はUI側で無効化する想定)。
app.get('/api/timetables', (req, res) => {
  const dir = path.join(DATA_DIR, 'timetables');
  fs.readdir(dir, (err, files) => {
    if (err) {
      res.json([]);
      return;
    }
    const routesById = new Map(readJsonArray(routeFilePath()).map((route) => [route.id, route]));
    const result = files.filter((f) => f.endsWith('.json')).map((file) => {
      const name = file.replace(/\.json$/, '');
      let body = null;
      try {
        body = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
      } catch {
        return { name, kind: 'legacy' };
      }
      if (body && body.schemaVersion === TIMETABLE_SCHEMA_VERSION) {
        const route = routesById.get(body.routeId);
        return {
          name,
          kind: 'v2',
          routeId: body.routeId,
          routeName: route?.name ?? '(系統が見つかりません)',
          trainResourceName: body.trainResourceName,
          stationCount: (body.stationPlans ?? []).length,
        };
      }
      return { name, kind: 'legacy' };
    });
    res.json(result);
  });
});

// 時刻表の保存。Minecraftを起動していなくても保存できる(ファイルへの書き込みのみ)。
app.post('/api/timetables/:name', (req, res) => {
  const dir = path.join(DATA_DIR, 'timetables');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = timetableFilePath(req.params.name);
  let body = req.body;
  // 既存の simple-schedule 保存形式は Mod 互換のため受け入れる。新形式だけを
  // スキーマ検証し、系統・番線・停車位置への参照切れを保存時に防ぐ。
  if (body && body.schemaVersion === TIMETABLE_SCHEMA_VERSION) {
    const routesById = new Map(readJsonArray(routeFilePath()).map((route) => [route.id, route]));
    const stationsById = new Map(readJsonArray(stationFilePath()).map((station) => [station.id, station]));
    const error = validateTimetable(body, { routesById, stationsById });
    if (error) {
      res.status(400).json({ error });
      return;
    }
    body = normalizeTimetable(body);
  }
  fs.writeFile(filePath, JSON.stringify(body, null, 2), 'utf-8', (err) => {
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

/** この時刻表名(timetableName)を紐付けている列車(train-assignments)のuuidを列挙する */
function findAssignmentsReferencingTimetable(name) {
  const assignments = readAssignments();
  return Object.entries(assignments)
      .filter(([, entry]) => entry.timetableName === name)
      .map(([uuid]) => uuid);
}

// 時刻表の削除。列車に紐付け(train-assignments)されている場合はデフォルトでは409を返し
// ブロックする(系統削除・駅削除と同じ「警告付き強制削除」方式)。
// ?force=true を付けると、紐付けを解除してから削除する。
app.delete('/api/timetables/:name', (req, res) => {
  const filePath = timetableFilePath(req.params.name);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: '時刻表が見つかりません' });
    return;
  }

  const referencingUuids = findAssignmentsReferencingTimetable(req.params.name);
  const force = req.query.force === 'true';

  if (referencingUuids.length > 0 && !force) {
    res.status(409).json({
      error: 'この時刻表は列車に紐付けられているため削除できません。' +
          '?force=true を付けて再度削除すると、紐付けを解除してから削除します。',
      referencingUuids,
    });
    return;
  }

  if (referencingUuids.length > 0) {
    const assignments = readAssignments();
    for (const uuid of referencingUuids) delete assignments[uuid];
    writeAssignments(assignments);
  }

  fs.unlinkSync(filePath);
  res.json({ ok: true, name: req.params.name, unassignedUuids: referencingUuids });
});

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
  if (!Array.isArray(track.segmentIds) || track.segmentIds.length === 0) {
    return `tracks[${trackIndex}].segmentIdsは1件以上の配列である必要があります`;
  }
  if (!track.segmentIds.every((id) => typeof id === 'string' && id)) {
    return `tracks[${trackIndex}].segmentIdsの要素はすべて文字列である必要があります`;
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
 * stationIdを参照しているwaypointを持つRouteを列挙する(駅削除時の整合性チェック用)。
 * 【再設計に伴う変更】waypointはもはやtrackIdを保持しない(4番: 系統のwaypointから
 * trackIdを分離。番線選択は系統ではなく構内運行システム/ダイヤ側の責務になったため)。
 * そのため判定はstationId一致のみで行う。
 * @param {Array} routes route.json全体
 * @param {string} stationId
 * @returns {Array<{ routeId: string, routeName: string, waypointIds: string[] }>}
 */
function findRoutesReferencing(routes, stationId) {
  const result = [];
  for (const route of routes) {
    const matchedWaypointIds = (route.waypoints ?? [])
        .filter((wp) => wp.stationId === stationId)
        .map((wp) => wp.id);
    if (matchedWaypointIds.length > 0) {
      result.push({ routeId: route.id, routeName: route.name, waypointIds: matchedWaypointIds });
    }
  }
  return result;
}

/**
 * 指定のstationIdを参照しているwaypointを、その場でstationId=nullに格下げする
 * (waypoint自体・segId/s/x/z・pathは変更しない=経路の形は壊れない)。
 * routes配列を直接書き換える(呼び出し側でwriteJsonArrayすること)。
 */
function downgradeReferencingWaypoints(routes, stationId) {
  for (const route of routes) {
    for (const wp of route.waypoints ?? []) {
      if (wp.stationId === stationId) {
        wp.stationId = null;
      }
    }
  }
}


/**
 * StationのPOST bodyを受け取り、新規id発行・既存id維持・tags正規化・バリデーションを行う。
 * 戻り値: { station, removedTrackIds } | { error }
 * removedTrackIds: 更新前には存在したが、今回のbodyに含まれなくなったtrack.id
 *   (Routeからの参照整合性処理に使う。新規作成時は常に空配列)
 *
 * @param allSegments rails-geometry.json相当の全RailSegment。track.segmentIds(順不同の集合、
 *   クライアントの地図上での複数選択結果)から、実際に辿れる順序+reversedフラグ
 *   (track.segments)を導出するのに使う(再設計仕様書1.1.1節)。
 *   Routeのwaypoints→pathと同じ「真実源(segmentIds)をサーバー側で毎回再計算する」パターン。
 */
// ── 構内ルート事前生成(再設計仕様書4章) ──────────────────────────────────
//
// 駅データ(番線・停車位置・境界点)の保存の都度、想定されうる構内ルートを
// 全パターン事前生成し、station.internalRoutesとしてキャッシュする。
// ダイヤ生成時にその場でDijkstraを回す必要が無くなる(Route.pathやTrack.segments
// と同じ「真実源から毎回再計算・永続化」パターン)。

/**
 * 境界点(の代表するsegmentEnds[0])を、findRailRouteが受け取れる
 * { segId, s } 形式に変換する。境界点は定義上必ずセグメントの端点(s=0またはs=length)
 * に一致するので、仮想ノードのトリム計算は発生しない。
 */
function boundaryToRoutePoint(boundary, allSegments) {
  const rep = boundary.segmentEnds?.[0];
  if (!rep) return null;
  const seg = allSegments.find((s) => s.id === rep.segmentId);
  if (!seg) return null;
  return { segId: rep.segmentId, s: rep.end === 'start' ? 0 : (seg.length ?? 0) };
}

/**
 * 番線内累積距離(stop.s)を、findRailRouteが受け取れる{ segId, s }形式に変換する。
 * 0番で実装したbuildRouteProfile/absoluteSToLocal(セグメント列→絶対s変換)を、
 * 番線自身のsegments列に対して使う(1.1.1節で共通ユーティリティ化した狙い通りの再利用)。
 */
function stopToRoutePoint(track, stop, allSegments) {
  const orderedSegments = (track.segments ?? []).map((ts) => {
    const seg = allSegments.find((s) => s.id === ts.segmentId);
    return seg ? { ...seg, reversed: ts.reversed } : null;
  });
  if (orderedSegments.some((s) => s == null)) return null;

  const profile = buildRouteProfile(orderedSegments);
  const local = absoluteSToLocal(profile.segmentOffsets, stop.s);
  if (!local) return null;
  return { segId: local.id, s: local.localS };
}

/**
 * 駅の構内範囲(railSegmentIds)・番線・停車位置・境界点から、想定されうる
 * 構内ルートを全パターン生成する(4.3節)。
 *
 * 生成するのは以下の3種類:
 *   1. enter:   入口(境界点) → 停車位置
 *   2. exit:    停車位置 → 出口(境界点)
 *   3. through: 入口(境界点) → 出口(境界点)(通過、停車しない)
 *
 * 境界点タイプ(in/out/both)で組み合わせを絞り込む:
 *   in専用の境界点  → 入口としてのみ使う(enter, throughの入口側)
 *   out専用の境界点 → 出口としてのみ使う(exit, throughの出口側)
 *   both           → 入口・出口どちらでも使う
 * (単線折返し駅は、進入・進出が同じ境界点になるが、bothのままにしておけば
 *  enterとexitが両方とも自動生成されるので、折返し駅専用のロジックは不要 — 4.4節)
 *
 * 探索グラフは駅のrailSegmentIdsに絞った小さな部分集合に限定する
 * (findRailRoute自体は汎用なので、渡すsegments集合を絞るだけで済む)。
 */
function generateStationInternalRoutes(station, allSegments) {
  const stationSegments = allSegments.filter((s) => (station.railSegmentIds ?? []).includes(s.id));
  const boundaries = station.boundaryPoints ?? [];
  const entryBoundaries = boundaries.filter((b) => (b.type ?? 'both') !== 'out');
  const exitBoundaries = boundaries.filter((b) => (b.type ?? 'both') !== 'in');

  const allStops = [];
  for (const track of station.tracks ?? []) {
    for (const stop of track.stops ?? []) {
      allStops.push({ track, stop });
    }
  }

  const routes = [];
  let counter = 0;
  const nextId = () => `introute_${counter++}`;

  // 1. 入口 → 停車位置
  for (const boundary of entryBoundaries) {
    const entryPoint = boundaryToRoutePoint(boundary, allSegments);
    if (!entryPoint) continue;
    for (const { track, stop } of allStops) {
      const stopPoint = stopToRoutePoint(track, stop, allSegments);
      if (!stopPoint) continue;
      const path = findRailRoute(stationSegments, entryPoint, stopPoint);
      if (!path) continue; // 到達不能(railSegmentIdsの設定漏れ等)。無効な組み合わせとして自然にスキップ
      routes.push({
        id: nextId(), type: 'enter',
        entryNodeKey: boundary.nodeKey, trackId: track.id, stopId: stop.id,
        path,
      });
    }
  }

  // 2. 停車位置 → 出口
  for (const boundary of exitBoundaries) {
    const exitPoint = boundaryToRoutePoint(boundary, allSegments);
    if (!exitPoint) continue;
    for (const { track, stop } of allStops) {
      const stopPoint = stopToRoutePoint(track, stop, allSegments);
      if (!stopPoint) continue;
      const path = findRailRoute(stationSegments, stopPoint, exitPoint);
      if (!path) continue;
      routes.push({
        id: nextId(), type: 'exit',
        trackId: track.id, stopId: stop.id, exitNodeKey: boundary.nodeKey,
        path,
      });
    }
  }

  // 3. 入口 → 出口(通過)
  for (const entryBoundary of entryBoundaries) {
    const entryPoint = boundaryToRoutePoint(entryBoundary, allSegments);
    if (!entryPoint) continue;
    for (const exitBoundary of exitBoundaries) {
      if (exitBoundary.nodeKey === entryBoundary.nodeKey) continue; // 同一境界点への折返し通過は意味を持たないため除外
      const exitPoint = boundaryToRoutePoint(exitBoundary, allSegments);
      if (!exitPoint) continue;
      const path = findRailRoute(stationSegments, entryPoint, exitPoint);
      if (!path) continue;
      routes.push({
        id: nextId(), type: 'through',
        entryNodeKey: entryBoundary.nodeKey, exitNodeKey: exitBoundary.nodeKey,
        path,
      });
    }
  }

  return routes;
}

/**
 * 生のinternalRoute({ id, type, entryNodeKey?, exitNodeKey?, trackId?, stopId?, path })は
 * trackId/stopId/nodeKeyのIDだけで読みにくいため、デバッグ用エンドポイント
 * (GET /api/stations/:id/internal-routes)向けに、番線名・停車位置詳細・境界点座標を
 * 解決し、経路の総距離(buildRouteProfileで実際のサンプル距離から計算)も添えて返す。
 */
function annotateInternalRoute(route, station, allSegments) {
  const track = route.trackId ? (station.tracks ?? []).find((t) => t.id === route.trackId) : null;
  const stop = track && route.stopId ? (track.stops ?? []).find((s) => s.id === route.stopId) : null;
  const entryBoundary = route.entryNodeKey
      ? (station.boundaryPoints ?? []).find((b) => b.nodeKey === route.entryNodeKey) : null;
  const exitBoundary = route.exitNodeKey
      ? (station.boundaryPoints ?? []).find((b) => b.nodeKey === route.exitNodeKey) : null;

  const orderedSegments = route.path
      .map((p) => {
        const seg = allSegments.find((s) => s.id === p.id);
        return seg ? { ...seg, reversed: p.reversed, sStart: p.sStart, sEnd: p.sEnd } : null;
      })
      .filter(Boolean);
  const profile = orderedSegments.length === route.path.length ? buildRouteProfile(orderedSegments) : null;

  return {
    id: route.id,
    type: route.type,
    entry: entryBoundary ? { nodeKey: entryBoundary.nodeKey, x: entryBoundary.x, z: entryBoundary.z, type: entryBoundary.type } : null,
    exit: exitBoundary ? { nodeKey: exitBoundary.nodeKey, x: exitBoundary.x, z: exitBoundary.z, type: exitBoundary.type } : null,
    track: track ? { id: track.id, name: track.name } : null,
    stop: stop ? { id: stop.id, trainResourceName: stop.trainResourceName, carCount: stop.carCount, s: stop.s } : null,
    segmentCount: route.path.length,
    // rails-geometry.json側でセグメントが見つからなかった場合(削除済み等)はnull
    approxLength: profile ? Number(profile.totalLength.toFixed(2)) : null,
    path: route.path,
  };
}

/**
 * StationのPOST bodyを受け取り、新規id発行・既存id維持・tags正規化・バリデーションを行う。
 * 戻り値: { station, removedTrackIds } | { error }
 * removedTrackIds: 更新前には存在したが、今回のbodyに含まれなくなったtrack.id
 *   (Routeからの参照整合性処理に使う。新規作成時は常に空配列)
 *
 * @param allSegments rails-geometry.json相当の全RailSegment。track.segmentIds(順不同の集合、
 *   クライアントの地図上での複数選択結果)から、実際に辿れる順序+reversedフラグ
 *   (track.segments)を導出するのに使う(再設計仕様書1.1.1節)。
 *   Routeのwaypoints→pathと同じ「真実源(segmentIds)をサーバー側で毎回再計算する」パターン。
 */
function buildStationFromBody(body, existing, allSegments) {
  const { name, tags, tracks, color, railSegmentIds, boundaryOverrides } = body;

  if (typeof name !== 'string' || !name.trim()) {
    return { error: 'nameは必須です' };
  }
  if (tracks !== undefined && !Array.isArray(tracks)) {
    return { error: 'tracksは配列である必要があります' };
  }
  if (color !== undefined && typeof color !== 'string') {
    return { error: 'colorは文字列である必要があります' };
  }
  if (railSegmentIds !== undefined) {
    if (!Array.isArray(railSegmentIds) || !railSegmentIds.every((id) => typeof id === 'string' && id)) {
      return { error: 'railSegmentIdsは文字列の配列である必要があります' };
    }
  }
  const validBoundaryTypes = new Set(['in', 'out', 'both']);
  if (boundaryOverrides !== undefined) {
    if (typeof boundaryOverrides !== 'object' || boundaryOverrides === null || Array.isArray(boundaryOverrides)) {
      return { error: 'boundaryOverridesはオブジェクトである必要があります' };
    }
    for (const [key, value] of Object.entries(boundaryOverrides)) {

      if (!validBoundaryTypes.has(value)) {
        return { error: `boundaryOverrides["${key}"]は in/out/both のいずれかである必要があります` };
      }
    }
  }

  const normalizedTracks = [];
  for (let trackIndex = 0; trackIndex < (tracks ?? []).length; trackIndex++) {
    const track = tracks[trackIndex];
    const err = validateTrack(track, trackIndex);
    if (err) return { error: err };

    const orderResult = orderSegmentChain(allSegments, track.segmentIds);
    if (orderResult.error) {
      return { error: `tracks[${trackIndex}]: ${orderResult.error}` };
    }
    const orderedSegments = orderResult.ordered;

    // 番線の総延長(stop.sの範囲検証に使う)。各セグメントの物理長(RailSegment.length)を単純合算する
    // (buildRouteProfileのようなサンプル単位の正確な距離ではないが、範囲チェック用途には十分)
    const totalLength = orderedSegments.reduce((sum, os) => {
      const seg = allSegments.find((s) => s.id === os.segmentId);
      return sum + (seg?.length ?? 0);
    }, 0);

    const existingTrack = existing?.tracks?.find((t) => t.id === track.id);

    const normalizedStops = [];
    for (let i = 0; i < track.stops.length; i++) {
      const stop = track.stops[i];
      if (stop.s < -EPS_STOP_S || stop.s > totalLength + EPS_STOP_S) {
        return {
          error: `tracks[${trackIndex}].stops[${i}].s(${stop.s})が番線の総延長(${totalLength.toFixed(2)})の範囲外です`,
        };
      }
      const existingStop = existingTrack?.stops?.find((s) => s.id === stop.id);
      normalizedStops.push({
        id: stop.id && existingStop ? stop.id : generateId('stop'),
        trainResourceName: stop.trainResourceName,
        carCount: stop.carCount,
        s: stop.s,
        color: stop.color ?? existingStop?.color ?? null,
        icon: stop.icon ?? existingStop?.icon ?? DEFAULT_STOP_ICON_ID,
      });
    }

    normalizedTracks.push({
      id: track.id && existingTrack ? track.id : generateId('track'),
      name: typeof track.name === 'string' ? track.name : '',
      segmentIds: track.segmentIds,
      segments: orderedSegments,
      color: track.color ?? existingTrack?.color ?? null,
      stops: normalizedStops,
    });
  }

  const keptTrackIds = new Set(normalizedTracks.map((t) => t.id));
  const removedTrackIds = (existing?.tracks ?? [])
      .map((t) => t.id)
      .filter((id) => !keptTrackIds.has(id));

  const finalRailSegmentIds = railSegmentIds ?? existing?.railSegmentIds ?? [];
  const finalBoundaryOverrides = boundaryOverrides ?? existing?.boundaryOverrides ?? {};

  // 境界点はrailSegmentIdsから毎回導出する(Route.pathやTrack.segmentsと同じ、
  // 「真実源をサーバー側で毎回再計算し、キャッシュとして永続化する」パターン)。
  // タイプ(in/out/both)はboundaryOverridesに明示指定が無ければデフォルト"both"とする。
  const derivedBoundaries = deriveBoundaryPoints(allSegments, finalRailSegmentIds);
  // finalBoundaryOverridesのうち、現在実在するnodeKeyに対応しないもの(構内範囲を
  // 変更した結果、消滅した境界点への古い上書き設定)は保存時に自動で刈り取る。
  // これはRoute.pathやTrack.segmentsと同じ「真実源から毎回再計算する」パターンの延長で、
  // 6節#4(駅データ変更時の整合性)のうち境界点タイプに関する部分をここで解決する。
  const validNodeKeys = new Set(derivedBoundaries.map((b) => b.nodeKey));
  const prunedBoundaryOverrides = {};
  for (const [key, value] of Object.entries(finalBoundaryOverrides)) {
    if (validNodeKeys.has(key)) prunedBoundaryOverrides[key] = value;
  }
  const boundaryPoints = derivedBoundaries.map((b) => ({
    nodeKey: b.nodeKey,
    x: b.x,
    y: b.y,
    z: b.z,
    segmentEnds: b.segmentEnds,
    type: prunedBoundaryOverrides[b.nodeKey] ?? 'both',
  }));

  const station = {
    id: existing?.id ?? generateId('station'),
    name: name.trim(),
    tags: normalizeTags(tags),
    color: color ?? existing?.color ?? null,
    tracks: normalizedTracks,
    railSegmentIds: finalRailSegmentIds,
    boundaryOverrides: prunedBoundaryOverrides,
    boundaryPoints,
  };
  // 構内ルートは駅の他のフィールド(番線・停車位置・境界点)が全て確定した後、
  // 保存の都度再生成する(4.3節: 生成タイミングは駅データ保存時)。
  station.internalRoutes = generateStationInternalRoutes(station, allSegments);

  return { station, removedTrackIds };
}

app.get('/api/stations', (req, res) => {
  res.json(readJsonArray(stationFilePath()));
});

// デバッグ用: 特定駅のinternalRoutes(構内ルート)を、trackId/stopId/nodeKeyを実際の
// 番線名・停車位置詳細・境界点座標に解決した、読みやすい形式で返す。
// 想定外のルートが生成されていないかを確認する用途(地図表示は不要とのことなのでJSON応答のみ)。
app.get('/api/stations/:id/internal-routes', (req, res) => {
  const stations = readJsonArray(stationFilePath());
  const station = stations.find((s) => s.id === req.params.id);
  if (!station) {
    res.status(404).json({ error: `駅が見つかりません: ${req.params.id}` });
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

  const routes = (station.internalRoutes ?? []).map((r) => annotateInternalRoute(r, station, allSegments));
  res.json({
    stationId: station.id,
    stationName: station.name,
    count: routes.length,
    // typeごとの内訳も添えておく(想定件数とのズレにすぐ気づけるように)
    countByType: {
      enter: routes.filter((r) => r.type === 'enter').length,
      exit: routes.filter((r) => r.type === 'exit').length,
      through: routes.filter((r) => r.type === 'through').length,
    },
    routes,
  });
});

// 新規作成 or 更新(既存id指定時はupsert)
app.post('/api/stations', (req, res) => {
  const stations = readJsonArray(stationFilePath());
  const existing = req.body.id ? stations.find((s) => s.id === req.body.id) : null;

  const allSegments = loadMergedRails();
  if (!allSegments) {
    res.status(404).json({
      error: 'rails-geometry.jsonが見つかりません',
      path: path.join(DATA_DIR, 'rails-geometry.json'),
    });
    return;
  }

  let result;
  try {
    result = buildStationFromBody(req.body, existing, allSegments);
  } catch (e) {
    res.status(400).json({ error: e.message });
    return;
  }
  if (result.error) {
    res.status(400).json({ error: result.error });
    return;
  }

  const { station, removedTrackIds: _removedTrackIds } = result;
  // 【再設計に伴う変更】以前はここでremovedTrackIds(削除された番線)を参照している
  // Route.waypointを格下げしていたが、waypointはもはやtrackIdを保持しないため
  // (4番: 系統のwaypointからtrackIdを分離)、番線の削除がRoute側に影響することは無い。
  // Station全体の削除(DELETE /api/stations/:id)側の整合性チェックのみ引き続き必要。


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
  const lines = readJsonArray(lineFilePath());
  const referencingLines = findLinesReferencingStation(lines, req.params.id);
  const force = req.query.force === 'true';

  if ((referencingRoutes.length > 0 || referencingLines.length > 0) && !force) {
    res.status(409).json({
      error: 'この駅は他の系統・路線から参照されているため削除できません。' +
          '?force=true を付けて再度削除すると、系統側は経由点を通常の経由点(駅なし)に格下げし、' +
          '路線側は所属駅リストからこの駅を取り除いてから削除します。',
      referencingRoutes,
      referencingLines,
    });
    return;
  }

  if (referencingRoutes.length > 0) {
    downgradeReferencingWaypoints(routes, req.params.id);
    writeJsonArray(routeFilePath(), routes);
  }
  if (referencingLines.length > 0) {
    downgradeReferencingLines(lines, req.params.id);
    writeJsonArray(lineFilePath(), lines);
  }

  stations.splice(idx, 1);
  writeJsonArray(stationFilePath(), stations);
  res.json({
    ok: true,
    id: req.params.id,
    downgradedRoutes: referencingRoutes.map((r) => r.routeId),
    downgradedLines: referencingLines.map((l) => l.lineId),
  });
});

// ── Route(系統) ────────────────────────────────────────────────────────
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
  // 【再設計に伴う変更】trackIdはwaypointから廃止(4番: 系統のwaypointからtrackIdを分離)。
  // 番線選択は構内運行システム/ダイヤ側の責務になったため、系統側はstationIdのみ持つ。
  if (wp.trackId !== undefined && wp.trackId !== null) {
    return `waypoints[${index}].trackIdはもはや使用されません(番線選択は駅の構内運行システム側で行います)`;
  }
  return null;
}

/**
 * waypointの{segId, s}が、指定されたstationの境界点(boundaryPoints)のいずれかと
 * 座標的に一致するかを判定する(4番: 系統のwaypointは境界点にのみ紐づけられる)。
 * 一致する境界点があればそれを返し、無ければnullを返す。
 */
function findMatchingBoundary(station, segId, s, allSegments) {
  const EPS = 1e-3;
  for (const boundary of station.boundaryPoints ?? []) {
    for (const se of boundary.segmentEnds ?? []) {
      if (se.segmentId !== segId) continue;
      const seg = allSegments.find((s2) => s2.id === segId);
      if (!seg) continue;
      const expectedS = se.end === 'start' ? 0 : (seg.length ?? 0);
      if (Math.abs(s - expectedS) <= EPS) {
        return boundary;
      }
    }
  }
  return null;
}

/**
 * RouteのPOST bodyを受け取り、新規id発行・既存id維持・tags正規化・バリデーション・
 * path再計算を行う。
 * 戻り値: { route } | { error, atIndex? }
 *
 * @param stations 駅一覧(station.json相当)。waypoint.stationIdが指す駅の境界点との
 *   整合性検証(findMatchingBoundary)、および始点/終点の境界点タイプ(in/out/both)の
 *   制約チェックに使う(4番: 系統のwaypointは境界点にのみ紐づけられる)。
 */
function buildRouteFromBody(body, existing, allSegments, stations) {
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

  // stationIdを持つwaypointは、その駅の境界点のいずれかと座標的に一致していなければならない。
  // さらに、系統全体の始点(index 0)はin/both、終点(最後)はout/bothの境界点でなければならない
  // (3.1.3節: 物理的に進入できない方向からの系統作成をUI以前にサーバー側でも弾く)。
  //
  // ここで一致した境界点のnodeKeyは、系統+構内ルート結合(5節、timetableAssembler.js)が
  // 再探索なしにそのまま使えるよう、waypointごとにboundaryNodeKeyMapへ控えておく。
  const boundaryNodeKeyMap = new Map(); // waypoints配列内のインデックス -> nodeKey
  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    if (wp.stationId == null) continue;

    const station = stations.find((s) => s.id === wp.stationId);
    if (!station) {
      return { error: `waypoints[${i}]: 駅が見つかりません(${wp.stationId})`, atIndex: i };
    }
    const boundary = findMatchingBoundary(station, wp.segId, wp.s, allSegments);
    if (!boundary) {
      return { error: `waypoints[${i}]: 「${station.name}」の境界点と一致しません`, atIndex: i };
    }
    boundaryNodeKeyMap.set(i, boundary.nodeKey);

    const isFirst = i === 0;
    const isLast = i === waypoints.length - 1;
    const type = boundary.type ?? 'both';
    if (isFirst && type === 'out') {
      return { error: `waypoints[${i}]: 「${station.name}」のこの境界点は進出専用のため、系統の始点にはできません`, atIndex: i };
    }
    if (isLast && type === 'in') {
      return { error: `waypoints[${i}]: 「${station.name}」のこの境界点は進入専用のため、系統の終点にはできません`, atIndex: i };
    }
  }

  const normalizedWaypoints = waypoints.map((wp, i) => {
    const existingWp = existing?.waypoints?.find((w) => w.id === wp.id);
    return {
      id: wp.id && existingWp ? wp.id : generateId('wp'),
      segId: wp.segId,
      s: wp.s,
      x: wp.x ?? null,
      z: wp.z ?? null,
      stationId: wp.stationId ?? null,
      boundaryNodeKey: boundaryNodeKeyMap.get(i) ?? null,
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
  const stations = readJsonArray(stationFilePath());

  const result = buildRouteFromBody(req.body, existing, allSegments, stations);
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

/**
 * routeIdを参照している時刻表(timetables/*.json)を列挙する(系統削除時の整合性チェック用)。
 * 駅削除時のfindRoutesReferencing()と同じ考え方だが、こちらは「格下げ」できる余地がない
 * (時刻表にとってrouteIdは必須の参照先であり、nullにしても意味を持つデータにならない)ため、
 * 削除側(force時)は該当する時刻表ごと削除する方式を採る(4.4節と同様、呼び出し側で判断する)。
 * @param {string} routeId
 * @returns {Array<{ name: string }>}
 */
function findTimetablesReferencingRoute(routeId) {
  const dir = path.join(DATA_DIR, 'timetables');
  let files;
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }
  const result = [];
  for (const file of files) {
    try {
      const body = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
      if (body && body.routeId === routeId) {
        result.push({ name: file.replace(/\.json$/, '') });
      }
    } catch {
      // 壊れた/形式の異なるファイルは無視する
    }
  }
  return result;
}

// 系統の削除。他の時刻表から参照されている場合は、デフォルトでは409を返しブロックする
// (駅削除と同じ「警告付き強制削除」方式)。ただし時刻表にとってrouteIdは必須の参照先で
// あり、駅の場合のようにnullへ格下げできる余地がないため、?force=true を付けた場合は
// 参照している時刻表ごと削除する。
app.delete('/api/routes/:id', (req, res) => {
  const routes = readJsonArray(routeFilePath());
  const idx = routes.findIndex((r) => r.id === req.params.id);
  if (idx < 0) {
    res.status(404).json({ error: `系統が見つかりません: ${req.params.id}` });
    return;
  }

  const referencingTimetables = findTimetablesReferencingRoute(req.params.id);
  const force = req.query.force === 'true';

  if (referencingTimetables.length > 0 && !force) {
    res.status(409).json({
      error: 'この系統は他の時刻表から参照されているため削除できません。' +
          '?force=true を付けて再度削除すると、参照している時刻表ごと削除します。',
      referencingTimetables,
    });
    return;
  }

  if (referencingTimetables.length > 0) {
    const dir = path.join(DATA_DIR, 'timetables');
    for (const { name } of referencingTimetables) {
      const safeName = String(name).replace(/[^a-zA-Z0-9_\-]/g, '');
      try {
        fs.unlinkSync(path.join(dir, `${safeName}.json`));
      } catch {
        // 既に無い場合は無視
      }
    }
  }

  routes.splice(idx, 1);
  writeJsonArray(routeFilePath(), routes);
  res.json({
    ok: true,
    id: req.params.id,
    deletedTimetables: referencingTimetables.map((t) => t.name),
  });
});

// ── Line(路線) ────────────────────────────────────────────────────────
//
// 再設計仕様書1.2節: ダイヤグラムの表示・編集を行うための管理単位。列車の
// 運転経路そのもの(系統=Route)は保持しない。所属する駅はOudia互換の
// ダイヤグラム表示用に順序付きリストとして持ち、所属するレールは順序を
// 持たない集合として持つ。同一の駅・レールが複数の路線に含まれることを許可する。
// 系統(Route)とは異なり、Lineは他のどのエンティティからも参照されない
// (Line→駅/レールの一方向のみ)ため、Line自体の削除に整合性チェックは不要。

function lineFilePath() {
  return path.join(DATA_DIR, 'line.json');
}

function findLinesReferencingStation(lines, stationId) {
  const result = [];
  for (const line of lines) {
    if ((line.stationIds ?? []).includes(stationId)) {
      result.push({ lineId: line.id, lineName: line.name });
    }
  }
  return result;
}

/** 指定のstationIdを、参照している路線のstationIdsから取り除く(路線自体は残す)。 */
function downgradeReferencingLines(lines, stationId) {
  for (const line of lines) {
    line.stationIds = (line.stationIds ?? []).filter((id) => id !== stationId);
  }
}

/**
 * LineのPOST bodyを受け取り、新規id発行・既存id維持・バリデーションを行う。
 * @param allSegments rails-geometry.json相当の全RailSegment(railSegmentIdsの存在検証に使う)
 * @param stations station.jsonの全Station(stationIdsの存在検証に使う)
 */
function buildLineFromBody(body, existing, allSegments, stations) {
  const { name, tags, color, stationIds, railSegmentIds } = body;

  if (typeof name !== 'string' || !name.trim()) {
    return { error: 'nameは必須です' };
  }
  if (color !== undefined && color !== null && typeof color !== 'string') {
    return { error: 'colorは文字列である必要があります' };
  }
  if (stationIds !== undefined) {
    if (!Array.isArray(stationIds) || !stationIds.every((id) => typeof id === 'string' && id)) {
      return { error: 'stationIdsは文字列の配列である必要があります' };
    }
    const stationIdSet = new Set(stations.map((s) => s.id));
    for (let i = 0; i < stationIds.length; i++) {
      if (!stationIdSet.has(stationIds[i])) {
        return { error: `stationIds[${i}]: 駅が見つかりません(${stationIds[i]})` };
      }
    }
  }
  if (railSegmentIds !== undefined) {
    if (!Array.isArray(railSegmentIds) || !railSegmentIds.every((id) => typeof id === 'string' && id)) {
      return { error: 'railSegmentIdsは文字列の配列である必要があります' };
    }
    const segmentIdSet = new Set(allSegments.map((s) => s.id));
    for (let i = 0; i < railSegmentIds.length; i++) {
      if (!segmentIdSet.has(railSegmentIds[i])) {
        return { error: `railSegmentIds[${i}]: レールが見つかりません(${railSegmentIds[i]})` };
      }
    }
  }

  const line = {
    id: existing?.id ?? generateId('line'),
    name: name.trim(),
    tags: normalizeTags(tags),
    color: color ?? existing?.color ?? null,
    // 駅: ダイヤグラム表示順を持つ順序付きリスト。同一駅が複数回現れることも
    // (ループ線の起終点表示など)禁止しない。
    stationIds: stationIds ?? existing?.stationIds ?? [],
    // レール: 順序を持たない集合。重複だけ取り除く。
    railSegmentIds: [...new Set(railSegmentIds ?? existing?.railSegmentIds ?? [])],
  };

  return { line };
}

app.get('/api/lines', (req, res) => {
  res.json(readJsonArray(lineFilePath()));
});

// 新規作成 or 更新(既存id指定時はupsert)
app.post('/api/lines', (req, res) => {
  const lines = readJsonArray(lineFilePath());
  const existing = req.body.id ? lines.find((l) => l.id === req.body.id) : null;

  const allSegments = loadMergedRails();
  if (!allSegments) {
    res.status(404).json({
      error: 'rails-geometry.jsonが見つかりません',
      path: path.join(DATA_DIR, 'rails-geometry.json'),
    });
    return;
  }
  const stations = readJsonArray(stationFilePath());

  const result = buildLineFromBody(req.body, existing, allSegments, stations);
  if (result.error) {
    res.status(400).json({ error: result.error });
    return;
  }

  const { line } = result;
  const idx = lines.findIndex((l) => l.id === line.id);
  if (idx >= 0) {
    lines[idx] = line;
  } else {
    lines.push(line);
  }
  writeJsonArray(lineFilePath(), lines);
  res.json(line);
});

app.delete('/api/lines/:id', (req, res) => {
  const lines = readJsonArray(lineFilePath());
  const idx = lines.findIndex((l) => l.id === req.params.id);
  if (idx < 0) {
    res.status(404).json({ error: `路線が見つかりません: ${req.params.id}` });
    return;
  }
  lines.splice(idx, 1);
  writeJsonArray(lineFilePath(), lines);
  res.json({ ok: true, id: req.params.id });
});

app.listen(PORT, () => {
  console.log(`RTMA Web: http://localhost:${PORT}`);
  console.log(`データディレクトリ: ${DATA_DIR}`);
});