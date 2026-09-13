// Shared one-way centerline, with explicit loading and dumping reservations.
export const ROUTE = [[-11.3, -2.2], [-11.3, -5.6], [-10.5, -6.4], [10.5, -6.4], [11.3, -5.6], [11.3, -.3], [11.3, 5.6], [10.5, 6.4], [-10.5, 6.4], [-11.3, 5.6]];
export const LENGTHS = ROUTE.map((a, i) => Math.hypot(a[0] - ROUTE[(i + 1) % ROUTE.length][0], a[1] - ROUTE[(i + 1) % ROUTE.length][1]));
export const LOOP_LENGTH = LENGTHS.reduce((a, b) => a + b, 0);
export const DUMP_DISTANCE = LENGTHS.slice(0, 5).reduce((a, b) => a + b, 0);
export function routePoint(distance) { let d = ((distance % LOOP_LENGTH) + LOOP_LENGTH) % LOOP_LENGTH; for (let i = 0; i < ROUTE.length; i++) {
    if (d <= LENGTHS[i]) {
        const a = ROUTE[i], b = ROUTE[(i + 1) % ROUTE.length], q = d / LENGTHS[i];
        return { x: a[0] + (b[0] - a[0]) * q, z: a[1] + (b[1] - a[1]) * q, angle: Math.atan2(a[0] - b[0], a[1] - b[1]) };
    }
    d -= LENGTHS[i];
} return { x: ROUTE[0][0], z: ROUTE[0][1], angle: 0 }; }
export function trafficStep(vehicles, dt) {
    for (const v of vehicles) {
        if (v.wait > 0) {
            v.wait = Math.max(0, v.wait - dt);
            continue;
        }
        let step = dt * .95;
        for (const other of vehicles) {
            if (other === v)
                continue;
            const gap = (other.distance - v.distance + LOOP_LENGTH) % LOOP_LENGTH;
            step = Math.min(step, Math.max(0, gap - 3.3));
        }
        const next = v.distance + step;
        if (v.kind === 'haul') {
            if (v.distance < DUMP_DISTANCE && next >= DUMP_DISTANCE) {
                v.distance = DUMP_DISTANCE;
                v.wait = 5;
                v.station = 'dump';
                continue;
            }
            if (next >= LOOP_LENGTH) {
                v.distance = 0;
                v.wait = 6;
                v.station = 'load';
                continue;
            }
        }
        v.distance = next % LOOP_LENGTH;
    }
}
