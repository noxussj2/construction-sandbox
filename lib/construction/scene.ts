import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {siteSolids,LANDINGS,PAD,GROUND_BAY} from './layout';
import { Simulation, MATERIALS, CRANE_CONTROL, type MaterialKind, type V3 } from './simulation';
export function createWorld(container:HTMLDivElement,sim:Simulation,onTick:()=>void){
 const horizon='#273532';const scene=new THREE.Scene();scene.background=new THREE.Color(horizon);scene.fog=new THREE.Fog(horizon,48,112);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;container.appendChild(renderer.domElement);
 const camera=new THREE.OrthographicCamera(-24,24,19,-19,.1,180);camera.position.set(31,30,-39);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1.5,0);controls.enableDamping=true;controls.minPolarAngle=.28;controls.maxPolarAngle=Math.PI/2.2;controls.minZoom=.65;controls.maxZoom=3.4;controls.maxTargetRadius=15;controls.update();
 scene.add(new THREE.HemisphereLight('#fff3d8','#607572',2.5));const sun=new THREE.DirectionalLight('#ffe5b8',4.1);sun.position.set(-18,28,-14);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:.5,far:85});sun.shadow.normalBias=.05;sun.shadow.bias=-.0002;sun.shadow.radius=3;scene.add(sun);const fill=new THREE.DirectionalLight('#b6d9dd',.8);fill.position.set(14,10,12);scene.add(fill);
 const mats=new Map<string,THREE.MeshStandardMaterial>();const cube=new THREE.BoxGeometry(1,1,1);const geometries:THREE.BufferGeometry[]=[cube];const textures:THREE.Texture[]=[];
 function material(color:string,glass=false){const key=color+glass;if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color,roughness:glass?.2:.82,metalness:0,transparent:glass,opacity:glass?.55:1,depthWrite:!glass}));return mats.get(key)!;}
 function box(size:V3,pos:V3,color:string,parent:THREE.Object3D=scene){const m=new THREE.Mesh(cube,material(color));m.scale.set(...size);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function rod(a:V3,b:V3,width:number,color:string,parent:THREE.Object3D=scene){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b);const m=box([width,av.distanceTo(bv),width],[0,0,0],color,parent);m.position.copy(av.add(bv).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).normalize());return m;}
 function textLabel(text:string,width:number,pos:V3,parent:THREE.Object3D=scene,bg='#345d52',fg='#efe9d6'){
  const c=document.createElement('canvas');c.width=512;c.height=112;const ctx=c.getContext('2d')!;ctx.fillStyle=bg;ctx.fillRect(0,0,512,112);ctx.strokeStyle=fg;ctx.lineWidth=3;ctx.strokeRect(10,10,492,92);ctx.fillStyle=fg;ctx.font='600 40px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,57);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;textures.push(tex);const geo=new THREE.PlaneGeometry(width,width*112/512);geometries.push(geo);const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));m.position.set(...pos);m.rotation.y=Math.PI;parent.add(m);return m;
 }
 // A true 38 × 30 rectangular plot. The unlit outer ground matches the fog exactly,
 // so a low/front camera angle never exposes a horizon seam.
 box([38,.55,30],[0,-.75,0],'#17221f');box([37.6,.17,29.6],[0,-.38,0],'#b59362');box([37.25,.4,29.25],[0,-.13,0],'#d6c7a5');box([36.8,.035,28.8],[0,.08,0],'#cabea0');
 const floor=new THREE.Mesh(cube,new THREE.MeshBasicMaterial({color:horizon,fog:true}));floor.scale.set(260,.2,260);floor.position.set(0,-1.85,0);scene.add(floor);
 // Code-generated tabletop and drafting props, outside the vehicle boundary.
 const tabletop=box([42,.65,34],[0,-1.35,0],'#3b2921');
 const wood=document.createElement('canvas');wood.width=512;wood.height=128;
 const wc=wood.getContext('2d')!;wc.fillStyle='#493128';wc.fillRect(0,0,512,128);
 for(let i=0;i<100;i++){wc.strokeStyle=i%3?'#51372b':'#38261f';wc.lineWidth=.4+(i%4)*.3;wc.beginPath();for(let x=0;x<=512;x+=8){const y=i*1.28+Math.sin(x*.035+i)*1.6;if(x===0)wc.moveTo(x,y);else wc.lineTo(x,y);}wc.stroke();}
 const woodTex=new THREE.CanvasTexture(wood);woodTex.colorSpace=THREE.SRGBColorSpace;textures.push(woodTex);
 tabletop.material=new THREE.MeshStandardMaterial({map:woodTex,roughness:.7});
 box([4,.02,1.5],[-9,-1,-16],'#557c88');
 for(let i=0;i<7;i++)box([.015,.008,1.35],[-10.8+i*.6,-.984,-16],'#bdd4cf');
 for(let i=0;i<4;i++)box([3.8,.008,.015],[-9,-.984,-16.6+i*.4],'#bdd4cf');
 box([1.8,.12,.22],[8,-.94,-16],'#b6bdb2');box([.32,.03,.13],[8,-.865,-16],'#a5c27f');
 box([.6,.42,.55],[10,-.8,-16],'#d7a33a');box([1.1,.025,.16],[9.3,-.985,-16],'#d9ceb1');
 // Peripheral charcoal service road, with dashed markings.
 box([35,.03,3.4],[0,.12,-11.8],'#7e877a');box([3.1,.03,24],[-16.4,.12,0],'#7e877a');box([3.1,.03,24],[16.4,.12,0],'#7e877a');box([35,.03,3.4],[0,.12,11.8],'#7e877a');
 for(let x=-15.5;x<=15.5;x+=2)for(const z of [-11.8,11.8])box([.85,.015,.055],[x,.15,z],'#e5dcc2');for(let z=-8.2;z<=8.2;z+=2)for(const x of [-16.4,16.4])box([.055,.015,.85],[x,.15,z],'#e5dcc2');
 for(let i=0;i<24;i++){const x=-17.25+i*1.5;for(const z of [-13.8,13.8]){if(z<0&&Math.abs(x)<2.5)continue;box([1.43,1.05,.12],[x,.65,z],i%2?'#e0e4d3':'#527e70');box([.08,1.27,.2],[x-.72,.68,z],'#f0ecda');box([1.5,.08,.2],[x,1.2,z],'#ddd9c2');}}
 for(let i=0;i<18;i++){const z=-13.05+i*1.54;for(const x of [-18.35,18.35]){box([.12,1.05,1.46],[x,.65,z],i%2?'#e0e4d3':'#527e70');box([.2,1.25,.08],[x,.68,z-.73],'#f0ecda');}}
 textLabel('筑 城 之 间  /  LITTLE BUILDERS',7,[0,-.35,-14.92]);
 // Blueprint footprint and corner stakes.
 box([9.2,.025,7.2],[0,.105,0],'#b2a78b');for(const x of [-4.6,4.6])for(const z of [-3.6,3.6])box([.09,.65,.09],[x,.4,z],'#aa8050');
 for(const x of [-4.6,4.6])rod([x,.36,-3.6],[x,.36,3.6],.018,'#f2d888');for(const z of [-3.6,3.6])rod([-4.6,.36,z],[4.6,.36,z],.018,'#f2d888');
 // One visible kit equals one simulation inventory unit. Door/window kits are
 // complete modules rather than an ambiguous box of "fittings".
 function kit(kind:MaterialKind,parent:THREE.Object3D,pos:V3=[0,0,0],variant:'window'|'door'|'standard'='standard'){
  const g=new THREE.Group();parent.add(g);g.position.set(...pos);const color=MATERIALS[kind].color;
  if(kind==='brick'){for(let i=0;i<4;i++)box([.25,.14,.19],[(i%2-.5)*.27,.08,Math.floor(i/2)*.21-.1],color,g);}
  else if(kind==='steel'){box([.62,.04,.32],[0,.03,0],color,g);box([.62,.14,.05],[0,.1,0],color,g);box([.62,.04,.32],[0,.19,0],color,g);}
  else if(kind==='timber'){for(let i=0;i<3;i++)box([.65,.12,.11],[0,.08,(i-1)*.14],color,g);box([.06,.14,.42],[-.18,.1,0],'#68654e',g);box([.06,.14,.42],[.18,.1,0],'#68654e',g);}
  else if(kind==='fittings'){
   const door=variant==='door',width=door?.62:.76,height=door?1.02:.7;
   box([width,.055,.1],[0,.03,0],color,g);box([width,.055,.1],[0,height,0],color,g);box([.055,height,.1],[-width/2, height/2,0],color,g);box([.055,height,.1],[width/2,height/2,0],color,g);box([.045,height-.12,.035],[0,height/2,.012],color,g);
   const pane=box([width-.13,height-.13,.025],[0,height/2,.025],'#79aeb0',g);pane.material=material('#79aeb0',true);
   if(door)box([.055,.055,.06],[width*.27,height*.52,-.07],'#d2ae62',g);
   for(const x of [-width*.35,width*.35])rod([x,.02,-.18],[x,height*.72,-.05],.035,'#756b59',g);
  }
  else {box([.58,kind==='concrete'?.22:.1,.38],[0,.12,0],color,g);box([.1,.02,.38],[0,.24,0],kind==='concrete'?'#55736a':'#bec5ac',g);}
  return g;
 }
 // Continuous picking aisle, separated from the stock footprints.
 box([5,.035,18],[-13,.1,0],'#9e967e');
 box([3.2,.035,19],[-9.5,.12,0],'#7e877a');
 textLabel('材 料 区  ·  取 料 通 道',5,[-12,1.75,-9.2],scene,'#3e6257');
 const stockMeshes=new Map<MaterialKind,THREE.Group[]>();
 for(const kind of Object.keys(MATERIALS) as MaterialKind[]){
  const p=MATERIALS[kind].pos;

  const items:THREE.Group[]=[];
  const required=sim.tasks.filter(t=>t.material===kind).flatMap(t=>Array.from({length:t.amount},()=>t.label.includes('门框')?'door' as const:t.label.includes('窗')?'window' as const:'standard' as const)).reverse();
  const surplus=sim.initialStock[kind]-required.length;const variants=[...Array.from({length:surplus},()=>kind==='fittings'?'window' as const:'standard' as const),...required];
  for(let n=0;n<sim.initialStock[kind];n++){
   if(kind==='fittings'){const col=n%3,row=Math.floor(n/3);items.push(kit(kind,scene,[p[0]+(col-1)*.92,.28,p[2]+(row-2)*.38],variants[n]));}
   else {const col=n%4,row=Math.floor(n/4)%4,layer=Math.floor(n/16);items.push(kit(kind,scene,[p[0]+(col-1.5)*.72,.28+layer*.33,p[2]+(row-1.5)*.45],variants[n]));}
  }
  stockMeshes.set(kind,items);textLabel(`${MATERIALS[kind].name}  需${required.length} · 备${sim.initialStock[kind]}`,2.75,[p[0],.52,p[2]-1.15],scene,'#46665b');
 }
 const deliveryCart=new THREE.Group();scene.add(deliveryCart);
 box([.9,.12,1.05],[0,.4,0],'#d4a143',deliveryCart);for(const x of [-.46,.46]){box([.06,.25,1.1],[x,.52,0],'#d4a143',deliveryCart);rod([x,.5,-.55],[x,.85,-1.05],.055,'#54655b',deliveryCart);}
 const wheelGeometry=new THREE.CylinderGeometry(.18,.18,.12,12);geometries.push(wheelGeometry);const cartWheels:THREE.Mesh[]=[];
 for(const x of [-.48,.48])for(const z of [-.35,.35]){const wheel=new THREE.Mesh(wheelGeometry,material('#354a3e'));wheel.rotation.z=Math.PI/2;wheel.position.set(x,.23,z);deliveryCart.add(wheel);cartWheels.push(wheel);}
 const cargoGroups=new Map<MaterialKind,THREE.Group[]>();
 for(const kind of Object.keys(MATERIALS) as MaterialKind[]){const units=[];for(let n=0;n<3;n++)units.push(kit(kind,deliveryCart,[0,.51+n*.27,0]));cargoGroups.set(kind,units);}
 // Stationary mixer: deliveries arrive at its marked ground receiving bay.
 const mixer=new THREE.Group();scene.add(mixer);box([.65,.1,.8],[0,.3,0],'#b6a06b',mixer);for(const x of [-.38,.38]){const wheel=new THREE.Mesh(wheelGeometry,material('#354a3e'));wheel.rotation.z=Math.PI/2;wheel.position.set(x,.2,0);mixer.add(wheel);rod([x,.25,0],[x,.8,0],.06,'#6b7b60',mixer);}
 const drum=new THREE.Group();drum.position.set(0,.85,0);drum.rotation.z=.35;mixer.add(drum);
 const drumGeometry=new THREE.CylinderGeometry(.3,.4,.6,12,1,true);geometries.push(drumGeometry);const drumMesh=new THREE.Mesh(drumGeometry,material('#d2a139'));drumMesh.castShadow=true;drum.add(drumMesh);for(const x of [-.3,.3])box([.04,.6,.04],[x,0,0],'#e7c268',drum);
 rod([-.25,.55,-.3],[-.25,.85,-.85],.06,'#536953',mixer);rod([.25,.55,-.3],[.25,.85,-.85],.06,'#536953',mixer);
 const stagedLoads=new Map<string,THREE.Group[]>();
 for(const t of sim.tasks){const units=[];for(let n=0;n<t.amount;n++)units.push(kit(t.material,scene,[0,0,0],t.label.includes('门框')?'door':t.label.includes('窗')?'window':'standard'));stagedLoads.set(t.id,units);}
 // Render the very same solids used for path planning and swept collision tests.
 const scaffold=new THREE.Group();scene.add(scaffold);
 for(const part of siteSolids){
  if(part.color==='invisible')continue;
  const temporary=/walk-|scaffold-|stair-|receiving-/.test(part.id);
  box(part.size,part.pos,part.color,temporary?scaffold:scene);
 }
 for(let i=0;i<5;i++){const z=-8+i*1.2;box([.48,.015,.65],[14.25,.81,z],'#497a82');box([.05,.04,.32],[14.12,.84,z],'#d3c295');box([.28,.035,.045],[14.3,.84,z-.15],'#d3c295');}
 textLabel('协 作 准 备 台',3.1,[14.1,1.4,-8.6]);
 textLabel('休 息 区',2.15,[10.75,2.26,-6.56]);
 box([1,1.8,.08],[-2.2,1.03,8.06],'#bcc5b0');box([1.25,.9,.09],[-3.7,1.5,8.05],'#96bdb4');textLabel('01 / 工地办公室',3.4,[-3,2.08,7.98]);
 const coneGeo=new THREE.CylinderGeometry(.07,.24,.6,4);geometries.push(coneGeo);
 for(const part of siteSolids.filter(p=>p.id.startsWith('cone-'))){
  const [x,,z]=part.pos;box([.48,.06,.48],[x,.17,z],'#5b5d4e');const cone=new THREE.Mesh(coneGeo,material('#d58943'));cone.position.set(x,.5,z);scene.add(cone);
 }
 for(const p of [PAD,GROUND_BAY])box([1.5,.025,1.5],[p[0],.1,p[2]],'#c5a169');
 textLabel('地面起吊区',2.2,[PAD[0],.7,PAD[2]-.95]);
 textLabel('地面收料区',2.2,[GROUND_BAY[0],.7,GROUND_BAY[2]-.95]);
 LANDINGS.forEach((p,i)=>textLabel(i?'屋面收料平台':'二楼收料平台',2.3,[p[0],p[1]-.45,p[2]-1.04],scaffold));
 // Tower stays fixed; the jib, trolley, cable and real delivery load move together.
 const crane=new THREE.Group();scene.add(crane);const cx=-6.6,cz=5.3;
 for(const dx of [-.4,.4])for(const dz of [-.4,.4])rod([cx+dx,.4,cz+dz],[cx+dx,11.8,cz+dz],.1,'#dba937',crane);
 for(let h=.5;h<11.5;h+=1){for(const z of [-.4,.4]){rod([cx-.4,h,cz+z],[cx+.4,h+1,cz+z],.065,'#d5a330',crane);rod([cx-.4,h,cz+z],[cx+.4,h,cz+z],.065,'#d5a330',crane);}for(const x of [-.4,.4])rod([cx+x,h,cz-.4],[cx+x,h+1,cz+.4],.065,'#d5a330',crane);}
 const jib=new THREE.Group();jib.position.set(cx,11.8,cz);scene.add(jib);
 for(const z of [-.35,.35]){rod([-3,0,z],[17,0,z],.1,'#e1ac32',jib);rod([-3,.6,z],[17,.6,z],.1,'#e1ac32',jib);for(let x=-3;x<17;x++)rod([x,0,z],[x+1,.6,z],.055,'#e1ac32',jib);}
 box([1.4,.85,.9],[-.8,-.7,0],'#e0b34c',jib);box([.8,.5,.92],[-.8,-.6,0],'#789da0',jib);box([1.9,.7,1.1],[-2.5,-.6,0],'#788173',jib);
 const trolley=box([.5,.25,.95],[4,-.05,0],'#b68b2f',jib);const cable=box([.035,1,.035],[0,0,0],'#394a43');const hook=box([.24,.3,.24],[0,0,0],'#d6a63c');
 const slingA=rod([0,0,0],[0,1,0],.025,'#4b6155'),slingB=rod([0,0,0],[0,1,0],.025,'#4b6155');
 const liftLoad=new THREE.Group();scene.add(liftLoad);const liftKits=new Map<MaterialKind,THREE.Group[]>();
 for(const kind of Object.keys(MATERIALS) as MaterialKind[]){const units=[];for(let n=0;n<3;n++)units.push(kit(kind,liftLoad,[0,n*.26,0]));liftKits.set(kind,units);}
 box([.66,.12,.4],[CRANE_CONTROL[0],.83,CRANE_CONTROL[2]+.8],'#c9b879');for(const x of [-.15,.15])rod([CRANE_CONTROL[0]+x,.83,CRANE_CONTROL[2]+.7],[CRANE_CONTROL[0]+x,1.02,CRANE_CONTROL[2]+.65],.04,'#344d3f');textLabel('吊装控制',1.4,[CRANE_CONTROL[0],1.3,CRANE_CONTROL[2]+.8]);
 const buildingMeshes=new Map<string,THREE.Mesh>();
 for(const task of sim.tasks)for(const p of task.parts){const m=box(p.size,p.pos,p.color);if(p.glass)m.material=material(p.color,true);if(p.rotation)m.rotation.set(...p.rotation);m.visible=false;buildingMeshes.set(p.id,m);}
 const workerModels=sim.workers.map(w=>{
  const g=new THREE.Group();scene.add(g);box([.43,.46,.28],[0,.67,0],w.color,g);box([.44,.055,.3],[0,.64,0],'#e8d894',g);box([.3,.31,.29],[0,1.07,0],'#d7af7f',g);box([.39,.13,.36],[0,1.28,0],'#f1c151',g);box([.46,.04,.46],[0,1.2,.04],'#e3ab35',g);box([.05,.045,.025],[-.075,1.1,.15],'#354b41',g);box([.05,.045,.025],[.075,1.1,.15],'#354b41',g);
  const limbs:THREE.Group[]=[];for(const [x,y] of [[-.27,.85],[.27,.85],[-.12,.45],[.12,.45]]){const limb=new THREE.Group();limb.position.set(x,y,0);g.add(limb);const leg=y<.5;box([leg?.14:.12,leg?.35:.3,.15],[0,leg?-.17:-.13,0],leg?'#3a524e':w.color,limb);box([leg?.17:.13,.1,leg?.24:.13],[0,leg?-.37:-.31,leg?.035:0],leg?'#293e37':'#d7af7f',limb);limbs.push(limb);}
  const parcel=box([.54,.27,.3],[0,.73,.33],'#b88a55',g);const hammer=new THREE.Group();limbs[1].add(hammer);box([.045,.32,.045],[0,-.4,.07],'#90613b',hammer);box([.22,.08,.09],[0,-.55,.07],'#7d8b81',hammer);
  const ringGeo=new THREE.RingGeometry(.36,.41,24);geometries.push(ringGeo);const ring=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:w.color,transparent:true,opacity:.6,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.025;g.add(ring);
  const trowel=new THREE.Group();limbs[1].add(trowel);box([.04,.26,.04],[0,-.37,.04],'#8d6b45',trowel);box([.23,.04,.26],[0,-.52,.09],'#9ca99b',trowel);
  const drill=new THREE.Group();limbs[1].add(drill);box([.17,.14,.3],[0,-.35,.1],'#3e756b',drill);box([.045,.045,.22],[0,-.35,.35],'#bcc5b1',drill);
  return {g,limbs,parcel,hammer,trowel,drill};
 });
 // Batch immutable voxel boxes. Moving machinery, stock and workers stay independent.
 function instanceStatic(parent:THREE.Object3D,excluded=new Set<THREE.Object3D>()){
  const groups=new Map<THREE.Material,THREE.Mesh[]>();
  for(const child of [...parent.children])if(child instanceof THREE.Mesh&&child.geometry===cube&&!Array.isArray(child.material)&&!excluded.has(child)){
   const list=groups.get(child.material)??[];list.push(child);groups.set(child.material,list);
  }
  for(const [mat,meshes] of groups){if(meshes.length<2)continue;const batch=new THREE.InstancedMesh(cube,mat,meshes.length);batch.castShadow=true;batch.receiveShadow=true;
   meshes.forEach((mesh,i)=>{mesh.updateMatrix();batch.setMatrixAt(i,mesh.matrix);parent.remove(mesh);});batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();parent.add(batch);
  }
 }
 instanceStatic(scene,new Set<THREE.Object3D>([...buildingMeshes.values(),cable,hook,slingA,slingB]));
 instanceStatic(scaffold);instanceStatic(crane);
 let acc=0,last=performance.now(),ui=0,raf=0,disposed=false;const resize=()=>{const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h);const half=window.innerWidth<650?23:18.8;camera.left=-half*w/h;camera.right=half*w/h;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(container);resize();
 function frame(now:number){if(disposed)return;const delta=Math.min((now-last)/1000,.1);last=now;if(!document.hidden&&!sim.paused){acc+=delta*sim.speed*1.6;while(acc>=1/30){sim.advance(1/30);acc-=1/30;}}else acc=0;
  for(const t of sim.tasks){const progress=t.progress/t.work;for(let i=0;i<t.parts.length;i++){const p=t.parts[i],m=buildingMeshes.get(p.id)!;const f=Math.max(0,Math.min(1,progress*t.parts.length-i));m.visible=f>0;if(f>0){m.scale.y=p.size[1]*f;m.position.y=p.pos[1]-p.size[1]*(1-f)/2;}}}
  scaffold.visible=!sim.complete||sim.workers.some(w=>w.pos[1]>.05);
  for(const [kind,meshes] of stockMeshes)meshes.forEach((m,n)=>{m.visible=n<sim.stock[kind];});
  const courier=sim.workers[0],carried=sim.task(courier);
  deliveryCart.position.set(...sim.cartPos);deliveryCart.rotation.y=sim.cartHeading;
  cartWheels.forEach(w=>{w.rotation.x=courier.path.length?courier.phase*9:w.rotation.x;});
  for(const [kind,units] of cargoGroups)units.forEach((m,n)=>{m.visible=carried?.supply==='cart'&&courier.state!=='unloading'&&carried.material===kind&&n<carried.amount;});
  for(const t of sim.tasks){const units=stagedLoads.get(t.id)!;const atPad=t.supply==='atLift';const onSite=['atMixer','mixing','ready','handcarry','landed','transfer'].includes(t.supply)||(courier.task===t.id&&courier.state==='unloading');const p=sim.cargoPoint(t);const remaining=t.amount-t.used;units.forEach((m,n)=>{const f=Math.max(0,Math.min(1,remaining-n));m.visible=(atPad||onSite)&&f>0;m.position.set(p[0],p[1]+n*.27,p[2]);m.scale.set(1,f,1);});}
  mixer.position.set(...sim.mixerPos);drum.rotation.y=sim.mixerAngle;
  const c=sim.crane,ct=sim.tasks.find(t=>t.id===c.task);jib.rotation.y=-Math.atan2(c.pos[2]-cz,c.pos[0]-cx);trolley.position.x=Math.hypot(c.pos[0]-cx,c.pos[2]-cz);cable.position.set(c.pos[0],(11.8+c.pos[1])/2,c.pos[2]);cable.scale.y=Math.max(.1,11.8-c.pos[1]);hook.position.set(...c.pos);liftLoad.position.set(c.pos[0],c.pos[1]-1.4,c.pos[2]);liftLoad.visible=c.load;
  for(const [kind,units] of liftKits)units.forEach((m,n)=>{m.visible=c.load&&ct?.material===kind&&n<ct.amount;});
  for(const [line,dx] of [[slingA,-.3],[slingB,.3]] as const){line.visible=c.load;line.position.set(c.pos[0]+dx*.5,c.pos[1]-.7,c.pos[2]);line.scale.y=1.43;line.rotation.z=dx<0?-.21:.21;}
  sim.workers.forEach((w,i)=>{
   const m=workerModels[i];m.g.position.set(...w.pos);const moving=w.path.length>0,working=w.state==='working'||w.state==='preparing';const task=sim.task(w);
   if(w.state==='working'&&task)w.heading=Math.atan2(task.parts[0].pos[0]-w.pos[0],task.parts[0].pos[2]-w.pos[2]);if(w.state==='operating')w.heading=0;
   m.g.rotation.y=w.heading;const stride=moving?Math.sin(w.phase*11)*.55:0;m.limbs[0].rotation.x=stride;m.limbs[1].rotation.x=-stride;m.limbs[2].rotation.x=-stride;m.limbs[3].rotation.x=stride;
   m.parcel.visible=false;m.hammer.visible=working&&i===3;m.trowel.visible=working&&i===2;m.drill.visible=working&&i===4;
   if(i===0&&['material','carrying','loading','unloading'].includes(w.state)){m.limbs[0].rotation.x=m.limbs[1].rotation.x=-1.15;if(w.state==='loading'||w.state==='unloading')m.limbs[1].rotation.x=-1+Math.sin(w.phase*5)*.3;}
   if(w.state==='operating'){m.limbs[0].rotation.x=-.9;m.limbs[1].rotation.x=-.9+Math.sin(w.phase*3)*.12;}
   if(w.state==='handcarry'||w.state==='unloadTrip'){m.limbs[0].rotation.x=m.limbs[1].rotation.x=-Math.PI;}
   if(w.state==='mixing')m.limbs[1].rotation.x=-1+Math.sin(w.phase*4)*.25;
   if(working){if(i===2)m.limbs[1].rotation.x=-1+Math.sin(w.phase*6)*.3;else if(i===3)m.limbs[1].rotation.x=-.7+Math.sin(w.phase*13)*.65;else m.limbs[1].rotation.x=-1.4+Math.sin(w.phase*25)*.035;}
   const resting=w.state==='resting'||(w.state==='finished'&&!moving);if(resting){m.g.rotation.y=Math.PI/2;}m.g.position.y+=moving?Math.abs(Math.sin(w.phase*11))*.025:0;
  });
  controls.update();renderer.render(scene,camera);ui+=delta;if(ui>.16){ui=0;onTick();}raf=requestAnimationFrame(frame);
 }
 raf=requestAnimationFrame(frame);
 return {resetView(){camera.position.set(31,30,-39);camera.zoom=1;controls.target.set(0,1.5,0);camera.updateProjectionMatrix();controls.update();},dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();controls.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh){if(o.geometry!==cube)o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose());}});geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();}};
}
