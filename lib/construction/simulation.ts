import {PAD,GROUND_BAY,MIXER,CONTROL,LANDINGS,STAIRS,STOCK_Z,RADIUS,CART_RADIUS,siteSolids,floorRoute,segmentClear,intersects,type Solid} from './layout.ts';
export type V3 = [number, number, number];
export type Part = { id: string; size: V3; pos: V3; color: string; rotation?: V3; glass?: boolean };
export type MaterialKind = 'concrete'|'steel'|'brick'|'timber'|'panel'|'fittings';
export type SupplyState = 'stock'|'collecting'|'cart'|'transfer'|'atLift'|'lifting'|'landed'|'atMixer'|'mixing'|'ready'|'handcarry'|'used';
export const MATERIALS:Record<MaterialKind,{name:string;color:string;pos:V3}>= {
 concrete:{name:'混凝土料',color:'#bbbba7',pos:[-13,0,STOCK_Z[0]]},
 steel:{name:'钢构件',color:'#8daca9',pos:[-13,0,STOCK_Z[1]]},
 brick:{name:'砌块',color:'#c88f69',pos:[-13,0,STOCK_Z[2]]},
 timber:{name:'木构件',color:'#b78d57',pos:[-13,0,STOCK_Z[3]]},
 panel:{name:'板材',color:'#597f8a',pos:[-13,0,STOCK_Z[4]]},
 fittings:{name:'整窗与门框',color:'#9abbb0',pos:[-13,0,STOCK_Z[5]]}
};
export const ROLES=['材料员','设备员','建筑工','建筑工','安装工'];
export const LIFT_PAD:V3=PAD;
export const CRANE_CONTROL:V3=CONTROL;
export type Task = { id: string; label: string; stage: number; parts: Part[]; work: number; progress: number; owner: number | null; driver:number|null; done: boolean; site: V3; material:MaterialKind; amount:number; used:number; supply:SupplyState; crew:number[]; needsLift:boolean; heavy:boolean; specialist:boolean; mixed:number; pickupTime?:number; pickupFrom?:V3; dropTime?:number; dropFrom?:V3; padSlot:number };
export type WorkerState = 'supporting'|'unloadTrip'|'idle'|'material'|'carrying'|'working'|'returning'|'waiting'|'finished'|'loading'|'unloading'|'toCart'|'toControl'|'operating'|'mixing'|'movingWork'|'waitingSupply'|'waitingPartner'|'fetching'|'pickupLoading'|'handcarry';
export type Worker = { id: number; buildingId: string; color: string; pos: V3; state: WorkerState; task: string|null; path: V3[]; heading: number; phase: number; completed: number; worked: number; timer:number; role:string };
export const STAGES = ['浇筑基础','首层框架','墙体与楼梯','铺设楼板','二层框架','二层墙体','搭建屋顶','收尾交付'];
export const COLORS = ['#df9c37','#5c97b4','#78996a','#c47558','#9c83ae'];
const WALL='#e4dfca', FRAME='#c9c9b8', WOOD='#aa7950', ROOF='#526f77';
export function blueprint(): Task[] {
 const tasks:Task[]=[]; let seq=0;
 function add(stage:number,label:string,parts:Omit<Part,'id'>[],site?:V3,work=5) {
   const id=`task-${++seq}`; const p=parts[0].pos;
  // Installation is intentionally brief; the scene's dominant activity is the
  // repeated movement of material from stock to the current building face.
  work=Math.min(work,2.4);
  tasks.push({id,label,stage,parts:parts.map((x,i)=>({...x,id:`${id}-${i}`})),work,progress:0,owner:null,driver:null,done:false,material:'timber',amount:1,used:0,supply:'stock',crew:[],needsLift:false,heavy:false,specialist:false,mixed:0,padSlot:0,site:site??[p[0]<0?-5.35:5.35,stage>=4?3.3:0,p[2]],});
 }
 const box=(size:V3,pos:V3,color=FRAME,rotation?:V3,glass=false)=>({size,pos,color,rotation,glass});
 for(let i=0;i<5;i++) add(0,`基础 · ${i+1} 区`,[box([1.8,.3,7],[-3.6+i*1.8,.15,0],'#c0bbae')],[-3.6+i*1.8,0,-4.4],7);
 for(const [stage,y] of [[1,.3],[4,3.3]]) {
  for(const x of [-4,0,4]) for(const z of [-3,3]) add(stage,'安装承重柱',[box([.24,2.8,.24],[x,y+1.4,z])], [x,y>.5?3.3:0,z<0?-4.35:4.35],5);
  for(const z of [-3,3]) for(const x of [-2,2]) add(stage,'连接横梁',[box([4.1,.23,.26],[x,y+2.68,z])],[x,y>.5?3.3:0,z<0?-4.35:4.35],4);
  for(const x of [-4,4]) add(stage,'连接侧梁',[box([.26,.23,6],[x,y+2.68,0])],[x<0?-5.35:5.35,y>.5?3.3:0,0],4);
 }
 for(const [stage,y] of [[2,.3],[5,3.3]]) {
  // Four window modules on the long facades, with real openings.
  for(const z of [-3,3]) for(const x of [-2,2]) {
   const parts=[box([3.72,.8,.18],[x,y+.4,z],WALL),box([3.72,.6,.18],[x,y+2.5,z],WALL),box([1.05,1.4,.18],[x-1.335,y+1.5,z],WALL),box([1.05,1.4,.18],[x+1.335,y+1.5,z],WALL)];
   add(stage,'砌筑窗边墙体',parts,[x,y>.5?3.3:0,z<0?-4.35:4.35],6);
   add(stage,'安装窗框与玻璃',[box([1.65,.08,.24],[x,y+.84,z],'#50766b'),box([1.65,.08,.24],[x,y+2.16,z],'#50766b'),box([.08,1.4,.24],[x-.8,y+1.5,z],'#50766b'),box([.08,1.4,.24],[x+.8,y+1.5,z],'#50766b'),box([.06,1.3,.24],[x,y+1.5,z],'#50766b'),box([1.5,1.24,.06],[x,y+1.5,z],'#88b8b4',undefined,true)],[x,y>.5?3.3:0,z<0?-4.35:4.35],3);
  }
  for(const x of [-4,4]) {
   add(stage,'砌筑侧墙',[box([.18,2.8,2.25],[x,y+1.4,-1.875],WALL),box([.18,2.8,2.25],[x,y+1.4,1.875],WALL),box([.18,.8,1.5],[x,y+.4,0],WALL),box([.18,.6,1.5],[x,y+2.5,0],WALL)],[x<0?-5.35:5.35,y>.5?3.3:0,0],6);
   add(stage,'安装侧窗',[box([.25,1.4,.08],[x,y+1.5,-.75],'#50766b'),box([.25,1.4,.08],[x,y+1.5,.75],'#50766b'),box([.25,.08,1.5],[x,y+.8,0],'#50766b'),box([.25,.08,1.5],[x,y+2.2,0],'#50766b'),box([.06,1.32,1.4],[x,y+1.5,0],'#88b8b4',undefined,true)],[x<0?-5.35:5.35,y>.5?3.3:0,0],3);
  }
  // Central support column on north remains; entrance shifted slightly east to avoid the south column.
 }
 add(2,'搭建室内楼梯',Array.from({length:15},(_,i)=>box([1,.2,.32],[2.7,.4+i*.2,-2.4+i*.32],WOOD)),[5.35,0,2],8);
 // Temporary access scaffold is present as site infrastructure; stair task forms permanent interior stairs.
 for(let i=0;i<5;i++) {
  const x=-3.2+i*1.6; const parts = i===4?[box([1.6,.2,.8],[x,3.2,-2.6]),box([1.6,.2,.4],[x,3.2,2.8])]:[box([1.6,.2,6],[x,3.2,0])];
  add(3,`铺设楼板 · ${i+1}`,parts,[x,3.3,-4.35],6);
 }
 for(let i=0;i<5;i++) {
  const x=-3.6+i*1.8;
  add(6,'搭建屋架',[box([.12,.14,3.6],[x,6.78,-1.55],WOOD,[-.37,0,0]),box([.12,.14,3.6],[x,6.78,1.55],WOOD,[.37,0,0]),box([.14,.14,6.3],[x,6.17,0],WOOD)],[x,6.2,-4.35],5);
 }
 for(const side of [-1,1]) for(let i=0;i<5;i++) add(6,'铺设金属屋面',[box([1.8,.13,3.64],[-3.6+i*1.8,6.83,side*1.62],ROOF,[side*.37,0,0])],[-3.6+i*1.8,6.2,side*4.35],5);
 add(7,'安装屋脊',[box([8.9,.16,.2],[0,7.48,0],'#314f58')],[0,6.2,-4.35],4);
 add(7,'安装入口台阶',[box([1.6,.15,.9],[1,.075,-3.55],'#bcb7a6'),box([1.6,.3,.45],[1,.15,-3.35],'#bcb7a6')],[1,0,-4.35],4);
 add(7,'安装入口门框',[box([.12,2.1,.28],[.3,1.35,-3.05],'#476e64'),box([.12,2.1,.28],[1.7,1.35,-3.05],'#476e64'),box([1.5,.12,.28],[1,2.4,-3.05],'#476e64'),box([1.25,2,.07],[1,1.3,-3.12],'#638e86',undefined,true)],[1,0,-4.35],4);
 add(7,'安装入口雨棚',[box([2,.12,1.2],[1,2.7,-3.5],ROOF)],[2,0,-4.35],4);
 add(7,'整理场地',[box([1.5,.32,.5],[-3,.16,-4.05],'#506e5a')],[-3,0,-4.6],4);
 // Right south bay: door at x=1, window at x=2.85.
 const wallTask=tasks.find(t=>t.stage===2&&t.label==='砌筑窗边墙体'&&t.site[0]===2&&t.site[2]<0)!;
 wallTask.parts=[
  box([.16,2.8,.18],[.17,1.7,-3],WALL),
  box([.23,2.8,.18],[1.82,1.7,-3],WALL),
  box([.28,2.8,.18],[3.78,1.7,-3],WALL),
  box([1.75,.8,.18],[2.85,.7,-3],WALL),
  box([3.72,.6,.18],[2,2.8,-3],WALL)
 ].map((p,i)=>({...p,id:wallTask.id+'-'+i}));
 const windowTask=tasks.find(t=>t.stage===2&&t.label==='安装窗框与玻璃'&&t.site[0]===2&&t.site[2]<0)!;
 windowTask.parts.forEach(p=>p.pos[0]+=.85);
 for(const t of tasks){
  t.specialist=/窗框|侧窗|入口门框|雨棚|屋脊|整理/.test(t.label);
  t.material=t.stage===0?'concrete':t.label.includes('墙')?'brick':t.label.includes('窗')||t.label.includes('门框')?'fittings':t.label.includes('楼梯')||t.label==='搭建屋架'?'timber':t.stage===1||t.stage===4?'steel':t.stage===3||t.stage===6||t.label.includes('屋脊')||t.label.includes('雨棚')?'panel':'concrete';
  t.amount=t.material==='brick'?3:t.stage===0?3:t.label.includes('楼梯')?3:t.label==='搭建屋架'?2:1;
  t.heavy=/横梁|侧梁|楼板|屋架|金属屋面/.test(t.label);
  // Ground-floor work is delivered by cart and hand; the crane starts at level two.
  t.needsLift=t.site[1]>0;
 }
 return tasks.sort((a,b)=>a.stage-b.stage);
}
export type CraneState={task:string|null;phase:number;elapsed:number;pos:V3;from:V3;load:boolean;lifts:number};
export class Simulation {
 tasks=blueprint(); workers:Worker[]=[]; time=0; paused=false; speed=1; complete=false; seed=7281;
 events:string[]=['施工流程：运输材料 → 到建筑边施工'];
 stock={} as Record<MaterialKind,number>;initialStock={} as Record<MaterialKind,number>;
 cartPos:V3=[-9.5,0,-9];cartHeading=0;cart2Pos:V3=[-16.1,0,-5.7];cart2Heading=0;mixerPos:V3=[...MIXER];mixerAngle=0;
 travelOwner:number|null=null; cartTurning=false;
 private planned=new Set<number>();private stairOwner:number|null=null;
 private blockedSince=new Map<number,number>();
 private yieldTargets=new Map<number,V3>();
 private workSlots=new Map<string,number>();
 private nextBuilder=2;
 routeError='';private routeRetry=new Map<number,number>();private delivered=new Set<string>();
 crane:CraneState={task:null,phase:0,elapsed:0,pos:[PAD[0],10,PAD[2]],from:[PAD[0],10,PAD[2]],load:false,lifts:0};
 constructor(){
  for(const kind of Object.keys(MATERIALS) as MaterialKind[]){const needed=this.tasks.filter(t=>t.material===kind).reduce((n,t)=>n+t.amount,0);this.stock[kind]=needed+Math.max(1,Math.ceil(needed*.1));this.initialStock[kind]=this.stock[kind];}
  this.workers=COLORS.map((color,i)=>({id:i,role:i<2?'运输工':'建筑工',buildingId:'house-001',color,pos:i===0?[-9.5,0,-10.1]:i===1?[-16.1,0,-6.8]:[13.5,0,-8+i*1.2],state:'idle',task:null,path:[],heading:0,phase:i,completed:0,worked:0,timer:0}));
 }
 random(){this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296;}
 get stage(){return this.tasks.find(t=>!t.done)?.stage??8;}
 get progress(){return this.tasks.reduce((s,t)=>s+t.progress,0)/this.tasks.reduce((s,t)=>s+t.work,0);}
 log(s:string){this.events.unshift(s);this.events=this.events.slice(0,4);}
 task(w:Worker){return this.tasks.find(t=>t.id===w.task);}
 cartOf(id:number):V3{return id===1?this.cart2Pos:this.cartPos;}
 cartHeadingOf(id:number){return id===1?this.cart2Heading:this.cartHeading;}
 setCart(id:number,pos:V3,heading?:number){if(id===1){this.cart2Pos=pos;if(heading!==undefined)this.cart2Heading=heading;}else{this.cartPos=pos;if(heading!==undefined)this.cartHeading=heading;}}
 groundDropPoint(t:Task):V3{const lanes=t.driver===1?[-2,-5,-8]:[2,5,8];return [lanes[t.padSlot]??lanes[0],0,-8.7];}
 // Vehicles stop on the unobstructed outer service road. Pallets are set down
 // one metre inward during the unloading animation; carts never have to enter
 // the narrow pedestrian pickup pockets.
 cartDropPoint(t:Task):V3{const lanes=t.driver===1?[-2,-5,-8]:[2,5,8];return [lanes[t.padSlot]??lanes[0],0,-10.5];}
 builderReturnPoint(_t:Task,w:Worker):V3{return [10,0,(w.id-3)*2];}
 get inventory(){return (Object.keys(MATERIALS) as MaterialKind[]).map(kind=>{
  let transit=0,site=0,installed=0;
  for(const t of this.tasks.filter(t=>t.material===kind)){installed+=t.used;const remaining=t.amount-t.used;if(['cart','transfer','lifting','handcarry'].includes(t.supply))transit+=remaining;else if(['atLift','atMixer','mixing','ready','landed'].includes(t.supply))site+=remaining;}
  const required=this.tasks.filter(t=>t.material===kind).reduce((sum,t)=>sum+t.amount,0);
  return {kind,name:MATERIALS[kind].name,initial:this.initialStock[kind],required,surplus:this.initialStock[kind]-required,stock:this.stock[kind],transit,site,installed};
 });}
 supplyPoint(t:Task):V3{
  if(t.supply==='handcarry')return [...this.workers[t.owner!].pos];
  if(t.needsLift){const p:V3=[...((t.site[1]>4)?LANDINGS[1]:LANDINGS[0])];p[0]+=(t.padSlot-1)*.8;return p;}
  if(t.driver!==null||this.delivered.has(t.id))return this.groundDropPoint(t);
  return [...GROUND_BAY];
 }
 workSupplyPoint(t:Task):V3{if(t.label==='整理场地')return [-4.5,0,-4.5];if(t.label==='安装入口台阶')return [-1.2,0,-4.5];const p:V3=[...t.site];if(Math.abs(p[2])>3.8)p[2]=Math.sign(p[2])*3.8;else p[0]=Math.sign(p[0])*4.72;return p;}
 padPoint(_t:Task):V3{return [...PAD];}
 cargoPoint(t:Task):V3{
  const arc=(a:V3,b:V3,f:number):V3=>{f=Math.max(0,Math.min(1,f));const high=Math.max(a[1],b[1])+.35;if(f<.25)return [a[0],a[1]+(high-a[1])*f*4,a[2]];if(f<.65){const u=(f-.25)/.4;return [a[0]+(b[0]-a[0])*u,high,a[2]+(b[2]-a[2])*u];}return [b[0],high+(b[1]-high)*(f-.65)/.35,b[2]];};
  if(t.pickupTime!==undefined&&t.pickupFrom){const w=this.workers[t.owner!];return arc(t.pickupFrom,[w.pos[0],w.pos[1]+1.45,w.pos[2]],this.time-t.pickupTime);}
  if(t.dropTime!==undefined&&t.dropFrom){const p=this.workSupplyPoint(t);return arc(t.dropFrom,[p[0],p[1]+.12,p[2]],this.time-t.dropTime);}
  const courier=this.workers[t.driver??0],cart=this.cartOf(courier.id),hand:V3=[courier.pos[0],courier.pos[1]+1.45,courier.pos[2]];
  if(courier.task===t.id&&courier.state==='unloading'){
   const destination=t.needsLift?PAD:this.groundDropPoint(t);
   const a:V3=[cart[0],.51,cart[2]],b:V3=[destination[0],.12,destination[2]];
   const f=Math.max(0,Math.min(1,1-courier.timer/.8));return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f+Math.sin(f*Math.PI)*.8,a[2]+(b[2]-a[2])*f];
  }
  if(t.supply==='transfer')return hand;
  const p=t.supply==='atLift'?this.padPoint(t):this.supplyPoint(t);return [p[0],p[1]+(t.supply==='handcarry'?1.45:.12),p[2]];
 }
 pickupPoint(t:Task,w:Worker):V3{const p=this.supplyPoint(t);p[0]-=(t.crew.indexOf(w.id)-(t.crew.length-1)/2)*.8;p[2]+=.95;return p;}
 ready(t:Task){return t.stage===this.stage&&!(/横梁|侧梁/.test(t.label)&&this.tasks.some(a=>a.stage===t.stage&&a.label==='安装承重柱'&&!a.done))&&!(t.label.includes('窗')&&!t.label.includes('墙')&&this.tasks.some(a=>a.stage===t.stage&&a.label.includes('墙')&&!a.done&&a.site.every((v,i)=>v===t.site[i])))&&!(t.label==='铺设金属屋面'&&this.tasks.some(a=>a.label==='搭建屋架'&&!a.done));}
 // Physical routes, not post-render displacement. The cart cannot enter stairs.
 route(from:V3,to:V3,radius=RADIUS,extra:Solid[]=[]):V3[]{
  const floor=(a:V3,b:V3)=>floorRoute(a,b,radius,extra);
  if(Math.abs(from[1]-to[1])<.05)return floor(from,to);
  if(radius===CART_RADIUS)throw Error('Cart routes must remain on ground');
  const index=(h:number)=>h<1?0:h<4?6:12;
  const i=index(from[1]),j=index(to[1]),dir=i<j?1:-1;
  const points=floor(from,STAIRS[i]);
  for(let n=i+dir;n!==j+dir;n+=dir)points.push([...STAIRS[n]]);
  points.push(...floor(STAIRS[j],to));return points;
 }
 go(w:Worker,to:V3,state:WorkerState){w.path=[[...to]];w.state=state;this.planned.delete(w.id);}
 private pushing(w:Worker){return w.id<2&&['material','carrying'].includes(w.state);}
 // Hand-carried parcels and the two personal carts stay inside the worker's
 // normal clearance envelope. Only the bulk unload trip needs tall-load
 // clearance; treating worker 0 as if they carried the whole batch used to
 // create a false 2.65 m obstacle at the stair entrance and deadlock the crew.
 carryingLoad(w:Worker){return w.state==='unloadTrip';}
 private dynamicObstacles(w:Worker):Solid[]{
  const result:Solid[]=this.workers.filter(a=>a.id!==w.id).map(a=>({id:'worker-'+a.id,size:[.68,1.35,.68],pos:[a.pos[0],a.pos[1]+.7,a.pos[2]],color:'invisible'}));
  for(const id of [0,1])if(id!==w.id||!this.pushing(w)){const p=this.cartOf(id);result.push({id:'cart-clearance-'+id,size:[1.1,1.25,1.2],pos:[p[0],.7,p[2]],color:'invisible',rotation:this.cartHeadingOf(id)});}
  // Ready pallets are destinations, not navigation blockers: the assigned
  // builder must be able to approach and pick one up. Separate unloading slots
  // prevent those pallets from overlapping one another.
  for(const t of this.tasks.filter(t=>['atLift','atMixer','mixing','landed'].includes(t.supply))){const p=this.cargoPoint(t),height=t.material==='fittings'?(t.label.includes('门框')?1.06:.74):.27*t.amount;result.push({id:'cargo-'+t.id,size:[.78,height,.44],pos:[p[0],p[1]+height/2,p[2]],color:'invisible'});}
  return result;
 }
 private yieldWay(w:Worker){
  const since=this.blockedSince.get(w.id);if(since===undefined){this.blockedSince.set(w.id,this.time);return false;}
  if(this.time-since<.8||this.pushing(w)||!w.path.length)return false;
  const partner=this.workers.find(a=>a.id!==w.id&&a.task===w.task&&w.task&&[w.state,'waitingPartner'].includes(a.state)&&['handcarry','fetching'].includes(w.state)&&Math.hypot(...a.pos.map((v,i)=>v-w.pos[i]))<1.65);
  if(partner){
   const a=w.path.at(-1)!,b=partner.path.at(-1)??partner.pos,distance=(p:V3,q:V3)=>Math.hypot(...p.map((v,i)=>v-q[i]));
   if((!partner.path.length&&distance(partner.pos,a)<1.1)||distance(w.pos,b)+distance(partner.pos,a)+.1<distance(w.pos,a)+distance(partner.pos,b)){
    const key=w.task+'/',first=this.workSlots.get(key+w.id)??(w.id===2?-.48:.48),second=this.workSlots.get(key+partner.id)??(partner.id===2?-.48:.48);
    this.workSlots.set(key+w.id,second);this.workSlots.set(key+partner.id,first);const state=w.state;this.go(w,b,state);this.go(partner,a,state);return true;
   }
  }
  const other=this.workers.find(a=>(a.id<w.id||a.id===this.stairOwner)&&a.id!==w.id&&a.path.length&&Math.abs(a.pos[1]-w.pos[1])<.05&&Math.hypot(a.pos[0]-w.pos[0],a.pos[2]-w.pos[2])<2);
  if(!other)return false;
  const extra=this.dynamicObstacles(w),target=w.path[w.path.length-1],radius=this.carryingLoad(w)?.43:RADIUS,height=radius>.4?2.65:1.4;
  for(const [dx,dz] of [[0,1.1],[0,-1.1],[1.1,0],[-1.1,0]]){
   const q:V3=[w.pos[0]+dx,w.pos[1],w.pos[2]+dz];
   if(!segmentClear(w.pos,q,radius,height,true,extra))continue;
   if(Math.hypot(q[0]-other.pos[0],q[2]-other.pos[2])<Math.hypot(w.pos[0]-other.pos[0],w.pos[2]-other.pos[2])+.2)continue;
   this.yieldTargets.set(w.id,target);w.path=[q];this.planned.add(w.id);this.blockedSince.delete(w.id);return true;
  }
  return false;
 }
 move(w:Worker,dt:number){
  if(this.travelOwner!==null&&this.travelOwner!==w.id)return;
  const pushing=this.pushing(w),radius=pushing?CART_RADIUS:RADIUS;
  if(!this.planned.has(w.id)){
   if(this.time<(this.routeRetry.get(w.id)??0))return;
   const target=w.path[w.path.length-1],from=pushing?this.cartOf(w.id):w.pos;
   const extra=this.dynamicObstacles(w);
   try{w.path=this.route(from,target,radius,extra);this.routeError='';}catch(error){this.routeError=String(error);this.travelOwner=null;this.routeRetry.set(w.id,this.time+.6);return;}
   this.planned.add(w.id);
   this.travelOwner=w.id;
  }
  const inStair=(p:V3)=>p[0]>6.65&&p[0]<8.95&&p[2]>-5.25&&p[2]<1.3;
  if(this.stairOwner!==null&&!inStair(this.workers[this.stairOwner].pos))this.stairOwner=null;
  // Personal material runs are brisk and dominate the scene. A full upper-floor
  // route must not leave already-arrived crew appearing parked for minutes.
  let remaining=dt*(pushing?2.2:6.5);
  while(w.path.length&&remaining>0){
   const from=pushing?this.cartOf(w.id):w.pos,t=w.path[0],dx=t[0]-from[0],dy=t[1]-from[1],dz=t[2]-from[2],d=Math.hypot(dx,dy,dz);
   if(d<.001){w.path.shift();continue;}
   const heading=Math.atan2(dx,dz);
   if(pushing&&d>.002){
    const cartHeading=this.cartHeadingOf(w.id),angle=Math.atan2(Math.sin(heading-cartHeading),Math.cos(heading-cartHeading));
    this.cartTurning=Math.abs(angle)>.02;
    if(this.cartTurning){const nextHeading=cartHeading+Math.sign(angle)*Math.min(Math.abs(angle),dt*1.8);this.setCart(w.id,from,nextHeading);w.heading=nextHeading;w.pos=[from[0]-Math.sin(nextHeading)*1.1,0,from[2]-Math.cos(nextHeading)*1.1];return;}
   }
   this.cartTurning=false;
   if(d>.001)w.heading=heading;
   const f=d<.001?1:Math.min(1,remaining/d),next:V3=[from[0]+dx*f,from[1]+dy*f,from[2]+dz*f];
   if(!pushing&&inStair(next)&&!this.yieldTargets.has(w.id)){if(this.stairOwner!==null&&this.stairOwner!==w.id){this.travelOwner=null;this.planned.delete(w.id);return;}this.stairOwner=w.id;}
   // Stair ramps are explicit supported links; ordinary motion never leaves a deck.
   const extra=this.dynamicObstacles(w);
   const height=this.carryingLoad(w)?2.65:1.4;
   if(!segmentClear(from,next,radius,height,true,extra)||extra.some(b=>intersects(next,radius,height,b))){
    // A second cart or a newly unloaded pallet can appear after this route was
    // planned. Release the movement token and re-plan around it; merely waiting
    // here can deadlock both logistics lanes permanently.
    this.travelOwner=null;this.planned.delete(w.id);this.routeRetry.set(w.id,this.time+.15);
    return;
   }
   if(pushing){this.setCart(w.id,next);const cartHeading=this.cartHeadingOf(w.id);w.pos=[next[0]-Math.sin(cartHeading)*1.1,0,next[2]-Math.cos(cartHeading)*1.1];}
   else w.pos=next;
   if(this.stairOwner===w.id&&!inStair(w.pos))this.stairOwner=null;
   if(d<=remaining+.00001){w.path.shift();remaining-=d;}else remaining=0;
  }
  if(!w.path.length){this.travelOwner=null;this.planned.delete(w.id);if(this.stairOwner===w.id)this.stairOwner=null;const target=this.yieldTargets.get(w.id);if(target){this.yieldTargets.delete(w.id);this.go(w,target,w.state);}else if(['fetching','handcarry'].includes(w.state)&&w.task){const next=this.workers.filter(a=>a.task===w.task&&a.path.length).sort((a,b)=>a.id-b.id)[0];if(next)this.travelOwner=next.id;}}
 }
 effort(w:Worker,dt:number){w.worked+=dt;}
 advanceCrane(dt:number,w:Worker){
  const c=this.crane,t=this.tasks.find(t=>t.id===c.task);if(!t)return;
  const pad=this.padPoint(t),target=this.supplyPoint(t);
  // Validate both the payload volume and cable before advancing the hook.
  const previous:[number,number,number]=[...c.pos];
  const goals:V3[]=[[pad[0],10,pad[2]],[pad[0],1.55,pad[2]],[pad[0],10,pad[2]],[target[0],10,target[2]],[target[0],target[1]+1.55,target[2]],[target[0],10,target[2]]];
  const durations=[1.4,1.2,1.4,2,1.4,1];c.elapsed+=dt;const f=Math.min(1,c.elapsed/durations[c.phase]);const ease=f*f*(3-2*f),goal=goals[c.phase];c.pos=goal.map((v,i)=>c.from[i]+(v-c.from[i])*ease) as V3;
  if(c.phase===0||c.phase===3){const cx=-6.6,cz=5.3,a=Math.atan2(c.from[2]-cz,c.from[0]-cx),b=Math.atan2(goal[2]-cz,goal[0]-cx);const delta=Math.atan2(Math.sin(b-a),Math.cos(b-a));const radius=Math.hypot(c.from[0]-cx,c.from[2]-cz)*(1-ease)+Math.hypot(goal[0]-cx,goal[2]-cz)*ease;c.pos[0]=cx+Math.cos(a+delta*ease)*radius;c.pos[2]=cz+Math.sin(a+delta*ease)*radius;}
  const physical=siteSolids.filter(b=>b.id!=='building-reservation'&&!b.id.startsWith('stock-envelope'));
  for(const task of this.tasks.filter(t=>t.progress>0))for(const p of task.parts){const angle=p.rotation?.[0]??0,cos=Math.abs(Math.cos(angle)),sin=Math.abs(Math.sin(angle));physical.push({id:p.id,pos:p.pos,size:[p.size[0],p.size[1]*cos+p.size[2]*sin,p.size[2]*cos+p.size[1]*sin],color:'invisible'});}
  for(const a of this.workers)physical.push({id:'worker-'+a.id,pos:[a.pos[0],a.pos[1]+.7,a.pos[2]],size:[.68,1.4,.68],color:'invisible'});
  const samples=Math.max(1,Math.ceil(Math.hypot(...c.pos.map((v,i)=>v-previous[i]))/.08));
  const blocked=Array.from({length:samples+1},(_,i)=>previous.map((v,k)=>v+(c.pos[k]-v)*i/samples) as V3).some(p=>physical.some(b=>intersects([p[0],p[1]-1.4,p[2]],.48,1.4,b)||intersects(p,.04,11.8-p[1],b)));
  if(blocked){c.pos=previous;c.elapsed-=dt;throw Error('Crane path intersects '+t.label);}
  this.effort(w,dt);
  if(f===1){if(c.phase===1){t.supply='lifting';c.load=true;}if(c.phase===4){t.supply='landed';c.load=false;c.lifts++;this.log('外侧卸料平台就位：'+t.label);}if(c.phase===5)t.supply='ready';c.phase++;c.elapsed=0;c.from=[...c.pos];if(c.phase===6){c.task=null;c.phase=0;w.completed++;w.task=null;w.state='idle';}}
 }
 advance(dt:number){
  if(this.paused)return;this.time+=dt;
  if(this.stairOwner!==null&&!this.workers[this.stairOwner].path.length)this.stairOwner=null;
  // Never leave a reassigned worker standing on a stair flight. Evacuate the
  // nearest landing first, before dispatching any opposing stair traffic.
  const stranded=this.workers.find(w=>!w.path.length&&w.pos[1]>.2&&w.pos[0]>6.65&&w.pos[0]<8.95&&w.pos[2]>-5.25&&w.pos[2]<1.3);
  if(stranded){
   const landing=[...STAIRS].filter(p=>[1.65,3.3,4.75,6.2].some(y=>Math.abs(p[1]-y)<.05)).sort((a,b)=>Math.hypot(...a.map((v,i)=>v-stranded.pos[i]))-Math.hypot(...b.map((v,i)=>v-stranded.pos[i])))[0];
   if(Math.hypot(...landing.map((v,i)=>v-stranded.pos[i]))>.08){this.go(stranded,landing,stranded.state);this.planned.add(stranded.id);this.travelOwner=stranded.id;this.stairOwner=stranded.id;}
  }
  for(const w of this.workers){
   w.phase+=dt;
   if(w.state==='supporting'){
    const t=this.task(w),specialistNeeded=w.id===1&&!!t&&['atMixer','atLift'].includes(t.supply),courierNeeded=w.id===0&&t?.supply==='stock';
    if(!t||specialistNeeded||courierNeeded||t.supply==='used'){
     w.task=null;
     if(w.path.length&&!specialistNeeded)w.state='waiting';
     else{w.state='idle';w.path=[];this.planned.delete(w.id);if(this.travelOwner===w.id)this.travelOwner=null;}
    }
    else this.effort(w,dt);
   }
   const wasMoving=w.path.length>0;
   if(wasMoving){this.move(w,dt);if(w.id<2&&this.pushing(w))this.effort(w,dt*.35);if(w.path.length)continue;
    if(w.state==='toCart'){const p=MATERIALS[this.task(w)!.material].pos;this.go(w,[p[0]+(w.id===1?-3.1:3.5),0,p[2]],'material');continue;}
    if(w.state==='material'){w.state='loading';w.timer=1.1;}
    if(w.state==='carrying'){w.state='unloading';w.timer=.8;}
    if(w.state==='unloadTrip'){w.state='unloading';w.timer=.8;}
    if(w.state==='toControl'){w.state='operating';const t=this.task(w)!;this.crane.task=t.id;this.crane.phase=0;this.crane.elapsed=0;this.crane.from=[...this.crane.pos];}
    if(w.state==='fetching'){w.state='pickupLoading';w.timer=.65;continue;}
    if(w.state==='handcarry'){w.state='working';continue;}
    if(w.state==='movingWork'){const t=this.task(w)!;w.state='mixing';t.supply='mixing';}
    if(w.state==='returning'){w.state='idle';w.task=null;}
   }
   if(w.state==='finished')continue;
   if(w.state==='loading'){
    const t=this.task(w)!;w.timer-=dt;if(w.timer<=0){if(this.stock[t.material]<t.amount){w.state='waitingSupply';this.log(MATERIALS[t.material].name+'不足，等待补料');continue;}
     this.stock[t.material]-=t.amount;t.supply='cart';this.log(`运输车 ${w.id+1} 取走 ${t.amount} 组${MATERIALS[t.material].name}`);const p=t.needsLift?PAD:this.cartDropPoint(t);this.go(w,[p[0],0,p[2]],'carrying');}continue;
   }
   if(w.state==='waitingSupply'){const t=this.task(w);if(w.id===0&&t&&this.stock[t.material]>=t.amount){w.state='loading';w.timer=.2;}continue;}
   if(w.state==='pickupLoading'){const t=this.task(w)!;w.timer-=dt;if(w.timer<=0){t.supply='handcarry';this.go(w,this.workerPoint(t,w),'handcarry');}continue;}
   if(w.state==='unloading'){const t=this.task(w)!;w.timer-=dt;if(w.timer<=0){t.supply=t.needsLift?'atLift':'ready';if(t.material==='concrete')t.mixed=3;this.delivered.add(t.id);w.task=null;w.completed++;w.state='idle';w.path=[];this.planned.delete(w.id);if(this.travelOwner===w.id)this.travelOwner=null;}else continue;}
   if(w.state==='operating'){this.advanceCrane(dt,w);if(w.state==='operating')continue;}
   if(w.state==='mixing'){const t=this.task(w)!;t.mixed+=dt;this.mixerAngle+=dt*5;this.effort(w,dt);if(t.mixed>=3){t.supply='ready';w.completed++;w.task=null;w.state='idle';}else continue;}
   if(w.state==='working'||w.state==='waitingPartner'||w.state==='supporting')continue;
   if(w.state==='idle'||w.state==='waiting'){
    if(this.complete){w.state='finished';w.path=[];this.planned.delete(w.id);if(this.travelOwner===w.id)this.travelOwner=null;continue;}
    if(w.id<2){
     const machineTask=w.id===1?this.tasks.find(t=>t.supply==='atLift'):undefined;
     if(machineTask){w.task=machineTask.id;if(machineTask.supply==='atMixer')this.go(w,[MIXER[0],0,MIXER[2]-1.4],'movingWork');else{w.state='operating';this.crane.task=machineTask.id;this.crane.phase=0;this.crane.elapsed=0;this.crane.from=[...this.crane.pos];}continue;}
     const liftInTransit=this.tasks.some(t=>t.needsLift&&!t.done&&!['stock','ready','handcarry','used'].includes(t.supply));
     const activeSlots=this.tasks.filter(t=>!t.done&&t.driver===w.id&&t.needsLift===false&&!['stock','used'].includes(t.supply)).map(t=>t.padSlot),slot=[0,1,2].find(n=>!activeSlots.includes(n));
     const upperSlots=this.tasks.filter(t=>!t.done&&t.needsLift&&t.site[1]<=4&&!['stock','used'].includes(t.supply)).map(t=>t.padSlot),upperHighSlots=this.tasks.filter(t=>!t.done&&t.needsLift&&t.site[1]>4&&!['stock','used'].includes(t.supply)).map(t=>t.padSlot);
     const t=this.tasks.find(t=>t.supply==='stock'&&this.ready(t)&&!(w.id===1&&t.needsLift)&&!(t.needsLift&&liftInTransit)&&(t.needsLift?([0,1,2].some(n=>!(t.site[1]>4?upperHighSlots:upperSlots).includes(n))):slot!==undefined)&&!this.tasks.some(a=>a.driver!==w.id&&a.material===t.material&&a.supply==='collecting'));
     if(t){t.driver=w.id;t.padSlot=t.needsLift?([0,1,2].find(n=>!(t.site[1]>4?upperHighSlots:upperSlots).includes(n))??0):slot!;t.supply='collecting';w.task=t.id;const cart=this.cartOf(w.id),heading=this.cartHeadingOf(w.id);this.go(w,[cart[0]-Math.sin(heading)*1.1,0,cart[2]-Math.cos(heading)*1.1],'toCart');}else w.state='waiting';
    }else w.state='waiting';
   }
  }
  for(const t of this.tasks)if(t.supply==='handcarry'&&t.crew.some(id=>this.workers[id].state==='working'))t.supply='ready';
  // Once material reaches the site, the entire crew carries it directly to the
  // building face. There is no remote preparation or waiting-area phase.
  for(const t of this.tasks.filter(t=>!t.done&&t.owner===null&&t.supply==='ready'&&this.ready(t))){
   const builders=this.workers.slice(2),available=builders.filter(w=>w.task===null&&!w.path.length&&['idle','waiting'].includes(w.state));
   const w=available.sort((a,b)=>((a.id-this.nextBuilder+3)%3)-((b.id-this.nextBuilder+3)%3))[0];
   if(!w)continue;
   this.nextBuilder=2+(w.id-1)%3;
   t.owner=w.id;t.crew=[w.id];this.workSlots.set(t.id+'/'+w.id,0);
   // Every builder owns a separate job: local unloading point → its own work
   // face → completion. No crew barrier and no waiting for colleagues.
   w.task=t.id;this.go(w,this.pickupPoint(t,w),'fetching');this.travelOwner=w.id;
  }
  // The marked facade envelope has room for its assigned installation crew.
  // Everyone else assists with tools/material preparation without trying to
  // cross through that crew on the narrow scaffold.
  // During the vehicle leg, free workers head to the material collection aisle.
  // They do not wait at the building and never add remote construction progress.
  // Each job has one builder. Work begins only after that builder physically
  // carried the parcel from the unloading point to this work face.
  for(const t of this.tasks.filter(t=>!t.done&&t.crew.length>0)){
   const team=t.crew.map(id=>this.workers[id]);
   const present=team.filter(w=>!w.path.length&&(w.state==='working'||w.state==='waitingPartner'));
   if(present.length!==team.length||t.supply!=='ready')continue;
   for(const w of team)w.state='working';
   const step=Math.min(dt,t.work-t.progress);t.progress+=step;t.used=t.amount*t.progress/t.work;for(const w of present)this.effort(w,dt);
   if(t.progress>=t.work-1e-6){t.progress=t.work;t.used=t.amount;t.done=true;t.supply='used';t.owner=null;for(const w of team){w.completed++;this.planned.delete(w.id);if(this.travelOwner===w.id)this.travelOwner=null;this.go(w,this.builderReturnPoint(t,w),'returning');}t.crew=[];}
  }
  if(!this.complete&&this.tasks.every(t=>t.done)){this.complete=true;this.log('房屋交付：材料已逐项计入建筑，剩余库存保留');}
 }
 workerPoint(t:Task,w:Worker):V3{
  if(t.label==='整理场地')return [-1+(w.id-3),0,-4.8];
  const p:V3=[...t.site];
  if(Math.abs(p[2])>3.8){
   p[0]=Math.max(-3.6,Math.min(3.6,p[0]));
   p[0]+=(3-w.id)*1.2+.3;
   const side=Math.sign(p[2]);
   p[2]=side*(t.label==='整理场地'?4.9:4.55)+side*(w.id-3)*.3;
  }else{
   p[2]+=(3-w.id)*1.2;
   p[0]=Math.sign(p[0]||1)*5.5;
  }
  return p;
 }
}
