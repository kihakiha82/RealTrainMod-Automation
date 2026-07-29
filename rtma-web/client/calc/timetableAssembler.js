'use strict';

/**
 * 系統(Route) + 各駅の構内ルート(Station.internalRoutes)を1本のセグメント列に
 * 結合するユーティリティ。再設計仕様書 5.1節「速度・距離プロファイルの結合方式」の実装。
 *
 * 新しい経路探索ロジックは持たない。系統のwaypoints・path、および駅保存時に
 * 事前生成済みのinternalRoutes(4.3節)を、位置関係に従って単純に繋ぎ合わせるだけ。
 * 結合後は buildRouteProfile() にそのまま渡せる { id, reversed, sStart?, sEnd? }[] を返す。
 *
 * 【駅waypointの配置規約】(Route作成UI側の前提)
 *   - 始発駅: 出発境界点(exit境界)のみを単独のwaypointとして置く(進入経路は考えない)。
 *   - 中間駅(停車 or 通過): 進入境界点(entry)と出発境界点(exit)の2つを連続したwaypointとして置く。
 *   - 終着駅: 進入境界点(entry)のみを単独のwaypointとして置く。
 *   - 上記以外(station.stationIdが単独で、先頭・末尾でも連続ペアでもないもの)は、
 *     経路の向きを確定させるための単なる目印であり、構内ルートへの置き換えは行わない。
 *
 * 【停車位置(s)の求め方】
 *   findRailRoute("enter"系構内ルート)の終点は必ず停車位置そのもの、"exit"系構内ルートの
 *   始点も同じ停車位置であるため、結合後の停止位置の絶対sは「enterルートのセグメント群の
 *   直後(= exitルートのセグメント群の直前)」という、セグメント列上の"継ぎ目"の位置に一致する。
 *   よって停車位置ごとに専用の探索・補間をする必要はなく、buildRouteProfile()が返す
 *   segmentOffsets[その継ぎ目のインデックス].offsetS をそのまま使えばよい
 *   (先頭駅ならoffsetS=0、終着駅ならprofile.totalLengthに一致する)。
 */

/**
 * waypoints(進行方向順)を、「開床区間(line)」と「駅区間(station)」の並びに分解する。
 * 駅区間は「同一stationIdが連続する2waypoint」のみを対象とする(規約参照)。
 *
 * @returns {{
 *   legs: Array<{ kind: 'line', from, to } | { kind: 'station', stationId, entry, exit }>,
 *   slots: Array<{ kind: 'origin'|'terminal'|'intermediate', stationId }>,
 * }}
 */
function buildSlotsAndLegs(waypoints) {
    const n = waypoints.length;

    const originIsSingleton = waypoints[0].stationId != null &&
        !(n >= 2 && waypoints[1].stationId === waypoints[0].stationId);
    const terminalIsSingleton = waypoints[n - 1].stationId != null &&
        !(n >= 2 && waypoints[n - 2].stationId === waypoints[n - 1].stationId);

    const slots = [];
    if (originIsSingleton) {
        slots.push({ kind: 'origin', stationId: waypoints[0].stationId });
    }

    const legs = [];
    // 【重要】iは常に+1ずつ進める。駅区間(entry,exit)を処理した後も、exit側のwaypointは
    // 「次の区間の起点」として再利用されるため、ここでスキップしてはならない
    // (以前+2で進めていたバグ: 駅ペアの直後の区間が丸ごと欠落していた)。
    for (let i = 0; i < n - 1; i++) {
        const a = waypoints[i];
        const b = waypoints[i + 1];
        if (a.stationId != null && a.stationId === b.stationId) {
            legs.push({ kind: 'station', stationId: a.stationId, entry: a, exit: b });
            slots.push({ kind: 'intermediate', stationId: a.stationId });
        } else {
            legs.push({ kind: 'line', from: a, to: b });
        }
    }

    if (terminalIsSingleton) {
        slots.push({ kind: 'terminal', stationId: waypoints[n - 1].stationId });
    }

    return { legs, slots };
}

function findEnterRoute(station, entryNodeKey, trackId, stopId) {
    return (station.internalRoutes ?? []).find((r) =>
        r.type === 'enter' && r.entryNodeKey === entryNodeKey && r.trackId === trackId && r.stopId === stopId,
    ) ?? null;
}

function findExitRoute(station, exitNodeKey, trackId, stopId) {
    return (station.internalRoutes ?? []).find((r) =>
        r.type === 'exit' && r.exitNodeKey === exitNodeKey && r.trackId === trackId && r.stopId === stopId,
    ) ?? null;
}

function findThroughRoute(station, entryNodeKey, exitNodeKey) {
    return (station.internalRoutes ?? []).find((r) =>
        r.type === 'through' && r.entryNodeKey === entryNodeKey && r.exitNodeKey === exitNodeKey,
    ) ?? null;
}

