import assert from 'node:assert/strict';
import { trafficStep, routePoint, LOOP_LENGTH } from '../lib/construction/traffic.js';
const vehicles = [{ kind: 'haul', distance: 0, wait: 6 }, { kind: 'haul', distance: LOOP_LENGTH * .34, wait: 0 }, { kind: 'mixer', distance: LOOP_LENGTH * .68, wait: 0 }];
let loadStops = 0, dumpStops = 0, minGap = Infinity;
for (let n = 0; n < 60 * 600; n++) {
    const before = vehicles.map(v => v.wait);
    trafficStep(vehicles, 1 / 60);
    vehicles.forEach((v, i) => { if (v.wait > before[i]) {
        if (v.station === 'load')
            loadStops++;
        if (v.station === 'dump')
            dumpStops++;
    } const p = routePoint(v.distance); assert(Math.abs(p.x) + 1.15 < 12.7, 'vehicle must remain inside fence'); assert(Math.abs(p.z) + 1.15 < 8.6, 'vehicle must remain inside fence'); vehicles.forEach((o, j) => { if (i === j)
        return; const q = routePoint(o.distance); minGap = Math.min(minGap, Math.hypot(q.x - p.x, q.z - p.z)); assert(Math.hypot(q.x - p.x, q.z - p.z) > 2.3, 'vehicle bounding circles must remain disjoint'); }); });
}
assert(loadStops > 5 && dumpStops > 5, 'trucks must repeatedly load and dump');
console.log(JSON.stringify({ simulatedSeconds: 600, loadStops, dumpStops, minimumVehicleCenterDistance: minGap.toFixed(2), result: 'PASS' }));
