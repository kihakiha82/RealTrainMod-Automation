'use strict';

// 永続化するダイヤの Web 側スキーマ。Mod 向けの走行プロファイル(schedule)とは
// 分け、系統と各駅での運転扱いを編集可能な一次データとして保存する。
const TIMETABLE_SCHEMA_VERSION = 2;
const VALID_HANDLINGS = new Set(['stop', 'pass', 'operational-stop']);

function isClock(value) {
  return value && Number.isInteger(value.hour) && Number.isInteger(value.minute) && Number.isInteger(value.second)
    && value.hour >= 0 && value.hour <= 23
    && value.minute >= 0 && value.minute <= 59
    && value.second >= 0 && value.second <= 59;
}

function validateTimetable(timetable, { routesById, stationsById } = {}) {
  if (!timetable || typeof timetable !== 'object' || Array.isArray(timetable)) {
    return 'ダイヤはオブジェクトである必要があります';
  }
  if (timetable.schemaVersion !== TIMETABLE_SCHEMA_VERSION) {
    return `schemaVersion は ${TIMETABLE_SCHEMA_VERSION} である必要があります`;
  }
  if (typeof timetable.routeId !== 'string' || !timetable.routeId) return 'routeIdが必要です';
  if (routesById && !routesById.has(timetable.routeId)) return `系統が見つかりません: ${timetable.routeId}`;
  if (typeof timetable.trainResourceName !== 'string' || !timetable.trainResourceName) return 'trainResourceNameが必要です';
  if (!Array.isArray(timetable.stationPlans) || timetable.stationPlans.length === 0) return 'stationPlansは1件以上必要です';

  for (let index = 0; index < timetable.stationPlans.length; index += 1) {
    const plan = timetable.stationPlans[index];
    if (!plan || typeof plan !== 'object') return `stationPlans[${index}]が不正です`;
    if (typeof plan.stationId !== 'string' || !plan.stationId) return `stationPlans[${index}].stationIdが必要です`;
    const station = stationsById?.get(plan.stationId);
    if (stationsById && !station) return `stationPlans[${index}]の駅が見つかりません`;
    const handling = plan.handling ?? (plan.pass ? 'pass' : 'stop');
    if (!VALID_HANDLINGS.has(handling)) return `stationPlans[${index}].handlingが不正です`;
    if (plan.arrival != null && !isClock(plan.arrival)) return `stationPlans[${index}].arrivalが不正です`;
    if (plan.departure != null && !isClock(plan.departure)) return `stationPlans[${index}].departureが不正です`;
    if (typeof plan.turnback !== 'undefined' && typeof plan.turnback !== 'boolean') return `stationPlans[${index}].turnbackはbooleanです`;
    if (handling !== 'pass') {
      if (typeof plan.trackId !== 'string' || !plan.trackId || typeof plan.stopId !== 'string' || !plan.stopId) {
        return `stationPlans[${index}]は停車するためtrackIdとstopIdが必要です`;
      }
      if (station) {
        const track = (station.tracks ?? []).find((item) => item.id === plan.trackId);
        if (!track || !(track.stops ?? []).some((item) => item.id === plan.stopId)) {
          return `stationPlans[${index}]の番線または停車位置が駅データに存在しません`;
        }
      }
    }
  }
  return null;
}

function normalizeTimetable(timetable) {
  return {
    ...timetable,
    schemaVersion: TIMETABLE_SCHEMA_VERSION,
    stationPlans: timetable.stationPlans.map((plan) => {
      const handling = plan.handling ?? (plan.pass ? 'pass' : 'stop');
      return {
        ...plan,
        handling,
        pass: handling === 'pass',
        turnback: plan.turnback === true,
      };
    }),
  };
}

module.exports = { TIMETABLE_SCHEMA_VERSION, validateTimetable, normalizeTimetable };
