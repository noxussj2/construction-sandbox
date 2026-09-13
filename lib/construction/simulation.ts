import {PAD,GROUND_BAY,MIXER,CONTROL,LANDINGS,STAIRS,STOCK_Z,RADIUS,CART_RADIUS,siteSolids,floorRoute,segmentClear,intersects,type Solid} from './layout.ts';
export type V3 = [number, number, number];
export type Part = { id: string; size: V3; pos: V3; color: string; rotation?: V3; glass?: boolean };
export type MaterialKind = 'concrete'|'steel'|'brick'|'timber'|'panel'|'fittings';
export type SupplyState = 'stock'|'collecting'|'cart'|'atLift'|'lifting'|'landed'|'ready'|'handcarry'|'used';
export const MATERIALS:Record<MaterialKind,{name:string;color:string;pos:V3}>= {
 concrete:{name:'混凝土料',color:'#bbbba7',pos:[-13,0,STOCK_Z[0]]},
 steel:{name:'钢构件',color:'#8daca9',pos:[-13,0,STOCK_Z[1]]},
 brick:{name:'砌块',color:'#c88f69',pos:[-13,0,STOCK_Z[2]]},
 timber:{name:'木构件',color:'#b78d57',pos:[-13,0,STOCK_Z[3]]},
 panel:{name:'板材',color:'#597f8a',pos:[-13,0,STOCK_Z[4]]},
 fittings:{name:'整窗与门框',color:'#9abbb0',pos:[-13,0,STOCK_Z[5]]}
};
export const ROLES=['运输工','运输工','建筑工','建筑工','建筑工'];
export const LIFT_PAD:V3=PAD;
export const CRANE_CONTROL:V3=CONTROL;
export type Task = { id: string; label: string; stage: number; parts: Part[]; work: number; progress: number; owner: number | null; driver:number|null; done: boolean; site: V3; material:MaterialKind; amount:number; used:number; supply:SupplyState; crew:number[]; needsLift:boolean; heavy:boolean; specialist:boolean; mixed:number; pickupTime?:number; pickupFrom?:V3; dropTime?:number; dropFrom?:V3; padSlot:number };
export type WorkerState = 'idle'|'material'|'carrying'|'returnCart'|'working'|'waiting'|'finished'|'loading'|'unloading'|'toCart'|'operating'|'waitingSupply'|'fetching'|'pickupLoading'|'handcarry';
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
  // Keep installation long enough to visually balance each delivery cycle.
  // Installation should occupy roughly the same visual time as the next
  // delivery loop.  This prevents builders from finishing instantly and then
  // appearing to wait for logistics for most of the scene.
  work=Math.max(6,work*1.2);
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
 events:string[]=['施工流程：分区施工 · 按工序备料 · 就近接续'];
 stock={} as Record<MaterialKind,number>;initialStock={} as Record<MaterialKind,number>;
 cartPos:V3=[-9.5,0,-9];cartHeading=0;cart2Pos:V3=[-16.1,0,-5.7];cart2Heading=0;mixerPos:V3=[...MIXER];mixerAngle=0;
 cartTurning=false;
 private planned=new Set<number>();private stairOwner:number|null=null;
 routeError='';private routeRetry=new Map<number,number>();private delivered=new Set<string>();
 private staticRoutes=new Map<string,V3[]>();
 crane:CraneState={task:null,phase:0,elapsed:0,pos:[PAD[0],10,PAD[2]],from:[PAD[0],10,PAD[2]],load:false,lifts:0};
 constructor(){
  for(const kind of Object.keys(MATERIALS) as MaterialKind[]){const needed=this.tasks.filter(t=>t.material===kind).reduce((n,t)=>n+t.amount,0);this.stock[kind]=needed+Math.max(1,Math.ceil(needed*.1));this.initialStock[kind]=this.stock[kind];}
  // Builders and their receiving slots are fixed. A vehicle claims each
  // delivery once when it becomes free, and retains it through unloading.
  this.tasks.forEach(t=>{t.driver=null;t.padSlot=this.assignedBuilder(t)-2;});
  this.workers=COLORS.map((color,i)=>({id:i,role:i<2?'运输工':'建筑工',buildingId:'house-001',color,pos:i===0?[-9.5,0,-10.1]:i===1?[-16.1,0,-6.8]:[4+(i-2)*3,0,9],state:'idle',task:null,path:[],heading:0,phase:i,completed:0,worked:0,timer:0}));
 }
 random(){this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296;}
 get stage(){return this.tasks.find(t=>!t.done)?.stage??8;}
 get progress(){return this.tasks.reduce((s,t)=>s+t.progress,0)/this.tasks.reduce((s,t)=>s+t.work,0);}
 log(s:string){this.events.unshift(s);this.events=this.events.slice(0,4);}
 task(w:Worker){return this.tasks.find(t=>t.id===w.task);}
 taskIndex(t:Task){return Number(t.id.slice(5))-1;}
 // Keep the same facade with one builder; foundation strips stay balanced.
 assignedBuilder(t:Task){return t.stage===0?2+this.taskIndex(t)%3:t.site[2]>3?4:t.site[0]<0?2:3;}
 transportSlotBusy(candidate:Task,w:Worker){return this.tasks.some(t=>t!==candidate&&!t.done&&(!candidate.needsLift?t.driver===w.id:true)&&t.padSlot===candidate.padSlot&&t.needsLift===candidate.needsLift&&(!t.needsLift||((t.site[1]>4)===(candidate.site[1]>4)))&&!['stock','used','cart','handcarry'].includes(t.supply));}
 canTransportDrop(candidate:Task,w:Worker){
  // Only stage material whose structural predecessors are complete. Receiving
  // slots remain reserved until pickup, independently of the task's list index.
  return this.ready(candidate)&&!this.transportSlotBusy(candidate,w)&&!(candidate.needsLift&&this.tasks.some(t=>t!==candidate&&t.needsLift&&!t.done&&['cart','atLift','lifting'].includes(t.supply)&&((t.supply!=='cart')||this.workers[t.driver!].state==='carrying'||this.workers[t.driver!].state==='unloading')));
 }
 canFetch(t:Task,w:Worker){
  if(t.supply!=='ready'||!this.ready(t))return false;
  // The final scaffold/ground approach is a narrow material-carrying lane.
  // Stagger only that short transit; builders already at their own work faces
  // continue concurrently.  Also do not dispatch into an occupied work point.
  if(this.workers.some(a=>a.id>=2&&a.id!==w.id&&(t.needsLift||a.pos[1]>.2)&&a.path.length>0&&['waitingSupply','waiting','idle'].includes(a.state)))return false;
  const moving=this.workers.filter(a=>a.id>=2&&a.id!==w.id&&(a.path.length||['fetching','pickupLoading','handcarry'].includes(a.state)));
  if(moving.length){
   // Reserve the complete pickup-to-work corridor before releasing another
   // worker. Disjoint routes run together; crossing routes take turns.
   try{
    const corridor=(a:Worker,job:Task,picking:boolean)=>{
     const pick=this.pickupPoint(job,a),end=this.workerPoint(job,a);
     return [a.pos,...(picking?[...this.route(a.pos,pick),...this.route(pick,end)]:a.path)];
    };
    const own=corridor(w,t,true);
    const near=(a:V3,b:V3,c:V3,d:V3)=>{
     const cross=(p:V3,q:V3,r:V3)=>(q[0]-p[0])*(r[2]-p[2])-(q[2]-p[2])*(r[0]-p[0]);
     if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return true;
     const distance=(p:V3,q:V3,r:V3)=>{const x=r[0]-q[0],z=r[2]-q[2],f=Math.max(0,Math.min(1,((p[0]-q[0])*x+(p[2]-q[2])*z)/(x*x+z*z||1)));return Math.hypot(p[0]-q[0]-f*x,p[2]-q[2]-f*z);};
     return Math.min(distance(a,c,d),distance(b,c,d),distance(c,a,b),distance(d,a,b))<1.4;
    };
    for(const a of moving){const job=this.task(a);if(!job)return false;const path=corridor(a,job,['fetching','pickupLoading'].includes(a.state));if(own.slice(1).some((end,i)=>path.slice(1).some((b,j)=>near(own[i],end,path[j],b))))return false;}
   }catch{return false;}
  }
  const target=this.workerPoint(t,w);
  const pickup=this.pickupPoint(t,w);
  // Reserve only a feasible trip. A completed worker may still occupy a
  // narrow facade; let them clear it before sending a carrier onto that floor.
  try{
   const extra=this.dynamicObstacles(w).filter(b=>b.id!=='cargo-'+t.id);
   this.route(w.pos,pickup,RADIUS,extra);
   this.route(pickup,target,RADIUS,extra);
  }catch{return false;}
  return !this.workers.some(a=>a.id>=2&&a.id!==w.id&&!a.path.length&&Math.abs(a.pos[1]-target[1])<.2&&(
   Math.hypot(a.pos[0]-target[0],a.pos[2]-target[2])<.9||
   (t.needsLift&&Math.hypot(a.pos[0]-pickup[0],a.pos[2]-pickup[2])<2.2)
  ));
 }
 dispatchBuilder(w:Worker){
  // Do not introduce a new clearing route across an already reserved trip.
  if(w.pos[1]>.2&&this.workers.some(a=>a.id>=2&&a.id!==w.id&&(a.path.length||a.state==='pickupLoading')))return;
  const assigned=this.tasks.filter(t=>!t.done&&this.assignedBuilder(t)===w.id);
  const t=assigned.find(t=>this.ready(t)&&t.supply==='ready')??assigned.find(t=>this.ready(t))??assigned[0];
  if(!t){w.task=null;const exit:V3=[-9,0,10+(w.id-3)];if(this.complete){w.path=[];w.state='finished';}else if(Math.hypot(...exit.map((v,i)=>v-w.pos[i]))>.1)this.go(w,exit,'waiting');else{w.path=[];w.state='waiting';}return;}
  t.owner=w.id;t.crew=[w.id];w.task=t.id;
  if(this.canFetch(t,w))this.go(w,this.pickupPoint(t,w),'fetching');
  else this.go(w,this.standbyPoint(t,w),'waitingSupply');
 }
 cartOf(id:number):V3{return id===1?this.cart2Pos:this.cartPos;}
 cartHeadingOf(id:number){return id===1?this.cart2Heading:this.cartHeading;}
 setCart(id:number,pos:V3,heading?:number){if(id===1){this.cart2Pos=pos;if(heading!==undefined)this.cart2Heading=heading;}else{this.cartPos=pos;if(heading!==undefined)this.cartHeading=heading;}}
 groundDropPoint(t:Task):V3{if(t.driver===1)return [9,0,[-4,-1,2][t.padSlot]??-1];const lanes=[2,5,8];return [lanes[t.padSlot]??lanes[0],0,-8.6];}
 // Vehicles stop on the unobstructed outer service road. Pallets are set down
 // one metre inward during the unloading animation; carts never have to enter
 // the narrow pedestrian pickup pockets.
 cartDropPoint(t:Task):V3{if(t.driver===1)return t.needsLift?[12,0,-7.5]:[12,0,[-4,-1,2][t.padSlot]??-1];const lanes=[2,5,8];return [t.needsLift?PAD[0]:(lanes[t.padSlot]??lanes[0]),0,-11.8];}
 get inventory(){return (Object.keys(MATERIALS) as MaterialKind[]).map(kind=>{
  let transit=0,site=0,installed=0;
  for(const t of this.tasks.filter(t=>t.material===kind)){installed+=t.used;const remaining=t.amount-t.used;if(['cart','lifting','handcarry'].includes(t.supply))transit+=remaining;else if(['atLift','ready','landed'].includes(t.supply))site+=remaining;}
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
 padPoint(t:Task):V3{return t.driver===1?[10,0,-7.5]:[...PAD];}
 cargoPoint(t:Task):V3{
  const arc=(a:V3,b:V3,f:number):V3=>{f=Math.max(0,Math.min(1,f));const high=Math.max(a[1],b[1])+.35;if(f<.25)return [a[0],a[1]+(high-a[1])*f*4,a[2]];if(f<.65){const u=(f-.25)/.4;return [a[0]+(b[0]-a[0])*u,high,a[2]+(b[2]-a[2])*u];}return [b[0],high+(b[1]-high)*(f-.65)/.35,b[2]];};
  if(t.pickupTime!==undefined&&t.pickupFrom){const w=this.workers[t.owner!];return arc(t.pickupFrom,[w.pos[0],w.pos[1]+1.45,w.pos[2]],this.time-t.pickupTime);}
  if(t.dropTime!==undefined&&t.dropFrom){const p=this.workSupplyPoint(t);return arc(t.dropFrom,[p[0],p[1]+.12,p[2]],this.time-t.dropTime);}
  const courier=this.workers[t.driver??0],cart=this.cartOf(courier.id);
  if(courier.task===t.id&&courier.state==='unloading'){
   const destination=t.needsLift?this.padPoint(t):this.groundDropPoint(t);
   const a:V3=[cart[0],.51,cart[2]],b:V3=[destination[0],.12,destination[2]];
   const f=Math.max(0,Math.min(1,1-courier.timer/.8));return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f+Math.sin(f*Math.PI)*.8,a[2]+(b[2]-a[2])*f];
  }
  if(t.supply==='cart')return [cart[0],.51,cart[2]];
  if(t.supply==='lifting')return [this.crane.pos[0],this.crane.pos[1]-1.4,this.crane.pos[2]];
  const p=t.supply==='atLift'?this.padPoint(t):this.supplyPoint(t);return [p[0],p[1]+(t.supply==='handcarry'?1.45:.12),p[2]];
 }
 pickupPoint(t:Task,w:Worker):V3{const p=this.supplyPoint(t);p[0]-=(t.crew.indexOf(w.id)-(t.crew.length-1)/2)*.8;p[2]+=.95;return p;}
 upperStandby(w:Worker):V3{
  // Side pockets shorten the next empty pickup walk; retain a separate rear
  // fallback for each worker and never park on the receiving bridge.
  const y=w.pos[1];
  const pockets:V3[]=[[-5.85,y,-1.5],[5.85,y,1.5],[(w.id-3)*3,y,6]];
  return pockets.filter(p=>!this.workers.some(a=>a.id>=2&&a.id!==w.id&&Math.abs(a.pos[1]-y)<.2&&Math.hypot(a.pos[0]-p[0],a.pos[2]-p[2])<1.4)).sort((a,b)=>Math.hypot(a[0]-w.pos[0],a[2]-w.pos[2])-Math.hypot(b[0]-w.pos[0],b[2]-w.pos[2]))[0]??[(w.id-3)*3,y,6];
 }
 standbyPoint(t:Task,w:Worker):V3{
  // After finishing an upper-floor batch, clear the facade to a distinct point
  // on the same scaffold.  Carrier dispatch waits for this short relocation,
  // so the landing route cannot be pinched by two stationary builders.
  if(w.pos[1]>.2)return this.upperStandby(w);
  if(t.stage>this.stage||t.needsLift)return [4+(w.id-2)*3,0,9];
  const p=this.supplyPoint(t);
  return t.driver===1?[p[0]-1.6,0,p[2]+.95]:[p[0],0,p[2]+1.6];
 }
 dependencies(t:Task):Task[]{
  const stage=(n:number)=>this.tasks.filter(a=>a.stage===n);
  if(t.stage===0)return [];
  if(t.label==='安装承重柱')return t.stage===1?stage(0):stage(3);
  if(/横梁|侧梁/.test(t.label)){
   const beam=t.parts[0];
   return stage(t.stage).filter(a=>a.label==='安装承重柱'&&Math.abs(a.parts[0].pos[0]-beam.pos[0])<=beam.size[0]/2+.15&&Math.abs(a.parts[0].pos[2]-beam.pos[2])<=beam.size[2]/2+.15);
  }
  if(t.stage===2||t.stage===5){
   if(t.label.includes('窗')&&!t.label.includes('墙'))return stage(t.stage).filter(a=>a.label.includes('墙')&&a.site.every((v,i)=>v===t.site[i]));
   return stage(t.stage===2?1:4);
  }
  if(t.stage===3)return [...stage(1),...stage(2).filter(a=>a.label.includes('楼梯'))];
  if(t.label==='搭建屋架')return stage(4);
  if(t.label==='铺设金属屋面')return stage(6).filter(a=>a.label==='搭建屋架');
  if(t.label==='安装屋脊')return stage(6);
  if(t.label==='整理场地')return this.tasks.filter(a=>a!==t);
  return stage(2).filter(a=>a.label.includes('墙'));
 }
 ready(t:Task){return this.dependencies(t).every(a=>a.done);}
 private canPrepare(t:Task){return this.dependencies(t).every(a=>a.done||a.supply==='handcarry');}
 // Physical routes, not post-render displacement. The cart cannot enter stairs.
 route(from:V3,to:V3,radius=RADIUS,extra:Solid[]=[],cartId?:number):V3[]{
  const floor=(a:V3,b:V3)=>{
   // Corridor checks use immutable site geometry. Reuse exact routes only
   // when no workers, cargo or built-part obstacles were supplied.
   if(extra.length)return floorRoute(a,b,radius,extra);
   const key=`${radius}:${a.join(',')}:${b.join(',')}`,cached=this.staticRoutes.get(key);
   if(cached)return cached.map(p=>[...p] as V3);
   const result=floorRoute(a,b,radius);if(this.staticRoutes.size>=2048)this.staticRoutes.clear();this.staticRoutes.set(key,result.map(p=>[...p] as V3));return result;
  };
  if(radius===CART_RADIUS&&Math.abs(from[1]-to[1])<.05){
   // The two carts have permanent, separated service-road lanes. They never
   // negotiate a shared free-form route or wait for another worker's path.
   const west=cartId===1,laneZ=-11.8;
   const enteringStock=to[0]<-9;
   const points:V3[]=west
    ?(enteringStock?(from[0]<-14?[[...to]]:[[15,0,from[2]],[15,0,12],[to[0],0,12],[...to]]):(from[0]<-14?[[from[0],0,12],[15,0,12],[15,0,to[2]],[...to]]:[[15,0,from[2]],[...to]]))
    :(enteringStock?[[to[0],0,laneZ],[...to]]:[[from[0],0,laneZ],[...to]]);
   let a=from;
   for(const b of points){if(!segmentClear(a,b,radius,1.4,true,extra.filter(s=>!s.id.startsWith('worker-'))))throw Error(`Blocked fixed cart lane: ${a.join(',')} → ${b.join(',')}`);a=b;}
   return points;
  }
  if(Math.abs(from[1]-to[1])<.05)return floor(from,to);
  if(radius===CART_RADIUS)throw Error('Cart routes must remain on ground');
  // Choose the nearest real stair waypoint, not a coarse height bucket. The
  // old height mapping mistook the 1.65 m landing for the 3.3 m landing and
  // could send a descending worker back upward.
  const index=(p:V3)=>{
   if(p[1]<.2)return 0;
   if(Math.abs(p[1]-3.3)<.12)return 6;
   if(Math.abs(p[1]-6.2)<.12)return 12;
   const candidates=Math.abs(p[1]-1.65)<.2?[1,2,3]:Math.abs(p[1]-4.75)<.2?[7,8,9]:STAIRS.map((_,n)=>n);
   return candidates.reduce((best,n)=>Math.hypot(STAIRS[n][0]-p[0],(STAIRS[n][1]-p[1])*3,STAIRS[n][2]-p[2])<Math.hypot(STAIRS[best][0]-p[0],(STAIRS[best][1]-p[1])*3,STAIRS[best][2]-p[2])?n:best,candidates[0]);
  };
  const i=index(from),j=to[1]<.2?0:index(to),dir=i<j?1:-1;
  const points=floor(from,STAIRS[i]);
  for(let n=i+dir;n!==j+dir;n+=dir)points.push([...STAIRS[n]]);
  points.push(...floor(STAIRS[j],to));return points;
 }
 go(w:Worker,to:V3,state:WorkerState){w.path=[[...to]];w.state=state;this.planned.delete(w.id);}
 private pushing(w:Worker){return w.id<2&&['material','carrying','returnCart'].includes(w.state);}
 private dynamicObstacles(w:Worker):Solid[]{
  const result:Solid[]=this.workers.filter(a=>a.id!==w.id).map(a=>({id:'worker-'+a.id,size:[.68,1.35,.68],pos:[a.pos[0],a.pos[1]+.7,a.pos[2]],color:'invisible'}));
  for(const id of [0,1])if(id!==w.id){const p=this.cartOf(id);result.push({id:'cart-clearance-'+id,size:[1.1,1.25,1.2],pos:[p[0],.7,p[2]],color:'invisible',rotation:this.cartHeadingOf(id)});}
  // A worker may approach their own assigned pallet, while every other staged
  // pallet remains a real obstacle for route planning.
  for(const t of this.tasks.filter(t=>(['atLift','landed'].includes(t.supply)||(t.supply==='ready'&&!t.needsLift))&&!(t.id===w.task&&['fetching','pickupLoading'].includes(w.state)))){const p=this.cargoPoint(t),height=t.material==='fittings'?(t.label.includes('门框')?1.06:.74):.27*t.amount;result.push({id:'cargo-'+t.id,size:[.78,height,.44],pos:[p[0],p[1]+height/2,p[2]],color:'invisible'});}
  for(const t of this.tasks.filter(t=>t.progress>0&&t.id!==w.task))for(const p of t.parts){const angle=p.rotation?.[0]??0,c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle));result.push({id:p.id,pos:p.pos,size:[p.size[0],p.size[1]*c+p.size[2]*s,p.size[2]*c+p.size[1]*s],color:'invisible'});}
  return result;
 }
 move(w:Worker,dt:number){
  if(w.id>=2&&w.state==='waitingSupply'){
   const own=this.task(w);
   if(own?.supply==='ready'){const p=this.supplyPoint(own);if(Math.hypot(w.pos[0]-p[0],w.pos[2]-p[2])<1.05&&Math.abs(w.pos[1]-p[1])<.2){w.path=[];this.planned.delete(w.id);return;}}
  }
  const pushing=this.pushing(w),radius=pushing?CART_RADIUS:RADIUS;
  if(!this.planned.has(w.id)){
   if(this.time<(this.routeRetry.get(w.id)??0))return;
   const target=w.path[w.path.length-1],from=pushing?this.cartOf(w.id):w.pos;
   const extra=this.dynamicObstacles(w).filter(b=>!pushing||!b.id.startsWith('cart-clearance-'));
   try{w.path=this.route(from,target,radius,extra,pushing?w.id:undefined);this.routeError='';}catch(error){this.routeError=String(error);this.routeRetry.set(w.id,this.time+.6);return;}
   this.planned.add(w.id);
  }
  const inStair=(p:V3)=>p[0]>6.65&&p[0]<8.95&&p[2]>-5.25&&p[2]<1.3;
  if(this.stairOwner!==null&&!inStair(this.workers[this.stairOwner].pos))this.stairOwner=null;
  // Personal material runs are brisk and dominate the scene. A full upper-floor
  // route must not leave already-arrived crew appearing parked for minutes.
  // Speeds are world-units per simulated second. These values keep 1× at a
  // believable walking/driving pace; the UI speed control accelerates time.
  let remaining=dt*(pushing?5:1.8);
  while(w.path.length&&remaining>0){
   const from=pushing?this.cartOf(w.id):w.pos,t=w.path[0],dx=t[0]-from[0],dy=t[1]-from[1],dz=t[2]-from[2],d=Math.hypot(dx,dy,dz);
   if(d<.001){w.path.shift();continue;}
   const heading=Math.atan2(dx,dz);
   if(pushing&&d>.002){
    const cartHeading=this.cartHeadingOf(w.id),angle=Math.atan2(Math.sin(heading-cartHeading),Math.cos(heading-cartHeading));
    this.cartTurning=Math.abs(angle)>.02;
    if(this.cartTurning){const nextHeading=cartHeading+Math.sign(angle)*Math.min(Math.abs(angle),dt*3);this.setCart(w.id,from,nextHeading);w.heading=nextHeading;w.pos=[from[0]-Math.sin(nextHeading)*1.1,0,from[2]-Math.cos(nextHeading)*1.1];return;}
   }
   this.cartTurning=false;
   if(d>.001)w.heading=heading;
   const f=d<.001?1:Math.min(1,remaining/d),next:V3=[from[0]+dx*f,from[1]+dy*f,from[2]+dz*f];
   if(!pushing&&inStair(next)){if(this.stairOwner!==null&&this.stairOwner!==w.id){this.planned.delete(w.id);return;}this.stairOwner=w.id;}
   // Stair ramps are explicit supported links; ordinary motion never leaves a deck.
   const extra=this.dynamicObstacles(w).filter(b=>!pushing||!b.id.startsWith('cart-clearance-'));
   if(!segmentClear(from,next,radius,1.4,true,extra)||extra.some(b=>intersects(next,radius,1.4,b))){
    // A second cart or a newly unloaded pallet can appear after this route was
    // planned. Release the movement token and re-plan around it; merely waiting
    // here can deadlock both logistics lanes permanently.
    this.planned.delete(w.id);this.routeRetry.set(w.id,this.time+.15);
    return;
   }
   if(pushing){this.setCart(w.id,next);const cartHeading=this.cartHeadingOf(w.id);w.pos=[next[0]-Math.sin(cartHeading)*1.1,0,next[2]-Math.cos(cartHeading)*1.1];}
   else w.pos=next;
   if(this.stairOwner===w.id&&!inStair(w.pos))this.stairOwner=null;
   if(d<=remaining+.00001){w.path.shift();remaining-=d;}else remaining=0;
  }
  if(!w.path.length){this.planned.delete(w.id);if(this.stairOwner===w.id)this.stairOwner=null;}
 }
 effort(w:Worker,dt:number){w.worked+=dt;}
 advanceCrane(dt:number){
  const c=this.crane,t=this.tasks.find(t=>t.id===c.task);if(!t)return;
  const pad=this.padPoint(t),target=this.supplyPoint(t);
  // Validate both the payload volume and cable before advancing the hook.
  const previous:[number,number,number]=[...c.pos];
  const goals:V3[]=[[pad[0],10,pad[2]],[pad[0],1.55,pad[2]],[pad[0],10,pad[2]],[target[0],10,target[2]],[target[0],target[1]+1.55,target[2]],[target[0],10,target[2]]];
  const durations=[.35,.35,.35,.5,.35,.3];c.elapsed+=dt;const f=Math.min(1,c.elapsed/durations[c.phase]);const ease=f*f*(3-2*f),goal=goals[c.phase];c.pos=goal.map((v,i)=>c.from[i]+(v-c.from[i])*ease) as V3;
  if(c.phase===0||c.phase===3){const cx=-6.6,cz=5.3,a=Math.atan2(c.from[2]-cz,c.from[0]-cx),b=Math.atan2(goal[2]-cz,goal[0]-cx);const delta=Math.atan2(Math.sin(b-a),Math.cos(b-a));const radius=Math.hypot(c.from[0]-cx,c.from[2]-cz)*(1-ease)+Math.hypot(goal[0]-cx,goal[2]-cz)*ease;c.pos[0]=cx+Math.cos(a+delta*ease)*radius;c.pos[2]=cz+Math.sin(a+delta*ease)*radius;}
  const physical=siteSolids.filter(b=>b.id!=='building-reservation'&&!b.id.startsWith('stock-envelope'));
  for(const task of this.tasks.filter(t=>t.progress>0))for(const p of task.parts){const angle=p.rotation?.[0]??0,cos=Math.abs(Math.cos(angle)),sin=Math.abs(Math.sin(angle));physical.push({id:p.id,pos:p.pos,size:[p.size[0],p.size[1]*cos+p.size[2]*sin,p.size[2]*cos+p.size[1]*sin],color:'invisible'});}
  for(const a of this.workers)physical.push({id:'worker-'+a.id,pos:[a.pos[0],a.pos[1]+.7,a.pos[2]],size:[.68,1.4,.68],color:'invisible'});
  const samples=Math.max(1,Math.ceil(Math.hypot(...c.pos.map((v,i)=>v-previous[i]))/.08));
  const blocked=Array.from({length:samples+1},(_,i)=>previous.map((v,k)=>v+(c.pos[k]-v)*i/samples) as V3).some(p=>physical.some(b=>intersects([p[0],p[1]-1.4,p[2]],.48,1.4,b)||intersects(p,.04,11.8-p[1],b)));
  if(blocked){c.pos=previous;c.elapsed-=dt;throw Error(`Crane path intersects ${t.label} at phase ${c.phase} (${c.pos.join(',')})`);}
  if(f===1){if(c.phase===1){t.supply='lifting';c.load=true;}if(c.phase===4){t.supply='landed';c.load=false;c.lifts++;this.log('外侧卸料平台就位：'+t.label);}if(c.phase===5)t.supply='ready';c.phase++;c.elapsed=0;c.from=[...c.pos];if(c.phase===6){c.task=null;c.phase=0;}}
 }
 advance(dt:number){
  if(this.paused)return;this.time+=dt;
  // The crane has its own operator; neither delivery driver abandons a cart.
  if(!this.crane.task){const t=this.tasks.find(t=>t.supply==='atLift');if(t){this.crane.task=t.id;this.crane.phase=0;this.crane.elapsed=0;this.crane.from=[...this.crane.pos];}}
  if(this.crane.task)this.advanceCrane(dt);
  if(this.stairOwner!==null&&!this.workers[this.stairOwner].path.length)this.stairOwner=null;
  // A route retry must never strand somebody on a stair flight.
  const stranded=this.workers.find(w=>!w.path.length&&w.pos[1]>.2&&w.pos[0]>6.65&&w.pos[0]<8.95&&w.pos[2]>-5.25&&w.pos[2]<1.3);
  if(stranded){
   const landing=[...STAIRS].filter(p=>[1.65,3.3,4.75,6.2].some(y=>Math.abs(p[1]-y)<.05)).sort((a,b)=>Math.hypot(...a.map((v,i)=>v-stranded.pos[i]))-Math.hypot(...b.map((v,i)=>v-stranded.pos[i])))[0];
   if(Math.hypot(...landing.map((v,i)=>v-stranded.pos[i]))>.08){this.go(stranded,landing,stranded.state);this.planned.add(stranded.id);this.stairOwner=stranded.id;}
  }
  for(const w of this.workers){
   w.phase+=dt;
   if(w.id>=2&&w.state==='waitingSupply'){
    let t=this.task(w);
    const next=this.tasks.find(a=>!a.done&&this.assignedBuilder(a)===w.id&&this.ready(a)&&a.supply==='ready');
    if(next&&next!==t){if(t){t.owner=null;t.crew=[];}next.owner=w.id;next.crew=[w.id];w.task=next.id;t=next;}
    // A newly unloaded personal batch supersedes the old drop-side standby
    // route. Clear to the worker's logistics bay before serialized pickup.
    if(t?.supply==='ready'&&w.path.length&&[0,3.3,6.2].some(y=>Math.abs(w.pos[1]-y)<.015)){const safe:V3=w.pos[1]>.2?this.upperStandby(w):[4+(w.id-2)*3,0,9],end=w.path[w.path.length-1];if(Math.hypot(...safe.map((v,i)=>v-end[i]))>.1)this.go(w,safe,'waitingSupply');}
    if(t&&this.canFetch(t,w))this.go(w,this.pickupPoint(t,w),'fetching');
   }
   const wasMoving=w.path.length>0;
   if(wasMoving){this.move(w,dt);if(w.id<2&&this.pushing(w))this.effort(w,dt*.35);if(w.path.length)continue;
    if(w.state==='toCart'){const p=MATERIALS[this.task(w)!.material].pos;this.go(w,[p[0]+(w.id===1?-3.1:3.5),0,p[2]],'material');continue;}
    if(w.state==='material'){w.state='loading';w.timer=.35;}
    if(w.state==='carrying'){w.state='unloading';w.timer=.8;}
    if(w.state==='returnCart'){w.state='idle';w.task=null;}
    if(w.state==='fetching'){
     const t=this.task(w)!;
     if(t.supply==='ready'&&this.ready(t)){w.state='pickupLoading';w.timer=.25;}
     else w.state='waitingSupply';
     continue;
    }
    if(w.state==='handcarry'){w.state='working';continue;}
   }
   if(w.state==='finished')continue;
   if(w.state==='loading'){
    const t=this.task(w)!;w.timer-=dt;if(w.timer<=0){if(this.stock[t.material]<t.amount){w.state='waitingSupply';this.log(MATERIALS[t.material].name+'不足，等待补料');continue;}
     this.stock[t.material]-=t.amount;t.supply='cart';this.log(`运输车 ${w.id+1} 取走 ${t.amount} 组${MATERIALS[t.material].name}`);if(this.canTransportDrop(t,w)){const p=this.cartDropPoint(t);this.go(w,[p[0],0,p[2]],'carrying');}else w.state='waitingSupply';}continue;
   }
   if(w.state==='waitingSupply'){
    const t=this.task(w);
    if(w.id<2&&t?.supply==='collecting'&&this.stock[t.material]>=t.amount){w.state='loading';w.timer=.15;}
    else if(w.id<2&&t?.supply==='cart'&&this.canTransportDrop(t,w)){const p=this.cartDropPoint(t);this.go(w,[p[0],0,p[2]],'carrying');}
    else if(w.id>=2&&t&&this.canFetch(t,w))this.go(w,this.pickupPoint(t,w),'fetching');
    else if(w.id>=2&&t&&[0,3.3,6.2].some(y=>Math.abs(w.pos[1]-y)<.015)&&!this.workers.some(a=>a.id>=2&&a.id!==w.id&&a.path.length)){
     const standby:V3=w.pos[1]<.2&&t.supply==='ready'?[4+(w.id-2)*3,0,9]:this.standbyPoint(t,w);
     if(Math.hypot(...standby.map((v,i)=>v-w.pos[i]))>.12)this.go(w,standby,'waitingSupply');
    }
    continue;
   }
   if(w.state==='pickupLoading'){
    const t=this.task(w)!;
    if(t.supply!=='ready'||!this.ready(t)){w.state='waitingSupply';continue;}
    w.timer-=dt;if(w.timer<=0){t.supply='handcarry';this.go(w,this.workerPoint(t,w),'handcarry');}continue;
   }
   if(w.state==='unloading'){
    const t=this.task(w)!;w.timer-=dt;
    if(w.timer<=0){
     const drop=t.needsLift?this.padPoint(t):this.groundDropPoint(t);
     if(this.workers.slice(2).some(a=>Math.hypot(a.pos[0]-drop[0],a.pos[2]-drop[2])<1.1&&Math.abs(a.pos[1]-drop[1])<.2)){w.timer=.1;continue;}
     t.supply=t.needsLift?'atLift':'ready';if(t.material==='concrete')t.mixed=3;this.delivered.add(t.id);w.task=null;w.completed++;w.state='idle';w.path=[];this.planned.delete(w.id);
    }else continue;
   }
   if(w.state==='working')continue;
   if(w.state==='idle'||w.state==='waiting'){
    if(this.complete){w.state='finished';w.path=[];this.planned.delete(w.id);continue;}
    if(w.id<2){
     // Prepare work whose predecessors are complete or in final installation.
     // Keep at most two outstanding batches per builder, with one receiving
     // slot; a loaded cart stays at stock until that slot and the work are ready.
     const buffered=(candidate:Task)=>this.tasks.filter(t=>!t.done&&this.assignedBuilder(t)===this.assignedBuilder(candidate)&&!['stock','used','handcarry'].includes(t.supply)).length;
     const available=this.tasks.filter(t=>t.supply==='stock'&&this.canPrepare(t));
     const t=available.find(t=>buffered(t)===0)??available.find(t=>buffered(t)<2);
     if(t){t.driver=w.id;t.supply='collecting';w.task=t.id;const cart=this.cartOf(w.id),heading=this.cartHeadingOf(w.id);this.go(w,[cart[0]-Math.sin(heading)*1.1,0,cart[2]-Math.cos(heading)*1.1],'toCart');}
     else{const stockSide:V3=w.id===1?[-16.1,0,10.5]:[-9.2,0,-11.8],cart=this.cartOf(w.id);if(Math.hypot(cart[0]-stockSide[0],cart[2]-stockSide[2])>.2)this.go(w,stockSide,'returnCart');else w.state='waiting';}
    }else this.dispatchBuilder(w);
   }
  }
  for(const t of this.tasks.filter(t=>!t.done&&t.crew.length>0)){
   const team=t.crew.map(id=>this.workers[id]);
   const present=team.filter(w=>!w.path.length&&w.state==='working');
   if(present.length!==1||t.supply!=='handcarry'||!this.ready(t))continue;
   const step=Math.min(dt,t.work-t.progress);t.progress+=step;t.used=t.amount*t.progress/t.work;for(const w of present)this.effort(w,dt);
   if(t.progress>=t.work-1e-6){t.progress=t.work;t.used=t.amount;t.done=true;t.supply='used';t.owner=null;for(const w of team){w.completed++;this.planned.delete(w.id);w.task=null;w.state='idle';w.path=[];}t.crew=[];}
  }
  if(!this.complete&&this.tasks.every(t=>t.done)){this.complete=true;this.log('房屋交付：材料已逐项计入建筑，剩余库存保留');}
 }
 workerPoint(t:Task,w:Worker):V3{
  if(t.label==='整理场地')return [-1,0,-4.8];
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
