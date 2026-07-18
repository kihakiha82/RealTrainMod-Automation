export async function fetchRails() {
  const res = await fetch('/api/rails');
  if (!res.ok) {
    throw new Error(`レールデータの取得に失敗しました (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * プレイヤーの現在座標を取得する。
 * シングルプレイ想定。取得できない場合(Mod未起動、ワールド未読み込み等)はnullを返す。
 */
export async function fetchPlayerPosition() {
  try {
    const res = await fetch('/api/player');
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchTime() {
  const res = await fetch('/api/time');
  if (!res.ok) {
    throw new Error(`時刻データの取得に失敗しました (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * time.jsonを上書き保存する(isServerRunning=falseのときだけ呼ぶ想定)。
 * 次回Minecraft起動時にこの値が読み込まれる。
 */
export async function saveTime({ year, dayOfYear, hour, minute, second }) {
  const res = await fetch('/api/time', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ year, dayOfYear, hour, minute, second }),
  });
  if (!res.ok) {
    throw new Error(`時刻の保存に失敗しました (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * 選択したレールの経路(始点セグメント→終点セグメント)からRouteProfileを計算する。
 * route: mapEngine/railGraph.js#findRailRouteの戻り値({id, reversed}[])をそのまま渡す。
 * 戻り値: calc/routeProfile.js#buildRouteProfileの戻り値({points, totalLength})。
 */
export async function fetchRouteProfile(route) {
  const res = await fetch('/api/route-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ route }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `経路プロファイルの計算に失敗しました (HTTP ${res.status})`);
  }
  return res.json();
}

export async function fetchTimetable(name) {
  const res = await fetch(`/api/timetables/${encodeURIComponent(name)}`);
  if (!res.ok) {
    throw new Error(`時刻表の取得に失敗しました (HTTP ${res.status})`);
  }
  return res.json();
}

export async function saveTimetable(name, data) {
  const res = await fetch(`/api/timetables/${encodeURIComponent(name)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`時刻表の保存に失敗しました (HTTP ${res.status})`);
  }
  return res.json();
}

/** 車両性能データ(trainspecs.json)を取得する。キーが車両のresourceName。 */
export async function fetchTrainSpecs() {
  const res = await fetch('/api/trainspecs');
  if (!res.ok) {
    throw new Error(`車両データの取得に失敗しました (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * 経路(route)+車両(trainResourceName)+出発時刻(departure)から簡易スタフを計算する。
 * route: mapEngine/railGraph.js#findRailRouteの戻り値をそのまま渡す。
 * departure: { hour, minute, second }
 */
export async function fetchSimpleSchedule(route, trainResourceName, departure) {
  const res = await fetch('/api/simple-schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ route, trainResourceName, departure }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `簡易スタフの計算に失敗しました (HTTP ${res.status})`);
  }
  return res.json();
}

/** 列車↔スタフの紐付け一覧を取得する。trains.jsonの現在状態もマージされている。 */
export async function fetchTrainAssignments() {
  const res = await fetch('/api/train-assignments');
  if (!res.ok) throw new Error(`紐付け一覧の取得に失敗しました (HTTP ${res.status})`);
  return res.json();
}

/** 指定列車にスタフを紐付ける */
export async function assignTrain(uuid, timetableName, assignedAt) {
  const res = await fetch(`/api/train-assignments/${encodeURIComponent(uuid)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ timetableName, assignedAt }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `列車への適用に失敗しました (HTTP ${res.status})`);
  }
  return res.json();
}

/** 指定列車の紐付けを解除する */
export async function unassignTrain(uuid) {
  const res = await fetch(`/api/train-assignments/${encodeURIComponent(uuid)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `紐付け解除に失敗しました (HTTP ${res.status})`);
  }
  return res.json();
}