import assert from 'node:assert/strict';
import {Simulation} from '../lib/construction/simulation.ts';
const s=new Simulation();let previous=0,sawRest=false,sawResume=false,sawPair=false,sawCart=false,sawLift=false,sawMix=false,checkedPartner=false;
const restTasks=new Map();
const snapshot=()=>JSON.stringify({time:s.time,tasks:s.tasks,workers:s.workers,stock:s.stock,crane:s.crane});
const pausedSnapshot=snapshot();s.paused=true;s.advance(4);assert.equal(snapshot(),pausedSnapshot);s.paused=false;
for(let step=0;step<360000&&!s.complete;step++){
 const before=new Map(s.tasks.map(t=>[t.id,t.progress]));
 s.advance(1/30);assert(s.stage>=previous);previous=s.stage;
 for(const item of s.inventory){assert(item.stock>=0);assert(Math.abs(item.initial-item.stock-item.transit-item.site-item.installed)<1e-7,`material conservation ${item.kind}`);}
 for(const t of s.tasks){
  if(t.progress>(before.get(t.id)??0)){
   assert(['ready','used'].includes(t.supply));
   if(t.needsLift)assert(s.crane.lifts>0);
   if(t.material==='concrete')assert(t.mixed>=3);
   if(t.heavy&&!t.done){assert.equal(t.crew.length,2);assert(t.crew.every(id=>['working','restTrip'].includes(s.workers[id].state)));sawPair=true;}
  }
  if(t.crew.length){assert.equal(new Set(t.crew).size,t.crew.length);for(const id of t.crew)assert.equal(s.workers[id].task,t.id);}
 }
 for(const w of s.workers){if(w.state==='resting'){sawRest=true;if(w.id>=2&&w.task)restTasks.set(w.id,w.task);}if(w.state==='working'&&restTasks.get(w.id)===w.task)sawResume=true;}
 sawCart ||= s.tasks.some(t=>t.supply==='cart');sawLift ||= s.crane.load;sawMix ||= s.workers[1].state==='mixing';
 if(!checkedPartner){const t=s.tasks.find(t=>t.heavy&&!t.done&&t.progress>0&&t.crew.length===2&&t.crew.every(id=>s.workers[id].state==='working'));if(t){const w=s.workers[t.crew[1]],p=t.progress;w.state='resting';w.restLeft=3;for(let i=0;i<30;i++)s.advance(1/30);assert.equal(t.progress,p,'heavy installation must stop without its partner');checkedPartner=true;}}
}
assert(s.complete,'complete within bounded run');assert.equal(s.progress,1);assert(sawRest&&sawResume&&sawPair&&sawCart&&sawLift&&sawMix&&checkedPartner);
assert(s.workers.every(w=>w.completed>0));assert(s.tasks.every(t=>t.done&&t.used===t.amount));
assert(s.workers.every(w=>w.assisted>0),'every worker must contribute to the shared preparation queue');
assert(s.tasks.some(t=>!t.heavy&&t.prepared>0),'preparation must benefit ordinary work too');
const completionTime=s.time;for(let i=0;i<3000;i++)s.advance(1/30);assert(s.workers.every(w=>w.state==='finished'&&!w.path.length&&w.pos[1]===0));assert(s.inventory.every(i=>i.transit===0&&i.site===0));
const stopped=new Simulation();stopped.workers[0].state='resting';stopped.workers[0].restLeft=99999;for(let i=0;i<3000;i++)stopped.advance(1/30);assert.equal(stopped.progress,0,'no delivery means no building');assert.deepEqual(stopped.stock,stopped.initialStock);
const noOperator=new Simulation();noOperator.workers[1].state='resting';noOperator.workers[1].restLeft=99999;for(let i=0;i<3000;i++)noOperator.advance(1/30);assert.equal(noOperator.progress,0,'unmixed foundation material cannot be installed');
const shortage=new Simulation();shortage.stock.concrete=0;for(let i=0;i<1000;i++)shortage.advance(1/30);assert.equal(shortage.progress,0);assert.equal(shortage.stock.concrete,0);assert.equal(shortage.workers[0].state,'waitingSupply');
console.log(JSON.stringify({passed:true,tasks:s.tasks.length,seconds:Math.round(completionTime),lifts:s.crane.lifts,roles:s.workers.map(w=>({role:w.role,contributions:w.completed})),inventory:s.inventory,checks:['finite stock','material conservation','no delivery no build','mixing dependency','two-person installation','rest and resume','pause','shortage waits','automatic completion']},null,2));
