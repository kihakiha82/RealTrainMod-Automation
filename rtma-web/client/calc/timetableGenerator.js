'use strict';

const { computeLegRunningTime } = require('./runningTimeCalculator');

/**
 * 駅リスト・停車時分・始発時刻を受け取り、runningTimeCalculatorを駅間ごとに
 * 呼び出して時刻表全体(各駅の到着/発車時刻)を組み立てる。
 * 設計ドキュメント 2.3節・2.4節(TimetableGenerator)に対応。
 *
 * 時間の単位は内部的にすべてtick(1秒=20tick)で扱う。
 * 実時刻(時:分:秒)への変換はtickToClock()で行う。
 */

const TICKS_PER_SECOND = 20;

/**
 * points, vLimit, aAccelNet, aBrakeNet: routeProfile/speedLimitProfile/accelProfileの出力
 * stationIndices: routeProfile.insertStations()が返す { name, index, s }[] (s昇順)
 * options: {
 *   startTick: number,               始発駅発車時刻(tick、0時からの経過tickなど呼び出し側で定義)
 *   dwellTicksByStation?: {[name]: number},  駅ごとの停車時分(tick)。無ければdefaultDwellTicksを使う
 *   defaultDwellTicks?: number,      デフォルトの停車時分(tick)
 * }
 *
 * 戻り値: {
 *   schedule: {
 *     name: string,
 *     s: number,
 *     arrivalTick: number|null,     始発駅はnull
 *     departureTick: number|null,   終着駅はnull
 *     legDurationTicks?: number,    1つ前の駅からの走行時分(始発駅は無し)
 *     legProfile?: { s: number[], v: number[], t: number[] },  可視化用。tは絶対tick
 *   }[]
 * }
 */
function generateTimetable(points, vLimit, aAccelNet, aBrakeNet, stationIndices, options) {
  const { startTick, dwellTicksByStation = {}, defaultDwellTicks = 0 } = options;

  if (stationIndices.length < 2) {
    throw new Error('generateTimetable: 駅は最低2つ必要です(始発・終着)');
  }

  const schedule = [];
  let currentTick = startTick;

  for (let i = 0; i < stationIndices.length; i++) {
    const station = stationIndices[i];

    if (i === 0) {
      schedule.push({
        name: station.name,
        s: station.s,
        arrivalTick: null,
        departureTick: currentTick,
      });
      continue;
    }

    const prevStation = stationIndices[i - 1];
    const leg = computeLegRunningTime(points, vLimit, aAccelNet, aBrakeNet, prevStation.index, station.index);

    const arrivalTick = currentTick + leg.legDurationTicks;
    const isLast = i === stationIndices.length - 1;
    const dwellTicks = isLast ? 0 : (dwellTicksByStation[station.name] ?? defaultDwellTicks);
    const departureTick = isLast ? null : arrivalTick + dwellTicks;

    schedule.push({
      name: station.name,
      s: station.s,
      arrivalTick,
      departureTick,
      legDurationTicks: leg.legDurationTicks,
      legProfile: {
        s: leg.s,
        v: leg.v,
        t: leg.t.map((tt) => tt + currentTick),
      },
    });

    currentTick = departureTick !== null ? departureTick : arrivalTick;
  }

  return { schedule };
}

/**
 * tick(0時からの累積tickと仮定)を時:分:秒に変換する。24時間(=20*3600tick)でラップする。
 * RtmaCalendarData側の「1日=24時間・1年=365日」独自カレンダーと単位を揃えるためのヘルパー。
 */
function tickToClock(tick) {
  const totalSeconds = Math.floor(tick / TICKS_PER_SECOND);
  const secondsInDay = ((totalSeconds % 86400) + 86400) % 86400;
  const hour = Math.floor(secondsInDay / 3600);
  const minute = Math.floor((secondsInDay % 3600) / 60);
  const second = secondsInDay % 60;
  return { hour, minute, second };
}

/**
 * 時:分:秒を、その日の0時からの累積tickに変換する。tickToClock()の逆関数。
 * 出発時刻の入力(UI上の時:分:秒)をgenerateTimetable()のstartTickに変換するのに使う。
 * 日をまたぐ経路の場合、到着tickは86400秒(=20*86400 tick)を超えた値になり得るが、
 * それ自体は正しい挙動(1日の範囲に丸めない)。日をまたいだかどうかはtick自体から
 * 呼び出し側でMath.floor(tick / TICKS_PER_SECOND / 86400)により判定できる。
 */
function clockToTick(hour, minute, second) {
  const totalSeconds = hour * 3600 + minute * 60 + second;
  return totalSeconds * TICKS_PER_SECOND;
}

module.exports = {
  generateTimetable,
  tickToClock,
  clockToTick,
  TICKS_PER_SECOND,
};