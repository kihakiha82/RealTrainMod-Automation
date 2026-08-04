/**
 * 系統(Route)のwaypointsから「経路上に現れる駅の並び(origin→intermediate...→terminal)」を
 * 導出する共有ユーティリティ。
 *
 * 【重要】このロジックはサーバー側 client/calc/timetableAssembler.js の buildSlotsAndLegs()
 * の駅スロット抽出部分と完全に一致させる必要がある(サーバーはstationPlansの各要素が
 * この並びと同じstationId・同じ件数であることを検証するため、ズレると保存前の計算で
 * 必ずエラーになる)。ロジックを変更する場合は3箇所(ここ・server.js・timetableAssembler.js)
 * を同時に直すこと。
 *
 * 元々はTimetableEditPanel.jsx内に閉じたヘルパーだったが、App.jsx側(系統ツリーの
 * 「下り時刻表」表示用の駅リスト算出)からも必要になったため、共有ユーティリティとして
 * 切り出した。使う側は client/src/components/windows/TimetableEditPanel.jsx と
 * client/src/App.jsx の2箇所。
 *
 * 中間駅(intermediate)には、進入境界点・進出境界点のboundaryNodeKeyも添えて返す
 * (entryNodeKey/exitNodeKey)。TimetableEditPanelの折返しプレビュー(previewTurnback)が、
 * 駅のinternalRoutesから該当するenter/exitルートを引き当てるのに使う。
 */
export function deriveStationSlots(waypoints) {
    if (!Array.isArray(waypoints) || waypoints.length < 2) return [];
    const n = waypoints.length;

    const originIsSingleton = waypoints[0].stationId != null &&
        !(n >= 2 && waypoints[1].stationId === waypoints[0].stationId);
    const terminalIsSingleton = waypoints[n - 1].stationId != null &&
        !(n >= 2 && waypoints[n - 2].stationId === waypoints[n - 1].stationId);

    const slots = [];
    if (originIsSingleton) {
        slots.push({ kind: 'origin', stationId: waypoints[0].stationId });
    }
    for (let i = 0; i < n - 1; i++) {
        const a = waypoints[i];
        const b = waypoints[i + 1];
        if (a.stationId != null && a.stationId === b.stationId) {
            slots.push({
                kind: 'intermediate',
                stationId: a.stationId,
                entryNodeKey: a.boundaryNodeKey ?? null,
                exitNodeKey: b.boundaryNodeKey ?? null,
            });
        }
    }
    if (terminalIsSingleton) {
        slots.push({ kind: 'terminal', stationId: waypoints[n - 1].stationId });
    }
    return slots;
}