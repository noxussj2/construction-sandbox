import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Simulation} from '../lib/construction/simulation.ts';
import {Playback} from '../lib/construction/playback.ts';
const data=JSON.parse(readFileSync('public/playback/house.json','utf8'));
const sim=new Simulation(),playback=new Playback(sim,data);
// Playback must never invoke the offline planner.
sim.advance=sim.route=sim.move=()=>{throw Error('Runtime planning is forbidden');};
for(let frame=0;frame<200000&&!sim.complete;frame++){
 const previous=sim.workers.map(w=>[...w.pos]),carts=[[...sim.cartPos],[...sim.cart2Pos]];
 playback.advance(1/120);
 sim.workers.slice(2).forEach((w,i)=>assert(Math.hypot(...w.pos.map((v,k)=>v-previous[i+2][k]))<=1.8/120+.00002,'continuous worker interpolation respects walking speed'));
 [sim.cartPos,sim.cart2Pos].forEach((p,i)=>assert(Math.hypot(...p.map((v,k)=>v-carts[i][k]))<=5/120+.00002,'continuous cart interpolation respects delivery speed'));
 if(frame%120===0)for(const item of sim.inventory)assert(Math.abs(item.initial-item.stock-item.transit-item.site-item.installed)<1e-6,JSON.stringify({time:sim.time,item}));
}
assert(sim.complete);assert(Math.abs(sim.time-1476.2)<.1);assert.equal(sim.progress,1);
const time=sim.time;sim.paused=true;playback.advance(10);assert.equal(sim.time,time);
const reset=new Simulation();new Playback(reset,data);assert.equal(reset.time,0);assert.equal(reset.progress,0);
console.log({passed:true,seconds:time,checks:['120 Hz continuous interpolation','unchanged speed caps','no runtime planning','material conservation','completion','pause','reset']});
