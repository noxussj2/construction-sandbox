import assert from 'node:assert/strict';
import {Simulation} from '../lib/construction/simulation.ts';
import {siteSolids,intersects,segmentClear,CART_RADIUS,LANDINGS,STAIRS,supported} from '../lib/construction/layout.ts';

const s=new Simulation();let frames=0,lastProgress=0,stalled=0;
// Regressions: a cart cannot go through stock, climb stairs, or leave the site.
assert(!segmentClear([-16,0,-7.5],[-9,0,-7.5],CART_RADIUS));
assert.throws(()=>s.route([-9.5,0,-9],LANDINGS[0],CART_RADIUS));
assert(!segmentClear([17,0,0],[19,0,0],CART_RADIUS));
// Old lower-floor drop coordinates would send the cable through the upper deck.
assert(siteSolids.some(b=>intersects([0,4.8,-4.5],.05,7,b)));
for(const p of LANDINGS)assert(!siteSolids.some(b=>intersects([p[0],p[1]+.3,p[2]],.5,11-p[1],b)));
const platformSurfaces=siteSolids.filter(b=>['walk-deck','receiving-deck','receiving-bridge'].includes(b.id));
for(const a of platformSurfaces)for(const b of platformSurfaces)if(a!==b&&Math.abs(a.pos[1]-b.pos[1])<.001&&a.id!==b.id){const overlapX=Math.min(a.pos[0]+a.size[0]/2,b.pos[0]+b.size[0]/2)-Math.max(a.pos[0]-a.size[0]/2,b.pos[0]-b.size[0]/2),overlapZ=Math.min(a.pos[2]+a.size[2]/2,b.pos[2]+b.size[2]/2)-Math.max(a.pos[2]-a.size[2]/2,b.pos[2]-b.size[2]/2);assert(overlapX<=1e-6||overlapZ<=1e-6,`${a.id} coplanar-overlaps ${b.id}`);}
function onStairs(p){return STAIRS.slice(1).some((b,i)=>{const a=STAIRS[i],d=b.map((v,k)=>v-a[k]);const l=d.reduce((n,v)=>n+v*v,0);const t=Math.max(0,Math.min(1,d.reduce((n,v,k)=>n+v*(p[k]-a[k]),0)/l));return Math.hypot(...p.map((v,k)=>v-a[k]-t*d[k]))<.025;});}
for(;frames<360000;frames++){
 const carts=[[...s.cartPos],[...s.cart2Pos]],before=s.workers.map(w=>[...w.pos]);s.advance(1/30);
 const built=s.tasks.filter(t=>t.progress>0).flatMap(t=>t.parts.map(p=>{const angle=p.rotation?.[0]??0,c=Math.abs(Math.cos(angle)),n=Math.abs(Math.sin(angle));return {id:p.id,pos:p.pos,size:[p.size[0],p.size[1]*c+p.size[2]*n,p.size[2]*c+p.size[1]*n],color:''};}));
 for(const [i,p] of [s.cartPos,s.cart2Pos].entries()){assert.equal(p[1],0,'cart may never climb or float');assert(segmentClear(carts[i],p,CART_RADIUS),`swept cart ${i} footprint clipped a solid`);}
 assert(Math.hypot(s.cartPos[0]-s.cart2Pos[0],s.cartPos[2]-s.cart2Pos[2])>=2.05,'delivery carts overlap');
 for(const w of s.workers){
  const hit=siteSolids.find(b=>intersects(w.pos,.33,1.32,b,b.surface?.3:.18));
  assert(!hit,`worker ${w.id}: ${hit?.id} at ${s.time} ${w.pos}`);
  const builtHit=built.find(b=>intersects(w.pos,.33,1.32,b));
  assert(!builtHit,`worker ${w.id} overlaps ${builtHit?.id} at ${s.time}: ${w.pos}`);
  for(const [i,p] of [s.cartPos,s.cart2Pos].entries())assert(!intersects(w.pos,.33,1.32,{id:'cart-'+i,size:[1.1,1.25,1.2],pos:[p[0],.7,p[2]],color:'',rotation:i?s.cart2Heading:s.cartHeading}),`worker ${w.id} overlaps cart ${i} at ${s.time}: ${w.pos} / ${p}`);
  assert(supported(w.pos,.3)||onStairs(w.pos),`worker ${w.id} left a supported surface: ${w.pos}`);
  if(Math.abs(w.pos[1]-before[w.id][1])<.001)assert(segmentClear(before[w.id],w.pos,.3,1.32),`worker swept through a post: ${w.id} at ${s.time}: ${before[w.id]} -> ${w.pos}`);
  for(const other of s.workers.slice(w.id+1))if(Math.abs(w.pos[1]-other.pos[1])<1.25)assert(Math.hypot(w.pos[0]-other.pos[0],w.pos[2]-other.pos[2])>=.66-1e-5,`worker overlap ${w.id}/${other.id} at ${s.time}: ${w.pos} / ${other.pos}`);
 }
 for(const item of s.inventory)assert(Math.abs(item.initial-item.stock-item.transit-item.site-item.installed)<1e-6,'material conservation');
 for(const t of s.tasks.filter(t=>['ready','atLift','landed'].includes(t.supply))){
  const p=s.cargoPoint(t),height=t.material==='fittings'?(t.label.includes('门框')?1.06:.74):.27*t.amount;
  const hit=siteSolids.find(b=>b.id!=='building-reservation'&&intersects(p,.42,height,b));
  assert(!hit,`cargo ${t.id}/${t.supply} clips ${hit?.id} at ${p}`);
  const buildingHit=built.find(b=>intersects(p,.42,height,b));assert(!buildingHit,`cargo ${t.id} overlaps building ${buildingHit?.id}`);
  const load={id:'load',size:[.78,height,.44],pos:[p[0],p[1]+height/2,p[2]],color:''};
  for(const w of s.workers)if(!(t.supply==='ready'&&w.task===t.id&&['fetching','pickupLoading'].includes(w.state)))assert(!intersects(w.pos,.3,1.35,load),`load intersects worker ${w.id}/${w.state}/${w.task} (${t.id}, ${t.supply}) at ${s.time}: ${w.pos} / ${p}`);
 }
 if(frames%10000===0)console.log('Replay',Math.round(s.time),s.tasks.filter(t=>t.done).length,'/',s.tasks.length);
 if(frames%1000===0){stalled=s.progress===lastProgress?stalled+1:0;lastProgress=s.progress;assert(stalled<6,`stalled: ${s.routeError}; ${JSON.stringify(s.workers)}`);}
 if(s.complete&&s.workers.every(w=>w.state==='finished'&&!w.path.length))break;
}
assert(s.complete&&frames<360000,'full construction and return must finish');
console.log(JSON.stringify({passed:true,frames,tasks:s.tasks.length,lifts:s.crane.lifts,seconds:Math.round(s.time),checks:['swept cart volume','ground-only vehicles','worker solids','worker separation','supported floors and stairs','clear vertical landing shafts','material conservation','no deadlock through completion']},null,2));