function resolveTrackAndStop(station, trackId, stopId) {
    const track = (station.tracks ?? []).find((t) => t.id === trackId);
    const stop = track ? (track.stops ?? []).find((s) => s.id === stopId) : null;
    return { track, stop };
}

/**
 * @param route            { waypoints, path } (route.jsonの1エントリ)。boundaryNodeKeyが
 *                          付与されたwaypoints(server.js buildRouteFromBody参照)が必要。
 * @param stationPlans     経路上に現れる駅の並び順(origin→intermediate...→terminal)に対応する
 *                          計画配列。各要素は { stationId, trackId?, stopId?, pass?, dwellTicks? }。
 *                          origin/terminalはtrackId・stopIdが必須(pass不可)。
 *                          intermediateはpass:trueなら通過(trackId/stopId不要)、
 *                          そうでなければtrackId・stopIdが必須。
 * @param stationsById     Map<stationId, Station>
 * @param findRailRouteFn  { findRailRoute } (calc/railGraph.js)。開床区間(line leg)の
 *                          その場探索に使う(番線を跨がない、駅と駅の間の本線区間)。
 * @param allSegments      rails-geometry.json + rails-state.json 統合済みの全RailSegment
 *
 * @returns {{
 *   segRefs: Array<{ id, reversed, sStart?, sEnd? }>,   buildRouteProfileにそのまま渡せる形式
 *   stationStops: Array<{
 *     stationId, stationName, trackId, stopId, trackName, dwellTicks,
 *     segIndexAfter: number,  この駅の停止位置の直後にあたるsegRefs中のインデックス
 *                              (= buildRouteProfile後、segmentOffsets[segIndexAfter].offsetSが
 *                              絶対sになる。segRefs.length に等しい場合は終着駅=profile.totalLength)
 *     turnback: boolean,      4.4節: 進入(enter)ルート最終区間と進出(exit)ルート先頭区間の
 *                              reversedが逆向きの場合true。始発駅・終着駅・通過駅は常にfalse
 *                              (比較対象となる入口・出口の両ルートが揃わないため)。
 *   }>,
 * }}
 */
