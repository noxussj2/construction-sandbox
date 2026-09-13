import assert from 'node:assert/strict';
import {Simulation} from '../lib/construction/simulation.ts';
const s=new Simulation();let previous=0,sawIndependent=false,sawCart=false,sawSecondCart=false,sawLift=false,sawPrefetch=false;const inactive=[0,0,0,0,0],supplyWait=[0,0,0];let observed=0;const upperStages=new Set();const driverLocks=new Map();
const trips=new Map(),deliveries=[0,0],emptyReturnSeconds=[0,0],loadedWaitSeconds=[0,0];let simultaneousLoadedFrames=0,lastDeliveryTime=0;
const snapshot=()=>JSON.stringify({time:s.time,tasks:s.tasks,workers:s.workers,stock:s.stock,crane:s.crane});
const pausedSnapshot=snapshot();s.paused=true;s.advance(4);assert.equal(snapshot(),pausedSnapshot);s.paused=false;
for(let step=0;step<360000&&!s.complete;step++){
 const previousWorkers=s.workers.map(w=>({pos:[...w.pos],state:w.state,heading:w.heading}));
 const previousCarts=[[...s.cartPos],[...s.cart2Pos]];
 const before=new Map(s.tasks.map(t=>[t.id,t.progress]));
 const supplyBefore=new Map(s.tasks.map(t=>[t.id,t.supply]));
 const cargoBefore=new Map(s.tasks.filter(t=>t.supply==='cart').map(t=>[t.id,s.cargoPoint(t)]));
 s.advance(1/30);assert(s.stage>=previous);previous=s.stage;
 for(const w of s.workers.slice(0,2)){
  const t=s.task(w),cart=s.cartOf(w.id);
  if(w.state==='carrying'||w.state==='unloading'){
   assert(t&&t.supply==='cart'&&t.driver===w.id,`empty outbound cart ${w.id}`);
   const end=w.path.at(-1);if(end)assert.deepEqual(end,s.cartDropPoint(t),'loaded route must end at its actual delivery');
  }
  if(w.state==='material'){
   assert(t&&t.supply==='collecting','empty travel must have a real stock order');
   assert(w.path.at(-1)?.[0]<-9,'empty cart may only travel toward stock');
   emptyReturnSeconds[w.id]+=1/30;
  }
  if(w.state==='returnCart'){
   assert(!t,'empty return must not abandon cargo');assert(w.path.at(-1)?.[0]<-9,'no empty outbound loop');
   emptyReturnSeconds[w.id]+=1/30;
  }
  if(t?.supply==='cart'&&w.state!=='unloading')assert.deepEqual(s.cargoPoint(t),[cart[0],.51,cart[2]],'cargo must stay attached to its vehicle');
  if(w.state==='waitingSupply'&&t?.supply==='cart'){
   assert(cart[0]<-9,'a blocked loaded vehicle must remain in the stock aisle');loadedWaitSeconds[w.id]+=1/30;
  }
 }
 if(s.workers.slice(0,2).every(w=>s.task(w)?.supply==='cart'))simultaneousLoadedFrames++;
 for(const t of s.tasks){
  const old=supplyBefore.get(t.id);
  if(old==='cart'&&['cart','ready','atLift'].includes(t.supply))assert(Math.hypot(...s.cargoPoint(t).map((v,i)=>v-cargoBefore.get(t.id)[i]))<.4,'cargo must not jump from cart to destination');
  if(old==='collecting'&&t.supply==='cart'){assert(!trips.has(t.id),'a batch must be loaded only once');trips.set(t.id,{driver:t.driver,loaded:s.time,delivered:null});}
  if(old==='cart'&&['ready','atLift'].includes(t.supply)){
   const trip=trips.get(t.id);assert(trip&&!trip.delivered,'delivery requires a unique prior pickup');
   assert(Math.hypot(...s.cartOf(t.driver).map((v,i)=>v-s.cartDropPoint(t)[i]))<.05,'unload only at destination');
   trip.delivered=s.time;deliveries[t.driver]++;lastDeliveryTime=s.time;
  }
  if(t.progress>(before.get(t.id)??0))assert(trips.get(t.id)?.delivered,'no construction before physical delivery');
 }
 if(s.tasks.some(t=>['stock','collecting','cart','atLift','lifting'].includes(t.supply)))assert(s.time-lastDeliveryTime<180,'logistics stalled for three simulated minutes');
 if(s.progress<.98){observed++;for(const w of s.workers)if(!w.path.length&&['idle','waiting'].includes(w.state))inactive[w.id]++;}
 if(s.progress<.98)for(const w of s.workers.slice(2))if(w.state==='waitingSupply'&&!w.path.length)supplyWait[w.id-2]++;
 for(const w of s.workers.slice(2))assert(!['material','loading','carrying','toCart'].includes(w.state),'builders must never visit the material racks or drive carts');
 for(const w of s.workers){const p=previousWorkers[w.id],distance=w.id<2?Math.hypot((w.id?s.cart2Pos:s.cartPos)[0]-previousCarts[w.id][0],(w.id?s.cart2Pos:s.cartPos)[2]-previousCarts[w.id][2]):Math.hypot(...w.pos.map((v,i)=>v-p.pos[i]));assert(distance<=(w.id<2?5:1.8)/30+.02,`1× movement speed exceeded for worker ${w.id}: ${distance}`);}
 for(const item of s.inventory){assert(item.stock>=0);assert(Math.abs(item.initial-item.stock-item.transit-item.site-item.installed)<1e-7,`material conservation ${item.kind}`);}
 for(const t of s.tasks){
  if(t.driver!==null){if(driverLocks.has(t.id))assert.equal(t.driver,driverLocks.get(t.id),'a claimed delivery must never be reassigned');else driverLocks.set(t.id,t.driver);}
  if(t.owner!==null)assert.equal(t.owner,s.assignedBuilder(t),'builder ownership must never change');
  if(t.progress>(before.get(t.id)??0)){
   assert(t.progress-before.get(t.id)<=1/30+1e-8,'installation speed must not increase');
   assert(s.dependencies(t).every(a=>a.done),'construction must respect structural predecessors');
   assert(['handcarry','used'].includes(t.supply));
   if(t.needsLift)assert(s.crane.lifts>0);
   if(t.material==='concrete')assert(t.mixed>=3);
   if(!t.done){assert.equal(t.crew.length,1);assert(t.crew.every(id=>id>=2&&s.workers[id].state==='working'&&!s.workers[id].path.length));}
  }
  if(t.crew.length){assert.equal(new Set(t.crew).size,t.crew.length);for(const id of t.crew)assert.equal(s.workers[id].task,t.id);}
 }
 const activeJobs=new Set(s.workers.slice(2).map(w=>w.task).filter(Boolean));sawIndependent ||= activeJobs.size>=2;
 sawCart ||= s.workers[0].state==='carrying';sawSecondCart ||= s.workers[1].state==='carrying';sawLift ||= s.crane.load;
 sawPrefetch ||= s.tasks.some(t=>t.stage>s.stage&&t.supply!=='stock');
 if([4,5,6].includes(s.stage)&&s.workers.slice(2).every(w=>w.pos[1]>.2))upperStages.add(s.stage);
}
const completionTime=s.time;assert(s.complete,'complete within bounded run');assert.equal(s.progress,1);assert(sawIndependent&&sawCart&&sawSecondCart&&sawLift);
assert.equal(trips.size,s.tasks.length);assert([...trips.values()].every(t=>t.delivered));assert(deliveries.every(n=>n>10));assert(simultaneousLoadedFrames>30,'both vehicles must carry real material concurrently');
console.log(JSON.stringify({deliveryAudit:{deliveries,uniqueBatches:trips.size,simultaneousLoadedSeconds:Math.round(simultaneousLoadedFrames/30),emptyReturnSeconds:emptyReturnSeconds.map(Math.round),loadedWaitSeconds:loadedWaitSeconds.map(Math.round)}},null,2));
assert(completionTime<1550,`construction must finish efficiently, got ${completionTime.toFixed(1)}s`);
assert(sawPrefetch,'logistics must pre-stage the next construction stage');
assert.deepEqual([...upperStages].sort(),[4,5,6],'all three builders must reach every upper construction stage');
assert.equal(s.tasks.length,79,'preserve every construction task');
assert.equal(Math.round(s.tasks.reduce((sum,t)=>sum+t.work,0)),510,'preserve total installation work');
assert(s.tasks.every(t=>t.work>=6),'construction time must remain visually balanced with delivery');
assert(s.workers.every(w=>w.completed>0));assert(s.tasks.every(t=>t.done&&t.used===t.amount));
assert.equal(s.tasks.filter(t=>t.site[1]===0&&t.needsLift).length,0,'ground-floor work must not use the crane');
for(let i=0;i<3000;i++)s.advance(1/30);assert(s.workers.every(w=>w.state==='finished'&&!w.path.length));assert(s.inventory.every(i=>i.transit===0&&i.site===0));
// Dependency regressions: frame structure carries the slab/roof; windows in
// independent bays must not hold up the next structural operation.
const flow=new Simulation();
for(const t of flow.tasks)t.done=true;
const beam=flow.tasks.find(t=>t.stage===1&&t.label==='连接横梁');
const supports=flow.dependencies(beam);assert.equal(supports.length,2);
supports[0].done=false;assert(!flow.ready(beam));supports[0].done=true;
const unrelatedColumn=flow.tasks.find(t=>t.stage===1&&t.label==='安装承重柱'&&!supports.includes(t));
unrelatedColumn.done=false;assert(flow.ready(beam));unrelatedColumn.done=true;
const window=flow.tasks.find(t=>t.stage===2&&t.label==='安装窗框与玻璃');
const wall=flow.dependencies(window)[0];wall.done=false;assert(!flow.ready(window));wall.done=true;
window.done=false;assert(flow.ready(flow.tasks.find(t=>t.stage===3)),'glazing must not block the supported slab');
assert(!flow.ready(flow.tasks.find(t=>t.label==='整理场地')),'cleanup must wait for every task');
window.done=true;
const frame=flow.tasks.find(t=>t.label==='搭建屋架');frame.done=false;
assert(!flow.ready(flow.tasks.find(t=>t.label==='铺设金属屋面')),'roof panels require their frame');
const stopped=new Simulation();stopped.workers[0].state='finished';stopped.workers[1].state='finished';for(let i=0;i<3000;i++)stopped.advance(1/30);assert.equal(stopped.progress,0,'no delivery means no building');assert.deepEqual(stopped.stock,stopped.initialStock);
const shortage=new Simulation();shortage.stock.concrete=0;for(let i=0;i<6000&&!shortage.workers.slice(0,2).some(w=>w.state==='waitingSupply');i++)shortage.advance(1/30);assert.equal(shortage.progress,0);assert.equal(shortage.stock.concrete,0);assert(shortage.workers.slice(0,2).some(w=>w.state==='waitingSupply'));
console.log(JSON.stringify({passed:true,tasks:s.tasks.length,seconds:Math.round(completionTime),lifts:s.crane.lifts,inactiveRatios:inactive.map(n=>Number((n/observed).toFixed(4))),builderSupplyWaitRatios:supplyWait.map(n=>Number((n/observed).toFixed(4))),roles:s.workers.map(w=>({role:w.role,contributions:w.completed,worked:Math.round(w.worked)})),inventory:s.inventory,checks:['every outbound trip carries an assigned batch','each batch loaded and delivered exactly once','empty travel only toward stock','both vehicles carry cargo concurrently','claimed deliveries never reassigned','cargo remains attached to its cart','unloading at actual destination','construction requires prior delivery','next-stage material prefetch','5-unit transport speed cap','builders never enter material racks','all builders reach upper stages','independent on-site builder jobs','upper-floor crane handoff','material conservation','completion under 1550 seconds','no delivery no build','ground floor without crane','automatic completion']},null,2));
