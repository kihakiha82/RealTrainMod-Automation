/**
 * 番線(Track.segments: [{segmentId, reversed}])に関する、地図描画・停車位置編集の
 * 両方で使う座標計算ユーティリティ。map2dController.js(描画)とStationEditPanel.jsx
 * (停車位置のクリック位置検証)の両方から使われるため、ロジックの重複を避けて
 * ここに集約している。
 *
 * 【計算精度についての注意】ここでの距離計算はすべて2D(x,z)、サンプル点間の
 * 直線距離の総和という「地図描画・UI用の軽量な近似」であり、サーバー側の
 * calc/routeProfile.js(buildRouteProfile。カント・曲線半径込みの正式な物理計算)とは
 * 独立した実装。停車位置の最終的な妥当性検証(範囲チェック等)は必ずサーバー側
 * (server.js)で行われるため、ここでの計算はプレビュー・当たり判定用途に限る。
 */

export function pointsOf(seg) {
    if (seg.samples && seg.samples.length >= 2) return seg.samples;
    return [
        { x: seg.startX, z: seg.startZ },
        { x: seg.endX, z: seg.endZ },
    ];
}

/** seg自身の座標系(2D)での[sStart, sEnd]範囲だけに絞った点列を返す */
export function pointsInRange(seg, sStart, sEnd) {
    const points = pointsOf(seg);
    if (points.length < 2) return points;

    const result = [];
    let cumulative = 0;

    for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const segLen = Math.hypot(dx, dz);
        const aS = cumulative;
        const bS = cumulative + segLen;

        if (bS >= sStart && aS <= sEnd) {
            const t0 = segLen > 1e-9 ? Math.max(0, (sStart - aS) / segLen) : 0;
            const t1 = segLen > 1e-9 ? Math.min(1, (sEnd - aS) / segLen) : 1;
            if (result.length === 0) result.push({ x: a.x + dx * t0, z: a.z + dz * t0 });
            result.push({ x: a.x + dx * t1, z: a.z + dz * t1 });
        }

        cumulative = bS;
        if (cumulative > sEnd) break;
    }

    return result;
}

/** segの座標系での距離sにある1点のワールド座標を返す。範囲外ならnull */
export function pointAtDistance(seg, s) {
    const points = pointsInRange(seg, s, s);
    return points.length > 0 ? points[0] : null;
}

/** segの2D(x,z)実長(サンプル間距離の総和) */
export function segmentLength2D(seg) {
    const points = pointsOf(seg);
    let len = 0;
    for (let i = 0; i < points.length - 1; i++) {
        len += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].z - points[i].z);
    }
    return len;
}

/**
 * 番線(trackSegments)の並びに沿った累積距離cumulativeSにあるワールド座標を返す。
 * 該当する位置が見つからなければnull。
 */
export function pointAtTrackDistance(allSegments, trackSegments, cumulativeS) {
    let offset = 0;
    for (const ts of trackSegments || []) {
        const seg = allSegments.find((s) => s.id === ts.segmentId);
        if (!seg) continue;
        const segLen = segmentLength2D(seg);
        if (cumulativeS >= offset - 1e-6 && cumulativeS <= offset + segLen + 1e-6) {
            const localS = ts.reversed ? (segLen - (cumulativeS - offset)) : (cumulativeS - offset);
            return pointAtDistance(seg, localS);
        }
        offset += segLen;
    }
    return null;
}

/** 番線の全区間を、進行方向に沿って連結した1本の点列にする(存在しないセグメントIDはスキップ) */
export function trackPolyline(allSegments, trackSegments) {
    const combined = [];
    for (const ts of trackSegments || []) {
        const seg = allSegments.find((s) => s.id === ts.segmentId);
        if (!seg) continue;
        let points = pointsOf(seg);
        if (ts.reversed) points = [...points].reverse();
        combined.push(...points);
    }
    return combined;
}

/**
 * クリックされた点(segId + そのセグメント自身の座標系でのlocalS)が、番線(trackSegments)の
 * 構成セグメントのいずれかに乗っているかを判定し、乗っていれば番線内の累積距離
 * (cumulativeS)に変換して返す。乗っていなければnull。
 * (StationEditPanel.jsxの「停車位置をここに設定」バリデーションで使う)
 */
export function localPointToTrackDistance(allSegments, trackSegments, segId, localS) {
    let offset = 0;
    for (const ts of trackSegments || []) {
        const seg = allSegments.find((s) => s.id === ts.segmentId);
        if (!seg) continue;
        const segLen = segmentLength2D(seg);
        if (ts.segmentId === segId) {
            const withinSeg = ts.reversed ? (segLen - localS) : localS;
            return offset + withinSeg;
        }
        offset += segLen;
    }
    return null;
}