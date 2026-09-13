import {writeFileSync,mkdirSync} from 'node:fs';
import {Simulation} from '../lib/construction/simulation.ts';
const sim=new Simulation(),tracks=[],events=[];
const add=(read)=>{const track={read,keys:[]};tracks.push(track);return track;};
for(const w of sim.workers)add(()=>[...w.pos,w.heading,w.phase,w.worked,w.timer]);
add(()=>[...sim.cartPos,sim.cartHeading,...sim.cart2Pos,sim.cart2Heading]);
add(()=>[...sim.crane.pos,sim.crane.elapsed,...sim.crane.from,sim.mixerAngle]);
for(const t of sim.tasks)add(()=>[t.progress]);
const sample=()=>{
 for(const track of tracks){const key=[sim.time,...track.read()],keys=track.keys;keys.push(key);
  if(keys.length<3)continue;
  const [a,b,c]=keys.slice(-3),f=(b[0]-a[0])/(c[0]-a[0]);
  if(b.slice(1).every((v,i)=>Math.abs(v-(a[i+1]+(c[i+1]-a[i+1])*f))<1e-7))keys.splice(keys.length-2,1);
 }
};
const discrete=()=>({complete:sim.complete,stock:sim.stock,events:sim.events,
 workers:sim.workers.map(w=>({state:w.state,task:w.task,completed:w.completed,timer:w.timer})),
 tasks:sim.tasks.map(t=>({owner:t.owner,driver:t.driver,done:t.done,supply:t.supply,crew:t.crew,mixed:t.mixed,padSlot:t.padSlot})),
 crane:{task:sim.crane.task,phase:sim.crane.phase,load:sim.crane.load,lifts:sim.crane.lifts}});
let previous={};
function capture(){const state=discrete(),changes={};
 for(const [key,value] of Object.entries(state)){
  if(key==='tasks'||key==='workers'){
   const delta=[];value.forEach((item,i)=>{if(key==='workers')delete item.timer;if(JSON.stringify(item)!==JSON.stringify(previous[key]?.[i]))delta.push([i,item]);});
   if(delta.length)changes[key]=delta;
  }else if(JSON.stringify(value)!==JSON.stringify(previous[key]))changes[key]=value;
 }
 if(Object.keys(changes).length)events.push([sim.time,structuredClone(changes)]);previous=structuredClone(state);
}
sample();capture();let last=-1;
for(let i=0;i<90000;i++){
 sim.advance(1/30);sample();capture();
 if(sim.stage!==last){last=sim.stage;console.log('Bake',Math.round(sim.time),last);}
 if(sim.complete&&sim.workers.every(w=>w.state==='finished'&&!w.path.length))break;
}
if(!sim.complete)throw Error('Playback did not finish');
mkdirSync('public/playback',{recursive:true});
const data={version:1,duration:sim.time,tracks:tracks.map(t=>t.keys.map(k=>k.map(v=>Number(v.toFixed(6))))),events};
writeFileSync('public/playback/house.json',JSON.stringify(data));
console.log({duration:sim.time,keys:tracks.reduce((n,t)=>n+t.keys.length,0),events:events.length,bytes:JSON.stringify(data).length});
