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