// Only the observer moves: the house centre stays the fixed viewing target.
export class Viewpoint{
 readonly target:[number,number,number]=[0,3,0];
 // Start almost in front, slightly to the west, with both floors in view.
 readonly radius=22;
 azimuth=-2.95;elevation=.43;
 private manualHold=0;
 get position():[number,number,number]{
  const horizontal=this.radius*Math.cos(this.elevation);
  return [Math.sin(this.azimuth)*horizontal,this.target[1]+this.radius*Math.sin(this.elevation),Math.cos(this.azimuth)*horizontal];
 }
 look(dx:number,dy:number){
  this.manualHold=3;
  this.azimuth-=dx*.004;
  this.elevation=Math.max(-.035,Math.min(.85,this.elevation+dy*.004));
 }
 walk(metres:number){if(metres!==0){this.manualHold=3;this.azimuth+=metres/this.radius;}}
 update(dt:number,interacting=false){
  if(interacting){this.manualHold=3;return;}
  const before=this.manualHold;this.manualHold=Math.max(0,before-dt);
  const elapsed=Math.max(0,dt-before);
  // One revolution in two minutes, independent of construction playback speed.
  this.azimuth+=elapsed*Math.PI/60;
 }
 reset(){this.azimuth=-2.95;this.elevation=.43;this.manualHold=3;}
}
