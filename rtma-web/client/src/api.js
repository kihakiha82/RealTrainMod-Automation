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

/** 路線(Route)一覧を取得する */
export async function fetchRoutes() {
  const res = await fetch('/api/routes');
  if (!res.ok) throw new Error(`路線一覧の取得に失敗しました (HTTP ${res.status})`);
  return res.json();
}

/**
 * 路線を新規作成/更新(upsert)する。既存を更新する場合はbody.idを含めること
 * (含めない場合は新規作成扱いになる)。
 * body: { id?, name, tags?, waypoints: { id?, segId, s, x?, z?, stationId?, trackId? }[] }
 * pathはサーバー側で再計算されるので、呼び出し側は含めなくてよい。
 */
export async function saveRoute(body) {
  const res = await fetch('/api/routes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `路線の保存に失敗しました (HTTP ${res.status})`);
  }
  return res.json();
}

/** 路線を削除する */
export async function deleteRoute(id) {
  const res = await fetch(`/api/routes/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `路線の削除に失敗しました (HTTP ${res.status})`);
  }
  return res.json();
}

/** 駅(Station)一覧を取得する(路線編集時の駅アタッチ機能で使う想定) */
export async function fetchStations() {
  const res = await fetch('/api/stations');
  if (!res.ok) throw new Error(`駅一覧の取得に失敗しました (HTTP ${res.status})`);
  return res.json();
}

/**
 * 駅を削除する。他のRouteから参照されている場合、force指定が無ければ409になり、
 * body.referencingRoutesに参照している路線一覧が入る(例外としてではなく、
 * 呼び出し側が明示的にforce再実行できるよう、この場合はエラーを投げず結果を返す)。
 */
export async function deleteStation(id, { force = false } = {}) {
  const url = `/api/stations/${encodeURIComponent(id)}${force ? '?force=true' : ''}`;
  const res = await fetch(url, { method: 'DELETE' });
  const body = await res.json().catch(() => ({}));
  if (res.status === 409) {
    return { conflict: true, referencingRoutes: body.referencingRoutes ?? [] };
  }
  if (!res.ok) {
    throw new Error(body.error || `駅の削除に失敗しました (HTTP ${res.status})`);
  }
  return { conflict: false, ...body };
}

/**
 * 駅を新規作成/更新(upsert)する。既存を更新する場合はbody.idを含めること。
 * body: { id?, name, tags?, tracks: { id?, name, segmentId, reversed, stops: {...}[] }[] }
 */
export async function saveStation(body) {
  const res = await fetch('/api/stations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `駅の保存に失敗しました (HTTP ${res.status})`);
  }
  return res.json();
}