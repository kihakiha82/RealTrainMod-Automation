// timeUtils.js

/**
 * サーバーの時刻スナップショットと、現在のローカルミリ秒から、
 * 現在の推測時刻（時・分・秒）を計算して返します。
 *
 * frozen条件: isServerRunning=true かつ isPaused=true のときのみ。
 * (サーバー停止中はTimeEditorで対応するため、ここではfrozenにしない)
 */
export function extrapolateTime(snapshot, nowMs) {
    if (!snapshot) return null;

    const { hour, minute, second, fetchedAtMs } = snapshot;

    // ゲームプレイ中にESCメニュー等でポーズされているときだけ時間を止める
    const frozen = snapshot.isServerRunning === true && snapshot.isPaused === true;

    const elapsedRealSeconds = frozen ? 0 : (nowMs - fetchedAtMs) / 1000;

    const baseSeconds = hour * 3600 + minute * 60 + second;
    let totalSeconds = (baseSeconds + elapsedRealSeconds) % 86400;
    if (totalSeconds < 0) totalSeconds += 86400;

    return {
        hour:   Math.floor(totalSeconds / 3600),
        minute: Math.floor((totalSeconds % 3600) / 60),
        second: Math.floor(totalSeconds % 60),
        frozen,
    };
}

/**
 * 時・分・秒 オブジェクトを "HH:MM:SS" の文字列にフォーマットします。
 */
export function formatDateTime({ hour, minute, second }) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(hour)}:${pad(minute)}:${pad(second)}`;
}

/**
 * スナップショットから現在の完全な日時(year/dayOfYear/hour/minute/second)を補間する。
 * extrapolateTimeとは異なり、日付跨ぎ・年跨ぎも正確に計算する。
 * time.jsonへの書き戻しや、サーバー起動時の初期化に使う想定。
 */
export function extrapolateFullDateTime(snapshot, nowMs) {
    if (!snapshot) return null;

    const frozen = snapshot.isServerRunning === true && snapshot.isPaused === true;
    const elapsedRealSeconds = frozen
        ? 0
        : (nowMs - snapshot.fetchedAtMs) / 1000;

    const baseSeconds = snapshot.hour * 3600 + snapshot.minute * 60 + snapshot.second;
    const totalSeconds = baseSeconds + elapsedRealSeconds;

    // 経過した全日数(日付跨ぎのカウント)
    const fullDaysElapsed = Math.floor(totalSeconds / 86400);
    const secondsInDay    = ((totalSeconds % 86400) + 86400) % 86400;

    const DAYS_PER_YEAR = 365;
    const totalDayOfYear0 = (snapshot.dayOfYear - 1) + fullDaysElapsed; // 0始まり
    const newDayOfYear = (totalDayOfYear0 % DAYS_PER_YEAR) + 1;          // 1〜365
    const yearsElapsed = Math.floor(totalDayOfYear0 / DAYS_PER_YEAR);
    const newYear = (snapshot.year ?? 1) + yearsElapsed;

    return {
        year:      newYear,
        dayOfYear: newDayOfYear,
        hour:      Math.floor(secondsInDay / 3600),
        minute:    Math.floor((secondsInDay % 3600) / 60),
        second:    Math.floor(secondsInDay % 60),
        frozen,
    };
}