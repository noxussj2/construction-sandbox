import { routePoint, trafficStep, LOOP_LENGTH } from './traffic';
// Three.js is the only network dependency. All scene assets are procedural.
export async function createDiorama(host, onStatus) {
    const url = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
    const T = await import(/* @vite-ignore */ url);
    const scene = new T.Scene();
    scene.background = new T.Color('#242b2d');
    scene.fog = new T.Fog('#242b2d', 48, 110);
    const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    host.appendChild(renderer.domElement);
    const camera = new T.PerspectiveCamera(38, 1, .1, 140);
    const target = new T.Vector3(0, 2.1, 0);
    const state = { speed: 1, cycle: true, dust: 1, rain: false, phase: .30, auto: true };
    let azimuth = .67, elevation = .48, distance = 44, idle = 0, drag = null, disposed = false, frame = 0, time = 0, last = performance.now(), fpsTime = last, frames = 0;
    const materials = new Map(), boxGeo = new T.BoxGeometry(1, 1, 1), staticBatches = new Map(), dummy = new T.Object3D();
    const material = (color) => { if (!materials.has(color))
        materials.set(color, new T.MeshStandardMaterial({ color, roughness: .83 })); return materials.get(color); };
    const world = new T.Group();
    scene.add(world);
    function box(x, y, z, w, h, d, color, parent = world, rotation = 0) { if (parent === world) {
        const list = staticBatches.get(color) || [];
        list.push([x, y, z, w, h, d, rotation]);
        staticBatches.set(color, list);
        return;
    } const m = new T.Mesh(boxGeo, material(color)); m.position.set(x, y, z); m.scale.set(w, h, d); m.rotation.y = rotation; m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
    function group(x, y, z, parent = world) { const g = new T.Group(); g.position.set(x, y, z); parent.add(g); return g; }
    function beam(a, b, width, color, parent = world) { const av = new T.Vector3(...a), bv = new T.Vector3(...b), m = new T.Mesh(boxGeo, material(color)); m.position.copy(av).add(bv).multiplyScalar(.5); m.scale.set(width, av.distanceTo(bv), width); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), bv.sub(av).normalize()); m.castShadow = true; parent.add(m); return m; }
    function cylinder(x, y, z, r, h, color, parent = world, segments = 8) { const m = new T.Mesh(new T.CylinderGeometry(r, r, h, segments), material(color)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; }
    function label(text, x, y, z, w, h, bg = '#e6dfbd', fg = '#2e3734', parent = world) { const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128; const ctx = canvas.getContext('2d'); ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 128); ctx.fillStyle = fg; ctx.font = 'bold 46px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 66); const tex = new T.CanvasTexture(canvas); tex.colorSpace = T.SRGBColorSpace; const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex, side: T.DoubleSide })); m.position.set(x, y, z); parent.add(m); return m; }
    let seed = 7129;
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    // Dark solid wood desk, with a generated grain texture.
    const wood = document.createElement('canvas');
    wood.width = 1024;
    wood.height = 512;
    const ctx = wood.getContext('2d');
    ctx.fillStyle = '#39291f';
    ctx.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 1600; i++) {
        ctx.strokeStyle = `rgba(${rand() > .5 ? '134,94,59' : '15,9,7'},${rand() * .14})`;
        ctx.beginPath();
        const y = rand() * 512;
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(300, y + rand() * 6, 700, y - 4, 1024, y + 2);
        ctx.stroke();
    }
    const woodTex = new T.CanvasTexture(wood);
    woodTex.colorSpace = T.SRGBColorSpace;
    woodTex.wrapS = woodTex.wrapT = T.RepeatWrapping;
    woodTex.repeat.set(2, 2);
    const desk = new T.Mesh(new T.BoxGeometry(36, .65, 27), new T.MeshStandardMaterial({ map: woodTex, roughness: .49 }));
    desk.position.y = -.88;
    desk.receiveShadow = true;
    scene.add(desk);
    box(0, -.4, 0, 27, .35, 19.4, '#172c30');
    box(0, -.17, 0, 26.5, .2, 19, '#b49462');
    // Ground cells leave a true recessed excavation, rather than overlapping it.
    for (let x = -12.75; x < 13; x += .5)
        for (let z = -8.75; z < 9; z += .5) {
            if (x > -10.8 && x < -4 && z > -4.8 && z < 1.3)
                continue;
            box(x, .015, z, .495, .17, .495, ['#b49768', '#ad9164', '#baa075', '#b69b70'][Math.floor(rand() * 4)]);
        }
    box(-7.5, -.20, -1.75, 6.6, .12, 6, '#80644a');
    for (let i = 0; i < 3; i++) {
        box(-10.65 + i * .22, -.10 + i * .10, -1.75, .2, .2, 6, '#987953');
        box(-7.5, -.1 + i * .10, -4.65 + i * .22, 6.5, .2, .2, '#987953');
    }
    // One-way haul road. All moving vehicles share its collision-separated schedule.
    const roadMat = new T.MeshStandardMaterial({ color: '#777a70', roughness: .95, metalness: .08 });
    const roadGroup = group(0, 0, 0);
    const road = (x, z, w, d) => { const m = new T.Mesh(boxGeo, roadMat); m.position.set(x, .13, z); m.scale.set(w, .055, d); m.receiveShadow = true; roadGroup.add(m); };
    road(0, 6.4, 23, 2.1);
    road(0, -6.4, 23, 2.1);
    road(-11.3, 0, 2.1, 14.9);
    road(11.3, 0, 2.1, 14.9);
    for (let x = -10; x <= 10; x += 1.4) {
        box(x, .165, 6.4, .55, .018, .055, '#d6cfae');
        box(x, .165, -6.4, .55, .018, .055, '#d6cfae');
    }
    for (let z = -5; z <= 5; z += 1.4) {
        box(-11.3, .165, z, .055, .018, .55, '#d6cfae');
        box(11.3, .165, z, .055, .018, .55, '#d6cfae');
    }
    // Perimeter fence, open front gate.
    for (let x = -12.5; x <= 12.5; x += 1) {
        for (const z of [-8.6, 8.6]) {
            if (z > 0 && Math.abs(x) < 2.1)
                continue;
            box(x, .65, z, .95, 1, .10, '#446b67');
            box(x, 1.22, z, .06, .24, .09, '#e6c675');
            box(x, .25, z, .93, .10, .13, '#d4aa53');
        }
    }
    for (let z = -8; z <= 8; z++) {
        box(-12.7, .65, z, .10, 1, .94, '#446b67');
        box(12.7, .65, z, .10, 1, .94, '#446b67');
    }
    for (const x of [-2.2, 2.2])
        box(x, 1.1, 8.6, .22, 2, .24, '#d9cba5');
    box(0, 2.05, 8.6, 4.6, .38, .3, '#243d3e');
    label('筑 · 造   /   SITE 07', 0, 2.05, 8.77, 4.1, .31, '#243d3e', '#f1d49b');
    // Concrete building, columns, floors, exposed rebar, and scaffolding.
    box(3.3, .3, -1.8, 6.6, .4, 5.8, '#a7aaa1');
    for (let level = 0; level < 4; level++) {
        const y = .5 + level * 1.35;
        box(3.3, y, -1.8, 6.3, .19, 5.4, '#c7c6b8');
        for (const x of [.4, 3.3, 6.2])
            for (const z of [-4.25, -1.8, .65]) {
                box(x, y + .64, z, .28, 1.2, .28, '#a8afa8');
                if (level === 3)
                    for (let k = 0; k < 3; k++)
                        box(x + (k - 1) * .07, y + 1.55, z, .025, .8, .025, '#73564b');
            }
        if (level < 2) {
            box(1.7, y + .58, -4.17, 2.25, 1.03, .15, '#be7655');
            box(6.12, y + .58, -2.9, .15, 1.03, 2.15, '#bd7b59');
        }
    }
    for (let x = -.2; x < 7; x += .8)
        for (const z of [-4.8, 1.2]) {
            box(x, 2.9, z, .045, 5.7, .045, '#6f8885');
            for (let y = 1; y < 6; y += 1.3) {
                box(x + .4, y, z, .8, .045, .045, '#9eaaa0');
                if (x < 6.2)
                    beam([x, y, z], [x + .8, y + 1.3, z], .025, '#728b87');
            }
        }
    for (const z of [-4.8, 1.2])
        for (let y = 1; y < 5; y += 1.3)
            box(3.1, y, z, 6.9, .07, .45, '#837a61');
    // Rebar processing shelter, material laydown and prefab offices.
    for (const x of [-9, -5])
        for (const z of [2.4, 4.6])
            box(x, 1.02, z, .1, 1.9, .1, '#536d6d');
    box(-7, 2, 3.5, 4.6, .15, 2.8, '#638d8b');
    for (let i = 0; i < 20; i++)
        box(-8.6 + i * .15, .38, 3.2, .045, .06, 1.7, '#65564d');
    box(-6.4, .62, 3.3, 1.2, .14, .8, '#797f75');
    for (let i = 0; i < 4; i++) {
        box(8.8, .45 + i * .21, 2.8, 2.1, .17, .85, '#978d76');
        for (let j = 0; j < 8; j++)
            box(7.95 + j * .23, .38 + i * .21, 4.2, .19, .17, .35, '#cdbd92');
    }
    for (let i = 0; i < 30; i++)
        box(7.8 + rand() * 2, .25 + Math.floor(i / 10) * .12, -3 + rand() * 1.3, .4, .15, .35, '#b5b8aa');
    const glowMat = new T.MeshStandardMaterial({ color: '#ffdb91', emissive: '#ffb958', emissiveIntensity: .2, roughness: .35 });
    for (let i = 0; i < 3; i++) {
        const x = -7.8 + i * 3.1;
        box(x, .77, -7.9, 2.8, 1.4, 1.08, '#d1d1b9');
        box(x, 1.54, -7.9, 2.95, .15, 1.22, '#577d79');
        for (let j = 0; j < 3; j++) {
            const m = new T.Mesh(boxGeo, glowMat);
            m.position.set(x - .9 + j * .8, .92, -7.345);
            m.scale.set(.51, .55, .02);
            world.add(m);
        }
        box(x + .92, .6, -7.33, .42, 1, .06, '#557d79');
    }
    function mound(x, z, r, color) { for (let i = -r; i <= r; i += .3)
        for (let j = -r; j <= r; j += .3) {
            const h = Math.max(0, 1 - Math.hypot(i, j) / r) * r * .8;
            if (h > .04)
                box(x + i, .14 + h / 2, z + j, .3, h, .3, color);
        } }
    mound(8.4, -5, 1.15, '#b99b60');
    mound(-3, 3.7, 1.15, '#777e75');
    mound(8.8, -.3, 1.2, '#9a744c');
    // Tabletop accessories: procedural blueprint, tape, safety helmet and spirit level.
    const paper = label('', -14.1, -.53, 3.1, 4, 3, '#547d8b');
    paper.rotation.x = -Math.PI / 2;
    paper.rotation.z = -.16;
    const pc = paper.material.map.image, pctx = pc.getContext('2d');
    pctx.strokeStyle = '#c5dce0';
    pctx.lineWidth = 1;
    for (let i = 15; i < 512; i += 28) {
        pctx.beginPath();
        pctx.moveTo(i, 0);
        pctx.lineTo(i, 128);
        pctx.stroke();
    }
    for (let i = 8; i < 128; i += 16)
        pctx.strokeRect(12, i, 480, 1);
    pctx.lineWidth = 3;
    pctx.strokeRect(90, 28, 270, 74);
    pctx.strokeRect(130, 40, 95, 52);
    paper.material.map.needsUpdate = true;
    const helmet = group(14.8, -.52, 3.5);
    const dome = new T.Mesh(new T.SphereGeometry(.8, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), material('#e8ad39'));
    helmet.add(dome);
    box(0, .06, 0, 1.9, .12, 1.5, '#f5ba46', helmet);
    box(0, .66, 0, .13, .22, 1, '#f3c35d', helmet);
    box(14.8, -.36, 6.2, 2.8, .24, .42, '#829c96');
    box(14.8, -.22, 6.2, .5, .025, .24, '#c8df7b');
    box(-14.7, -.2, 6.4, 1.1, .65, .95, '#dbad3e');
    box(-13.2, -.49, 6.4, 2, .04, .24, '#cac5ae');
    // Front physical controller panel: meshes themselves are raycast targets.
    const controls = group(0, -.46, 11);
    box(0, 0, 0, 8.9, .18, 1.7, '#1e3030', controls);
    const knobs = [], knobIndicators = [];
    for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 2.7;
        const k = cylinder(x, .24, 0, .35, .35, '#b8ab85', controls, 16);
        knobs.push(k);
        knobIndicators.push(box(x, .425, -.17, .04, .015, .16, '#223936', controls));
        const l = label(['运行速度', '昼夜循环', '扬尘强度'][i], x, .105, .58, 1.6, .35, '#1e3030', '#e3d7b5', controls);
        l.rotation.x = -Math.PI / 2;
    }
    // Workers are animated in reserved pedestrian areas, away from traffic lanes.
    const workers = [];
    function worker(x, z, job, index, y = .16) { const g = group(x, y, z); box(0, .42, 0, .24, .34, .17, index % 4 === 0 ? '#6f9290' : '#dd793e', g); box(0, .7, 0, .18, .18, .17, '#cb9c73', g); box(0, .81, 0, .27, .1, .23, index % 5 === 0 ? '#e4e3ce' : '#f2be3f', g); box(0, .43, .092, .04, .28, .01, '#eade9a', g); const arms = []; for (const s of [-1, 1]) {
        box(s * .07, .16, 0, .095, .29, .12, '#354b4f', g);
        const arm = group(s * .19, .54, 0, g);
        box(0, -.12, 0, .08, .28, .09, '#dd925a', arm);
        arms.push(arm);
    } if (job === 'carry')
        box(0, .38, -.22, .43, .18, .23, '#c3b694', g); if (job === 'tool')
        box(0, .16, -.23, .09, .38, .09, '#708c84', g); workers.push({ g, arms, job, x, z, index }); }
    for (let i = 0; i < 10; i++)
        worker(-8.8 + (i % 5) * .74, 2.6 + Math.floor(i / 5) * 1.6, 'tie', i);
    for (let i = 0; i < 9; i++)
        worker(.8 + (i % 3) * 1.7, -3.8 + Math.floor(i / 3) * 1.55, 'tie', i + 10, 5.1);
    for (let i = 0; i < 8; i++)
        worker(-1.8 + i * 1.35, 4.65, i % 2 ? 'carry' : 'signal', i + 20);
    worker(2.8, 7.8, 'guard', 31);
    worker(-2.8, 7.8, 'guard', 32);
    worker(7.5, 1.5, 'tool', 33);
    // Tracked excavators: short independent digging arcs stay inside pit work cells.
    const excavators = [];
    function excavator(x, z, angle) { const g = group(x, .16, z); g.rotation.y = angle; for (const s of [-1, 1]) {
        box(s * .48, .16, 0, .27, .3, 1.4, '#354446', g);
        for (let i = 0; i < 7; i++)
            box(s * .48, .1, -.58 + i * .19, .29, .07, .09, '#6d7970', g);
    } const upper = group(0, .38, 0, g); box(0, .23, 0, .95, .4, 1, '#e9b43c', upper); box(-.19, .63, .14, .5, .55, .56, '#edc450', upper); box(-.19, .69, -.151, .36, .35, .025, '#395c63', upper); const arm = beam([.3, .45, -.35], [.3, 1.5, -1], .19, '#efbd43', upper); const fore = beam([.3, 1.5, -1], [.3, .4, -1.8], .16, '#da9d31', upper); const bucket = group(.3, .4, -1.8, upper); box(0, -.03, -.14, .55, .28, .4, '#4b5550', bucket); for (let i = 0; i < 4; i++)
        box(-.21 + i * .14, -.15, -.38, .08, .09, .17, '#afaa8a', bucket); excavators.push({ g, upper, arm, fore, bucket }); }
    excavator(-9.1, -2.2, -.9);
    excavator(-5.4, -2.4, .7);
    const trucks = [];
    function vehicle(kind, offset) { const g = group(0, .2, 0); box(0, .3, 0, .92, .22, 1.95, '#374948', g); for (const z of [-.65, .6])
        for (const s of [-1, 1]) {
            const wheel = cylinder(s * .53, .23, z, .26, .16, '#293c3d', g, 10);
            wheel.rotation.z = Math.PI / 2;
        } box(0, .73, -.62, .91, .73, .69, kind === 'mixer' ? '#d9ddc7' : '#d59042', g); box(0, .86, -.975, .74, .32, .025, '#38595d', g); for (const s of [-1, 1])
        box(s * .3, .51, -.982, .15, .12, .025, '#ffe8a4', g); const bed = group(0, .51, .77, g); let drum = null; if (kind === 'mixer') {
        const axle = group(0, .4, -.4, bed);
        axle.rotation.x = Math.PI / 2;
        drum = group(0, 0, 0, axle);
        cylinder(0, 0, 0, .5, 1.1, '#d8d5b9', drum, 10);
        for (let a = 0; a < 6; a++) {
            const r = a * Math.PI / 3;
            box(Math.cos(r) * .48, 0, Math.sin(r) * .48, .09, 1.04, .09, '#b86644', drum);
        }
    }
    else {
        box(0, .05, -.4, .9, .12, 1.3, '#d9a04a', bed);
        for (const x of [-.47, .47])
            box(x, .28, -.4, .08, .48, 1.35, '#ddab50', bed);
        box(0, .28, .26, .9, .48, .09, '#c58c3b', bed);
    } const load = box(0, .35, -.4, .78, .27, 1.08, '#947048', bed); if (kind === 'mixer')
        load.visible = false; trucks.push({ g, bed, load, drum, kind, offset, distance: offset * LOOP_LENGTH, wait: offset === 0 ? 6 : 0, station: offset === 0 ? 'load' : 'travel', fill: 0 }); }
    vehicle('haul', 0);
    vehicle('haul', .34);
    vehicle('mixer', .68);
    const loader = group(-2.5, .18, 1.8);
    box(0, .38, 0, .7, .4, 1, '#e2b547', loader);
    box(0, .8, .1, .48, .48, .47, '#d9bd60', loader);
    box(0, .85, -.145, .36, .28, .03, '#466565', loader);
    box(0, .2, -.86, 1, .3, .5, '#b18a3e', loader);
    for (const x of [-.43, .43])
        for (const z of [-.35, .35]) {
            const w = cylinder(x, .2, z, .22, .17, '#304342', loader);
            w.rotation.z = Math.PI / 2;
        }
    // Crane slew radii remain inside the tray; different heights and disjoint sectors.
    const cranes = [];
    function crane(x, z, height, span, baseAngle) { const g = group(x, .15, z); box(0, .15, 0, 1.35, .3, 1.35, '#858c7c', g); for (const a of [-.24, .24])
        for (const b of [-.24, .24])
            box(a, height / 2, b, .075, height, .075, '#e6b950', g); for (let y = .6; y < height; y += .65) {
        box(0, y, 0, .57, .055, .57, '#dcab44', g);
        for (const side of [-.25, .25])
            beam([-.24, y, side], [.24, y + .65, side], .045, '#d2a345', g);
    } const pivot = group(0, height, 0, g); box(span * .32, 0, 0, span, .18, .45, '#efc55a', pivot); for (let a = -span * .18; a < span * .82; a += .52) {
        beam([a, 0, -.22], [a + .26, .48, 0], .045, '#dbae48', pivot);
        beam([a + .26, .48, 0], [a + .52, 0, -.22], .045, '#dbae48', pivot);
        beam([a, 0, .22], [a + .26, .48, 0], .045, '#dbae48', pivot);
    } box(-span * .12, -.3, 0, .8, .5, .75, '#9eaaa1', pivot); box(.28, -.3, .32, .6, .5, .55, '#d5b65e', pivot); box(.3, -.3, .605, .43, .28, .015, '#456164', pivot); const trolley = group(span * .55, -.13, 0, pivot); const rope = box(0, -1.1, 0, .026, 2.2, .026, '#455653', trolley); const cargo = group(0, -2.25, 0, trolley); if (height > 10 && x > 0) {
        box(0, 0, 0, .55, .45, .55, '#acaaa0', cargo);
        box(0, -.31, 0, .23, .2, .23, '#767f79', cargo);
        beam([-.28, .2, 0], [0, .6, 0], .025, '#455653', cargo);
        beam([.28, .2, 0], [0, .6, 0], .025, '#455653', cargo);
    }
    else
        for (let i = 0; i < 5; i++)
            box(0, i * .055, 0, 1.1, .04, .08, '#6e6c60', cargo); cranes.push({ pivot, trolley, rope, cargo, height, span, baseAngle }); }
    crane(-2.7, -3.6, 10.2, 5.6, .3);
    crane(7, 2.1, 10.1, 5.1, 2.1);
    // Warm practical lights with shader halos; no external sprites.
    const lamps = [];
    const haloGeometry = new T.PlaneGeometry(1, 1);
    const haloMaterial = new T.ShaderMaterial({ uniforms: { strength: { value: 0 } }, vertexShader: 'varying vec2 vUv; void main(){vUv=uv;vec4 p=modelViewMatrix*vec4(0.,0.,0.,1.);p.xy+=position.xy;gl_Position=projectionMatrix*p;}', fragmentShader: 'varying vec2 vUv;uniform float strength;void main(){float d=length(vUv-.5)*2.;gl_FragColor=vec4(1.,.72,.34,pow(max(0.,1.-d),3.)*strength);}', transparent: true, depthWrite: false, blending: T.AdditiveBlending });
    function lamp(x, y, z) { box(x, y / 2, z, .07, y, .07, '#526966'); const bulb = new T.Mesh(boxGeo, glowMat); bulb.position.set(x, y, z); bulb.scale.set(.35, .16, .27); world.add(bulb); const halo = new T.Mesh(haloGeometry, haloMaterial); halo.position.set(x, y, z); world.add(halo); const l = new T.PointLight('#ffcc85', 0, 9, 2); l.position.set(x, y - .15, z); scene.add(l); lamps.push(l); }
    lamp(-10, 3.1, 4.9);
    lamp(10, 3.1, 5);
    lamp(-8, 2.8, -5.1);
    lamp(6.8, 5.9, -4.8);
    lamp(-2.7, 10.4, -3.6);
    lamp(7, 10.4, 2.1);
    for (let i = 0; i < 14; i++) {
        const x = -10 + i * 1.5;
        box(x, 1.55, 8.58, .02, .45, .02, '#d1b878');
        const flag = new T.Mesh(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, .35, 0, 0, 0, -.35, 0], 3)), new T.MeshStandardMaterial({ color: i % 2 ? '#d7824a' : '#d9c265', side: T.DoubleSide }));
        flag.position.set(x, 1.8, 8.58);
        world.add(flag);
    }
    for (const x of [-11.9, 11.9]) {
        box(x, 1.9, -7.8, .1, 3.8, .1, '#776d54');
        box(x, 3.5, -7.8, .8, .07, .1, '#676d5c');
    }
    for (let i = 0; i < 24; i++)
        beam([-11.9 + i * .99, 3.5 - Math.sin(i / 24 * Math.PI) * .6, -7.8], [-11.9 + (i + 1) * .99, 3.5 - Math.sin((i + 1) / 24 * Math.PI) * .6, -7.8], .018, '#3a4847');
    label('安全第一', -7, 1, 8.67, 2, .42, '#e0ba63');
    label('PPE REQUIRED', 7, 1, 8.67, 2, .36, '#d5c59a');
    for (const [x, z] of [[-3, 1], [-4, 1], [7, 4.8], [-9, 4.9]]) {
        box(x, .19, z, .3, .1, .3, '#ded1ad');
        box(x, .43, z, .13, .4, .13, '#dc7a43');
        box(x, .46, z, .14, .08, .14, '#e9dec0');
    }
    // Batch the hundreds of terrain, scaffold, fence and building pieces by material.
    let instanceCount = 0;
    for (const [color, list] of staticBatches) {
        const mesh = new T.InstancedMesh(boxGeo, material(color), list.length);
        list.forEach(([x, y, z, w, h, d, r], i) => { dummy.position.set(x, y, z); dummy.scale.set(w, h, d); dummy.rotation.set(0, r, 0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); });
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        world.add(mesh);
        instanceCount += list.length;
    }
    // GPU particles, clipped to tray bounds. Rain never enters the surrounding room.
    function particles(count, rain) { const geo = new T.BufferGeometry(), p = new Float32Array(count * 3), s = new Float32Array(count); for (let i = 0; i < count; i++) {
        p[i * 3] = (rand() - .5) * 24;
        p[i * 3 + 1] = rand() * (rain ? 12 : 2.5);
        p[i * 3 + 2] = (rand() - .5) * 16;
        s[i] = rand();
    } geo.setAttribute('position', new T.BufferAttribute(p, 3)); geo.setAttribute('aSeed', new T.BufferAttribute(s, 1)); const mat = new T.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uAmount: { value: rain ? 0 : .35 } }, vertexShader: `attribute float aSeed;uniform float uTime;varying float vSeed;void main(){vSeed=aSeed;vec3 p=position;${rain ? 'p.y=mod(position.y-uTime*(8.+aSeed*5.),12.);' : 'p.y=.2+mod(position.y+uTime*.15,2.5);p.x+=sin(uTime*.3+aSeed*60.)*.3;'}vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=${rain ? 'clamp(230./-mv.z,3.,10.)' : 'clamp(95./-mv.z,1.,7.)'};gl_Position=projectionMatrix*mv;}`, fragmentShader: `uniform float uAmount;varying float vSeed;void main(){if(vSeed>uAmount)discard;vec2 p=gl_PointCoord-.5;float alpha=${rain ? 'smoothstep(.14,.02,abs(p.x))*smoothstep(.5,.3,abs(p.y))*.65' : 'smoothstep(.5,.05,length(p))*.19'};gl_FragColor=vec4(${rain ? ' .7,.84,.87' : ' .76,.64,.44'},alpha);}`, transparent: true, depthWrite: false }); const pts = new T.Points(geo, mat); pts.frustumCulled = false; world.add(pts); return mat; }
    const dust = particles(650, false), rain = particles(2800, true);
    const ambient = new T.HemisphereLight('#e7edd7', '#696b5e', 2);
    scene.add(ambient);
    const sun = new T.DirectionalLight('#ffe1ae', 3);
    sun.position.set(-12, 24, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -19, right: 19, top: 19, bottom: -19, near: 1, far: 65 });
    sun.shadow.bias = -.0005;
    sun.shadow.normalBias = .045;
    scene.add(sun);
    const fill = new T.DirectionalLight('#b5d2d6', 1);
    fill.position.set(10, 10, -15);
    scene.add(fill);
    const raycaster = new T.Raycaster(), pointer = new T.Vector2();
    const emit = () => onStatus({ ...state, phaseName: state.rain ? '暴雨' : state.phase < .2 ? '黎明' : state.phase < .53 ? '正午' : state.phase < .7 ? '黄昏' : '夜晚', instances: instanceCount });
    function change(key, value) { state[key] = value; emit(); }
    function knob(i) { if (i === 0)
        change('speed', state.speed === 2 ? 0.5 : state.speed === .5 ? 1 : 2); if (i === 1)
        change('cycle', !state.cycle); if (i === 2)
        change('dust', (state.dust + 1) % 3); }
    function down(e) { drag = { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY }; renderer.domElement.setPointerCapture(e.pointerId); idle = 0; }
    function move(e) { if (!drag)
        return; azimuth -= (e.clientX - drag.x) * .006; elevation = Math.max(.19, Math.min(1.05, elevation + (e.clientY - drag.y) * .004)); drag.x = e.clientX; drag.y = e.clientY; idle = 0; }
    function up(e) { if (drag && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 6) {
        const r = renderer.domElement.getBoundingClientRect();
        pointer.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(knobs)[0];
        if (hit)
            knob(knobs.indexOf(hit.object));
    } drag = null; }
    function wheel(e) { e.preventDefault(); distance = Math.max(29, Math.min(61, distance + e.deltaY * .025)); idle = 0; }
    function key(e) { if (e.code === 'Space' && !['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        change('rain', !state.rain);
    } }
    renderer.domElement.addEventListener('pointerdown', down);
    renderer.domElement.addEventListener('pointermove', move);
    renderer.domElement.addEventListener('pointerup', up);
    renderer.domElement.addEventListener('pointercancel', up);
    renderer.domElement.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('keydown', key);
    const resize = new ResizeObserver(() => { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); });
    resize.observe(host);
    // Rounded rectangular lane parameterization; constant spacing prevents rear collisions.
    const skyColors = ['#766757', '#35413f', '#604b46', '#17252e', '#17252e'], skyStops = [0, .25, .53, .70, 1], skyColor = new T.Color(), rainSky = new T.Color('#293b43');
    const upVector = new T.Vector3(0, 1, 0), beamDirection = new T.Vector3(), jointA = new T.Vector3(), jointB = new T.Vector3(), jointC = new T.Vector3();
    function animate(now) {
        if (disposed)
            return;
        frame = requestAnimationFrame(animate);
        const dt = Math.min((now - last) / 1000, .05);
        last = now;
        if (document.hidden)
            return;
        time += dt * state.speed;
        idle += dt;
        if (state.auto && !drag && idle > 7)
            azimuth += dt * .025;
        const fittedDistance = distance * Math.max(1, .95 / camera.aspect);
        camera.position.set(Math.sin(azimuth) * Math.cos(elevation) * fittedDistance, target.y + Math.sin(elevation) * fittedDistance, Math.cos(azimuth) * Math.cos(elevation) * fittedDistance);
        camera.lookAt(target);
        if (state.cycle)
            state.phase = (state.phase + dt / 180) % 1;
        const daylight = Math.max(0, Math.sin(state.phase * Math.PI * 2));
        const night = 1 - T.MathUtils.smoothstep(daylight, 0, .55);
        ambient.intensity = .48 + daylight * 1.65;
        sun.intensity = (state.rain ? .6 : 1) * (daylight * 3 + .12);
        sun.color.set(state.phase > .48 ? '#ffa064' : '#ffe5b6');
        fill.intensity = .25 + daylight * .65;
        let skyIndex = 0;
        while (skyIndex < 3 && state.phase > skyStops[skyIndex + 1])
            skyIndex++;
        skyColor.set(skyColors[skyIndex]).lerp(new T.Color(skyColors[skyIndex + 1]), T.MathUtils.smoothstep(state.phase, skyStops[skyIndex], skyStops[skyIndex + 1]));
        if (state.phase > .88)
            skyColor.lerp(new T.Color(skyColors[0]), (state.phase - .88) / .12);
        scene.background.copy(state.rain ? rainSky : skyColor);
        scene.fog.color.copy(scene.background);
        glowMat.emissiveIntensity = .3 + night * 2.5 + (state.rain ? 1.5 : 0);
        haloMaterial.uniforms.strength.value = night * .85 + (state.rain ? .5 : 0);
        lamps.forEach(l => l.intensity = night * 15 + (state.rain ? 13 : 0));
        roadMat.roughness = state.rain ? .19 : .95;
        roadMat.metalness = state.rain ? .38 : .08;
        const poseBeam = (m, a, b, width) => { m.position.copy(a).add(b).multiplyScalar(.5); m.scale.set(width, a.distanceTo(b), width); m.quaternion.setFromUnitVectors(upVector, beamDirection.copy(b).sub(a).normalize()); };
        excavators.forEach((e, i) => { const t = time * .8 + i * 2; const loading = i === 0 && trucks.some(v => v.kind === 'haul' && v.station === 'load' && v.wait > 0); const r = 1.25 + Math.sin(t) * .25; const y = loading ? 1.0 : .1 + Math.sin(t + .9) * .55; const dy = y - .45; const delta = -Math.acos(T.MathUtils.clamp((r * r + dy * dy - 1.15 * 1.15 - 1.1 * 1.1) / (2 * 1.15 * 1.1), -1, 1)); const theta = Math.atan2(dy, r) - Math.atan2(1.1 * Math.sin(delta), 1.15 + 1.1 * Math.cos(delta)); jointA.set(.3, .45, -.35); jointB.set(.3, .45 + 1.15 * Math.sin(theta), -.35 - 1.15 * Math.cos(theta)); jointC.set(.3, y, -.35 - r); poseBeam(e.arm, jointA, jointB, .19); poseBeam(e.fore, jointB, jointC, .16); e.bucket.position.copy(jointC); e.bucket.rotation.x = .15 + Math.sin(t + 1.8) * .3; const desired = loading ? 2.47 : Math.sin(t * .45) * .14; e.upper.rotation.y = T.MathUtils.damp(e.upper.rotation.y, desired, 1.5, dt * state.speed); });
        trafficStep(trucks, dt * state.speed);
        trucks.forEach(v => { const q = routePoint(v.distance); v.g.position.set(q.x, .2, q.z); v.g.rotation.y = v.station === 'dump' && v.wait > 0 ? -Math.PI / 2 : q.angle; const work = dt * state.speed; if (v.wait > 0 && v.station === 'load')
            v.fill = Math.min(1, v.fill + work / 5); if (v.wait > 0 && v.station === 'dump')
            v.fill = Math.max(0, v.fill - work / 3); v.load.visible = v.kind !== 'mixer' && v.fill > .02; v.load.scale.y = .27 * Math.max(.02, v.fill); v.load.position.y = .15 + .135 * v.fill; v.bed.rotation.x = v.station === 'dump' && v.wait > 0 ? -Math.sin((5 - v.wait) / 5 * Math.PI) * .65 : 0; if (v.drum)
            v.drum.rotation.y += work * .8; });
        loader.position.x = -2.5 + Math.sin(time * .35) * .4;
        cranes.forEach((c, i) => { c.pivot.rotation.y = c.baseAngle + Math.sin(time * .12 + i) * .42; c.trolley.position.x = c.span * (.44 + .12 * Math.sin(time * .24 + i)); const len = 1.2 + (Math.sin(time * .3 + i) + 1) * .7; c.rope.scale.y = len; c.rope.position.y = -len / 2; c.cargo.position.y = -len; });
        workers.forEach(w => { const a = Math.sin(time * 2 + w.index); w.arms[0].rotation.x = w.job === 'signal' ? -1.8 + a * .25 : -.65 + a * .4; w.arms[1].rotation.x = -.7 - a * .3; if (w.job === 'guard')
            w.g.position.x = w.x + Math.sin(time * .3) * .5; if (w.job === 'carry')
            w.g.position.x = w.x + Math.sin(time * .5 + w.index) * .25; if (w.job === 'tool')
            w.g.position.y = .16 + Math.abs(a) * .035; });
        knobIndicators.forEach((m, i) => { const a = i === 0 ? state.speed * .8 : i === 1 ? (state.cycle ? 1 : -1) : state.dust * 1.1; m.position.x = (i - 1) * 2.7 + Math.sin(a) * .2; m.position.z = -Math.cos(a) * .2; m.rotation.y = -a; });
        dust.uniforms.uTime.value = time;
        dust.uniforms.uAmount.value = state.rain ? 0 : [0, .4, 1][state.dust];
        rain.uniforms.uTime.value = now / 1000;
        rain.uniforms.uAmount.value = state.rain ? 1 : 0;
        renderer.render(scene, camera);
        frames++;
        if (now - fpsTime > 1000) {
            onStatus({ ...state, fps: Math.round(frames * 1000 / (now - fpsTime)), phaseName: state.rain ? '暴雨' : state.phase < .2 ? '黎明' : state.phase < .53 ? '正午' : state.phase < .7 ? '黄昏' : '夜晚', instances: instanceCount, drawCalls: renderer.info.render.calls });
            frames = 0;
            fpsTime = now;
        }
    }
    emit();
    frame = requestAnimationFrame(animate);
    return { set: change, resetView() { azimuth = .67; elevation = .48; distance = 44; idle = 0; }, dispose() { disposed = true; cancelAnimationFrame(frame); resize.disconnect(); window.removeEventListener('keydown', key); renderer.domElement.removeEventListener('pointerdown', down); renderer.domElement.removeEventListener('pointermove', move); renderer.domElement.removeEventListener('pointerup', up); renderer.domElement.removeEventListener('pointercancel', up); renderer.domElement.removeEventListener('wheel', wheel); const geometries = new Set(), mats = new Set(), textures = new Set(); scene.traverse(o => { if (o.geometry)
            geometries.add(o.geometry); if (o.material) {
            for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
                mats.add(m);
                if (m.map)
                    textures.add(m.map);
            }
        } }); geometries.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); renderer.dispose(); renderer.domElement.remove(); } };
}
