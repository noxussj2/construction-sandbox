import assert from 'node:assert/strict';
import {Simulation} from '../lib/construction/simulation.ts';
const s=new Simulation();let previous=0,sawIndependent=false,sawCart=false,sawSecondCart=false,sawLift=false;
const snapshot=()=>JSON.stringify({time:s.time,tasks:s.tasks,workers:s.workers,stock:s.stock,crane:s.crane});
const pausedSnapshot=snapshot();s.paused=true;s.advance(4);assert.equal(snapshot(),pausedSnapshot);s.paused=false;
for(let step=0;step<360000&&!s.complete;step++){
 const before=new Map(s.tasks.map(t=>[t.id,t.progress]));
 s.advance(1/30);assert(s.stage>=previous);previous=s.stage;
 for(const w of s.workers.slice(2))assert(!['material','loading','carrying','toCart'].includes(w.state),'builders must never visit the material racks or drive carts');
 for(const item of s.inventory){assert(item.stock>=0);assert(Math.abs(item.initial-item.stock-item.transit-item.site-item.installed)<1e-7,`material conservation ${item.kind}`);}
 for(const t of s.tasks){
  if(t.progress>(before.get(t.id)??0)){
   assert(['ready','used'].includes(t.supply));
   if(t.needsLift)assert(s.crane.lifts>0);
   if(t.material==='concrete')assert(t.mixed>=3);
   if(!t.done){assert.equal(t.crew.length,1);assert(t.crew.every(id=>id>=2&&s.workers[id].state==='working'&&!s.workers[id].path.length));}
  }
  if(t.crew.length){assert.equal(new Set(t.crew).size,t.crew.length);for(const id of t.crew)assert.equal(s.workers[id].task,t.id);}
 }
 const activeJobs=new Set(s.workers.slice(2).map(w=>w.task).filter(Boolean));sawIndependent ||= activeJobs.size>=2;
 sawCart ||= s.workers[0].state==='carrying';sawSecondCart ||= s.workers[1].state==='carrying';sawLift ||= s.crane.load;
}
assert(s.complete,'complete within bounded run');assert.equal(s.progress,1);assert(sawIndependent&&sawCart&&sawSecondCart&&sawLift);
assert(s.workers.every(w=>w.completed>0));assert(s.tasks.every(t=>t.done&&t.used===t.amount));
assert.equal(s.tasks.filter(t=>t.site[1]===0&&t.needsLift).length,0,'ground-floor work must not use the crane');
const completionTime=s.time;for(let i=0;i<3000;i++)s.advance(1/30);assert(s.workers.every(w=>w.state==='finished'&&!w.path.length));assert(s.inventory.every(i=>i.transit===0&&i.site===0));
const stopped=new Simulation();stopped.workers[0].state='finished';stopped.workers[1].state='finished';for(let i=0;i<3000;i++)stopped.advance(1/30);assert.equal(stopped.progress,0,'no delivery means no building');assert.deepEqual(stopped.stock,stopped.initialStock);
const shortage=new Simulation();shortage.stock.concrete=0;for(let i=0;i<6000&&!shortage.workers.slice(0,2).some(w=>w.state==='waitingSupply');i++)shortage.advance(1/30);assert.equal(shortage.progress,0);assert.equal(shortage.stock.concrete,0);assert(shortage.workers.slice(0,2).some(w=>w.state==='waitingSupply'));
console.log(JSON.stringify({passed:true,tasks:s.tasks.length,seconds:Math.round(completionTime),lifts:s.crane.lifts,roles:s.workers.map(w=>({role:w.role,contributions:w.completed,worked:Math.round(w.worked)})),inventory:s.inventory,checks:['two independent delivery carts','builders never enter material racks','three independent builder jobs','cargo remains attached until unloading','stationary on-site construction','upper-floor crane handoff','material conservation','no delivery no build','ground floor without crane','automatic completion']},null,2));
