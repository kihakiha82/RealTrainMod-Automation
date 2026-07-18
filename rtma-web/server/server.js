const express = require('express');
const path = require('path');
const fs = require('fs');
const { buildRouteProfile } = require('../client/calc/routeProfile');
const { resolveOrderedSegments } = require('../client/calc/orderedRouteResolver');
const { computeSpeedLimitProfile } = require('../client/calc/speedLimitProfile');
const { computeAccelProfile, DEFAULT_G } = require('../client/calc/accelProfile');
const { generateTimetable, tickToClock, clockToTick, TICKS_PER_SECOND } = require('../client/calc/timetableGenerator');

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

// レールデータ(読み取り専用。Mod側が書き出すrails.jsonをそのまま返す)
app.get('/api/rails', (req, res) => {
  const filePath = path.join(DATA_DIR, 'rails.json');
  fs.readFile(filePath, 'utf-8', (err, data) => {
    if (err) {
      res.status(404).json({ error: 'rails.jsonが見つかりません', path: filePath });
      return;
    }
    res.type('application/json').send(data);
  });
});

// 選択されたレールを順序付き経路として受け取り、RouteProfile(距離順の1本の配列)を計算する。
// Web側(mapEngine/railGraph.js#findRailRoute)が組み立てた { id, reversed }[] を受け取り、
// サーバー側で保持しているrails.json(source of truth)と突き合わせて実体化してから計算する。
// body: { route: { id: string, reversed: boolean }[] }
app.post('/api/route-profile', (req, res) => {
  const { route } = req.body;
  if (!Array.isArray(route) || route.length === 0) {
    res.status(400).json({ error: 'routeは1件以上の { id, reversed } の配列である必要があります' });
    return;
  }

  const filePath = path.join(DATA_DIR, 'rails.json');
  fs.readFile(filePath, 'utf-8', (err, data) => {
    if (err) {
      res.status(404).json({ error: 'rails.jsonが見つかりません', path: filePath });
      return;
    }

    let allSegments;
    try {
      allSegments = JSON.parse(data);
    } catch {
      res.status(500).json({ error: 'rails.jsonのパースに失敗しました' });
      return;
    }

    try {
      const orderedSegments = resolveOrderedSegments(route, allSegments);
      const profile = buildRouteProfile(orderedSegments);
      res.json(profile);
    } catch (resolveErr) {
      // route中のidがrails.json側に見つからない等(rails.jsonが更新された場合に起こりうる)
      res.status(400).json({ error: resolveErr.message });
    }
  });
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

  const railsPath = path.join(DATA_DIR, 'rails.json');
  const specsPath = path.join(DATA_DIR, 'trainspecs.json');

  let allSegments;
  try {
    allSegments = JSON.parse(fs.readFileSync(railsPath, 'utf-8'));
  } catch {
    res.status(404).json({ error: 'rails.jsonが見つかりません', path: railsPath });
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

  res.json({
    trainResourceName,
    departure,
    brakeSpecEstimated: true,
    totalLength: profile.totalLength,
    schedule,
  });
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

app.listen(PORT, () => {
  console.log(`RTMA Web: http://localhost:${PORT}`);
  console.log(`データディレクトリ: ${DATA_DIR}`);
});