function assembleRouteTimetableSegments(route, stationPlans, stationsById, findRailRouteFn, allSegments) {
    const waypoints = route?.waypoints;
    if (!Array.isArray(waypoints) || waypoints.length < 2) {
        throw new Error('assembleRouteTimetableSegments: route.waypointsが不正です(2件以上必要)');
    }
    if (!Array.isArray(stationPlans)) {
        throw new Error('assembleRouteTimetableSegments: stationPlansは配列である必要があります');
    }

    const { legs, slots } = buildSlotsAndLegs(waypoints);

    if (slots.length !== stationPlans.length) {
        throw new Error(
            `stationPlansの件数(${stationPlans.length})が、経路上に配置された駅の数(${slots.length})と一致しません`,
        );
    }
    for (let i = 0; i < slots.length; i++) {
        if (slots[i].stationId !== stationPlans[i].stationId) {
            throw new Error(
                `stationPlans[${i}].stationId(${stationPlans[i].stationId})が、経路上のこの位置の駅` +
                `(${slots[i].stationId})と一致しません(駅の順序を確認してください)`,
            );
        }
        const plan = stationPlans[i];
        const isOriginOrTerminal = slots[i].kind === 'origin' || slots[i].kind === 'terminal';
        if (isOriginOrTerminal && plan.pass) {
            throw new Error(`stationPlans[${i}]: 始発駅・終着駅は通過(pass)にできません`);
        }
        if (!plan.pass && (!plan.trackId || !plan.stopId)) {
            throw new Error(`stationPlans[${i}]: trackId・stopIdが必要です(通過する場合はpass:trueを指定)`);
        }
    }

    const segRefs = [];
    const stationStops = [];
    let planCursor = 0;

    function station(stationId) {
        const st = stationsById.get(stationId);
        if (!st) throw new Error(`assembleRouteTimetableSegments: 駅が見つかりません(${stationId})`);
        return st;
    }

    function pushRefs(refs) {
        for (const r of refs) segRefs.push(r);
    }

    function recordStop(plan, turnback = false) {
        const st = station(plan.stationId);
        const { track, stop } = resolveTrackAndStop(st, plan.trackId, plan.stopId);
        if (!track || !stop) {
            throw new Error(`「${st.name}」に指定された番線・停車位置が見つかりません(trackId=${plan.trackId}, stopId=${plan.stopId})`);
        }
        stationStops.push({
            stationId: plan.stationId,
            stationName: st.name,
            trackId: plan.trackId,
            stopId: plan.stopId,
            trackName: track.name,
            dwellTicks: plan.dwellTicks ?? 0,
            segIndexAfter: segRefs.length,
            turnback,
        });
    }

    /**
     * 4.4節: 折返し判定の自動導出。
     * 直前の構内ルート(入口→停車位置)の最終区間と、直後の構内ルート(停車位置→出口)の
     * 先頭区間のreversedを比較し、逆向きであれば折返しとみなす。
     * 停車位置がちょうど境界点上にありどちらかのルートのpathが空になる場合は、
     * 進行方向を判定できないため折返しとはみなさない(false)。
     */
    function detectTurnback(enterRoute, exitRoute) {
        const lastEnterSeg = enterRoute.path?.[enterRoute.path.length - 1];
        const firstExitSeg = exitRoute.path?.[0];
        if (!lastEnterSeg || !firstExitSeg) return false;
        return Boolean(lastEnterSeg.reversed) !== Boolean(firstExitSeg.reversed);
    }

    // 先頭: origin(単独waypoint = 出発境界点)。停車位置→境界点(exit系構内ルート)を先頭に追加する。
    if (slots[0]?.kind === 'origin') {
        const plan = stationPlans[planCursor++];
        const st = station(plan.stationId);
        const boundaryNodeKey = waypoints[0].boundaryNodeKey;
        if (!boundaryNodeKey) {
            throw new Error(`「${st.name}」: 始発駅のwaypointに境界点情報がありません(古い形式の系統データの可能性があります)`);
        }
        // 停止位置(s=0)を先に記録してから、出発ルートのセグメントを追加する
        recordStop(plan);
        const exitRoute = findExitRoute(st, boundaryNodeKey, plan.trackId, plan.stopId);
        if (!exitRoute) {
            throw new Error(`「${st.name}」: 指定の番線・停車位置から、この系統の出発境界点へ抜ける構内ルートが見つかりません`);
        }
        pushRefs(exitRoute.path);
    }

    // 中間区間(開床区間・駅区間)を順に処理
    for (const leg of legs) {
        if (leg.kind === 'line') {
            const refs = findRailRouteFn(allSegments, leg.from, leg.to);
            if (!refs) {
                throw new Error(`経路が繋がっていません(waypoint間: ${leg.from.segId}@${leg.from.s} 〜 ${leg.to.segId}@${leg.to.s})`);
            }
            pushRefs(refs);
            continue;
        }

        // leg.kind === 'station'(中間駅: entry境界点 → exit境界点)
        const plan = stationPlans[planCursor++];
        const st = station(leg.stationId);
        const entryNodeKey = leg.entry.boundaryNodeKey;
        const exitNodeKey = leg.exit.boundaryNodeKey;
        if (!entryNodeKey || !exitNodeKey) {
            throw new Error(`「${st.name}」: waypointに境界点情報がありません(古い形式の系統データの可能性があります)`);
        }

        if (plan.pass) {
            const throughRoute = findThroughRoute(st, entryNodeKey, exitNodeKey);
            if (!throughRoute) {
                throw new Error(`「${st.name}」: 指定の進入・進出境界点を結ぶ通過用の構内ルートが見つかりません`);
            }
            pushRefs(throughRoute.path);
        } else {
            const enterRoute = findEnterRoute(st, entryNodeKey, plan.trackId, plan.stopId);
            if (!enterRoute) {
                throw new Error(`「${st.name}」: 進入境界点から指定の番線・停車位置へ至る構内ルートが見つかりません`);
            }
            pushRefs(enterRoute.path);
            const exitRoute = findExitRoute(st, exitNodeKey, plan.trackId, plan.stopId);
            if (!exitRoute) {
                throw new Error(`「${st.name}」: 指定の番線・停車位置から進出境界点へ至る構内ルートが見つかりません`);
            }
            recordStop(plan, detectTurnback(enterRoute, exitRoute));
            pushRefs(exitRoute.path);
        }
    }

    // 末尾: terminal(単独waypoint = 進入境界点)。境界点→停車位置(enter系構内ルート)を末尾に追加する。
    if (slots[slots.length - 1]?.kind === 'terminal') {
        const plan = stationPlans[planCursor++];
        const st = station(plan.stationId);
        const boundaryNodeKey = waypoints[waypoints.length - 1].boundaryNodeKey;
        if (!boundaryNodeKey) {
            throw new Error(`「${st.name}」: 終着駅のwaypointに境界点情報がありません(古い形式の系統データの可能性があります)`);
        }
        const enterRoute = findEnterRoute(st, boundaryNodeKey, plan.trackId, plan.stopId);
        if (!enterRoute) {
            throw new Error(`「${st.name}」: この系統の進入境界点から、指定の番線・停車位置へ至る構内ルートが見つかりません`);
        }
        pushRefs(enterRoute.path);
        recordStop(plan);
    }

    return { segRefs, stationStops };
}

module.exports = { assembleRouteTimetableSegments, buildSlotsAndLegs };