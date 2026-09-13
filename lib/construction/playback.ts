import {Simulation} from './simulation.ts';
import type {Worker,Task,CraneState} from './simulation.ts';

type Changes={complete?:boolean;stock?:Simulation['stock'];events?:string[];workers?:[number,Partial<Worker>][];tasks?:[number,Partial<Task>][];crane?:Partial<CraneState>};
export type Choreography={version:number;duration:number;tracks:number[][][];events:[number,Changes][]};
// Routes and right-of-way are baked offline. Runtime only samples keyframes;
// it never searches paths, checks collisions or negotiates worker movement.
export class Playback{
 private cursors:number[];private event=0;
 private sim:Simulation;private data:Choreography;
 constructor(sim:Simulation,data:Choreography){
  this.sim=sim;this.data=data;
  if(data.version!==1||data.tracks.length!==sim.tasks.length+7)throw Error('施工动画数据不匹配');
  this.cursors=data.tracks.map(()=>0);this.applyEvents();this.sample();
 }
 advance(dt:number){if(this.sim.paused)return;this.sim.time=Math.min(this.data.duration,this.sim.time+dt);this.applyEvents();this.sample();}
 private applyEvents(){
  while(this.event<this.data.events.length&&this.data.events[this.event][0]<=this.sim.time+1e-6){
   const [,change]=this.data.events[this.event++];
   const {workers,tasks,crane,...state}=change;Object.assign(this.sim,state);
   workers?.forEach(([i,value])=>Object.assign(this.sim.workers[i],value));
   tasks?.forEach(([i,value])=>Object.assign(this.sim.tasks[i],value));
   if(crane)Object.assign(this.sim.crane,crane);
  }
 }
 private values(index:number){
  const keys=this.data.tracks[index];let cursor=this.cursors[index];
  while(cursor+1<keys.length&&keys[cursor+1][0]<=this.sim.time)cursor++;
  this.cursors[index]=cursor;const a=keys[cursor],b=keys[cursor+1]??a;
  const f=b===a?0:Math.max(0,Math.min(1,(this.sim.time-a[0])/(b[0]-a[0])));
  return a.slice(1).map((value,i)=>value+(b[i+1]-value)*f);
 }
 private sample(){
  const s=this.sim;
  s.workers.forEach((w,i)=>{const v=this.values(i);w.pos=[v[0],v[1],v[2]];w.heading=v[3];w.phase=v[4];w.worked=v[5];w.timer=v[6];});
  const cart=this.values(5);s.cartPos=[cart[0],cart[1],cart[2]];s.cartHeading=cart[3];s.cart2Pos=[cart[4],cart[5],cart[6]];s.cart2Heading=cart[7];
  const crane=this.values(6);s.crane.pos=[crane[0],crane[1],crane[2]];s.crane.elapsed=crane[3];s.crane.from=[crane[4],crane[5],crane[6]];s.mixerAngle=crane[7];
  s.tasks.forEach((task,i)=>{task.progress=task.done?task.work:this.values(i+7)[0];task.used=task.amount*task.progress/task.work;});
 }
}
