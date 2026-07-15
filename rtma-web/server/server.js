const express = require('express');
const path = require('path');
const fs = require('fs');
const { buildRouteProfile } = require('./calc/routeProfile');
const { resolveOrderedSegments } = require('./calc/orderedRouteResolver');

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

app.listen(PORT, () => {
  console.log(`RTMA Web: http://localhost:${PORT}`);
  console.log(`データディレクトリ: ${DATA_DIR}`);
});
