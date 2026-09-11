// Shared physical geometry: both rendering and navigation consume these boxes.
export type Vec3 = [number, number, number];
export type Solid = { id:string; size:Vec3; pos:Vec3; color:string; surface?:boolean; obstacle?:boolean; rotation?:number };
export const PAD:Vec3=[-5.8,0,-8.2];
export const GROUND_BAY:Vec3=[10,0,5];
export const MIXER:Vec3=[12,0,5];
export const CONTROL:Vec3=[-4.8,0,6.8];
export const LANDINGS:Vec3[]=[[-2,3.3,-6.5],[2,6.2,-8]];
export const STAIRS:Vec3[]=[[7,0,-4.85],[7,1.65,0],[7,1.65,.5],[8.3,1.65,.5],[8.3,3.3,-4.35],[8.3,3.3,-4.85],[7,3.3,-4.85],[7,4.75,0],[7,4.75,.5],[8.3,4.75,.5],[8.3,6.2,-4.35],[8.3,6.2,-4.85],[7,6.2,-4.85]];
export const RADIUS=.38;
// A conservative swept disk contains the cart AND the worker behind its handle,
// including the entire assembly while turning. Cart coordinates are its centre.
export const CART_RADIUS=1.5;
export const STOCK_Z=[-7.5,-4.5,-1.5,1.5,4.5,7.5];
export const siteSolids:Solid[]=[];
function solid(id:string,size:Vec3,pos:Vec3,color:string,surface=false,obstacle=true){siteSolids.push({id,size,pos,color,surface,obstacle});}
for(let i=0;i<6;i++){
 solid(`pallet-${i}`,[3.2,.15,2.15],[-13,.17,STOCK_Z[i]],'#806743');
 // Full-stock envelope remains reserved as the stacks empty.
 solid(`stock-envelope-${i}`,[3.2,1.8,2.15],[-13,1,STOCK_Z[i]],'invisible');
}
solid('building-reservation',[9.6,8,7.7],[0,4,0],'invisible');
solid('office',[4,2.2,2.4],[-3,1.2,9.3],'#647e73');
solid('office-roof',[4.25,.17,2.65],[-3,2.4,9.3],'#a9b8a3');
solid('crane-base',[2,.35,2],[-6.6,.27,5.3],'#a6a899');
solid('crane-mast',[.95,11.8,.95],[-6.6,5.9,5.3],'invisible');
solid('mixer-envelope',[1.1,1.3,1.3],[12,.7,5],'invisible');
solid('control',[.85,.68,.5],[CONTROL[0],.44,CONTROL[2]+.8],'#587969');
for(const x of [9.5,12])for(const z of [-6.5,-2.5])solid('shelter-post',[.1,2.5,.1],[x,1.3,z],'#e1ddc6');
for(let i=0;i<8;i++)solid('shelter-roof',[2.8,.12,.53],[10.75,2.57,-6.4+i*.53],i%2?'#d9d7bd':'#557b6b');
solid('bench',[.5,.55,4.5],[11.15,.3,-4.5],'#9b714b');
for(let i=0;i<5;i++)solid(`prep-bench-${i}`,[.55,.7,.75],[14.25,.45,-8+i*1.2],'#816347');
for(const [i,[x,z]] of [[-4,-6],[-7,4],[4,-6],[5,-7]].entries())solid(`cone-${i}`,[.48,.7,.48],[x,.4,z],'invisible');
solid('toolbox',[.7,.45,.5],[-7,.35,-5],'#45665c');
// Decks are wider than two workers; all walk edges are actual supported surfaces.
for(const y of [3.3,6.2]){
 for(const z of [-4.5,4.5])solid('walk-deck',[12.4,.14,1.8],[0,y-.07,z],'#aa9270',true);
 for(const x of [-5.3,5.3])solid('walk-deck',[2.25,.14,9],[x,y-.07,0],'#aa9270',true);
 solid('stair-bridge',[3,.14,1.4],[7.1,y-.07,-4.825],'#aa9270',true);
 for(const x of [-6.35,6.35])for(const z of [-5.35,0,5.35])solid('scaffold-post',[.07,y+.95,.07],[x,(y+.95)/2,z],'#6a827b');
 for(const z of [-5.35,5.35])for(const x of [-4,0,4])solid('scaffold-post',[.07,y+.95,.07],[x,(y+.95)/2,z],'#6a827b');
 solid('walk-rail',[.05,.05,10.7],[-6.35,y+.85,0],'#6a827b');
 solid('walk-rail',[.05,.05,8.7],[6.35,y+.85,1],'#6a827b');
 solid('walk-rail',[12.7,.05,.05],[0,y+.85,5.35],'#6a827b');
 // Front railing openings match the receiving bridge at this level.
 const opening=y===3.3?-2:2;
 for(const [a,b] of [[-6.35,opening-1.4],[opening+1.4,6.35]])solid('walk-rail',[b-a,.05,.05],[(a+b)/2,y+.85,-5.35],'#6a827b');
}
for(const [x,y,z] of LANDINGS){
 solid('receiving-deck',[3.2,.14,2],[x,y-.07,z],'#c5a169',true);
 solid('receiving-bridge',[2.8,.14,-4.5-z],[x,y-.07,(z-4.5)/2],'#aa9270',true);
 for(const side of [-1,1]){
  solid('receiving-rail',[.06,.06,-5.35-z],[x+side*1.35,y+.85,(z-5.35)/2],'#6a827b');
  solid('receiving-post',[.08,y,.08],[x+side*1.5,y/2,z-.9],'#6a827b');
 }
}
for(const [bottom,height] of [[0,3.3],[3.3,2.9]]){
 for(let i=0;i<16;i++){
  const t=(i+1)/16;
  solid('stair-tread',[1.15,.14,.31],[7,bottom+t*height/2-.07,-4.85+t*4.85],'#9d967e',true);
  solid('stair-tread',[1.15,.14,.31],[8.3,bottom+height/2+t*height/2-.07,.5-t*4.85],'#9d967e',true);
 }
 solid('stair-landing',[2.45,.14,1.2],[7.65,bottom+height/2-.07,.6],'#aa9270',true);
}
export function intersects(p:Vec3,radius:number,height:number,b:Solid,stepHeight=.18){
 if(b.rotation){const x=p[0]-b.pos[0],z=p[2]-b.pos[2],c=Math.cos(b.rotation),s=Math.sin(b.rotation);p=[b.pos[0]+c*x-s*z,p[1],b.pos[2]+s*x+c*z];}
 const bottom=b.pos[1]-b.size[1]/2,top=b.pos[1]+b.size[1]/2;
 if(top<=p[1]+stepHeight||bottom>=p[1]+height)return false;
 const dx=Math.max(Math.abs(p[0]-b.pos[0])-b.size[0]/2,0),dz=Math.max(Math.abs(p[2]-b.pos[2])-b.size[2]/2,0);
 return dx*dx+dz*dz<radius*radius-1e-8;
}
export function clearAt(p:Vec3,radius=RADIUS,height=1.4,extra:Solid[]=[]){
 if(Math.abs(p[0])+radius>18||Math.abs(p[2])+radius>13.5)return false;
 return ![...siteSolids,...extra].some(b=>b.obstacle!==false&&intersects(p,radius,height,b));
}
export function supported(p:Vec3,radius=RADIUS){
 if(p[1]<.2)return true;
 if(radius<=RADIUS&&STAIRS.slice(1).some((b,i)=>{const a=STAIRS[i],d=b.map((v,k)=>v-a[k]),length=d.reduce((n,v)=>n+v*v,0),t=Math.max(0,Math.min(1,d.reduce((n,v,k)=>n+v*(p[k]-a[k]),0)/length));return Math.hypot(...p.map((v,k)=>v-a[k]-t*d[k]))<.025;}))return true;
 return [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]].every(([dx,dz])=>siteSolids.some(b=>b.surface&&b.id!=='stair-tread'&&Math.abs(b.pos[1]+b.size[1]/2-p[1])<.05&&Math.abs(p[0]+dx-b.pos[0])<=b.size[0]/2+.001&&Math.abs(p[2]+dz-b.pos[2])<=b.size[2]/2+.001));
}
export function segmentClear(a:Vec3,b:Vec3,radius=RADIUS,height=1.4,checkSupport=true,extra:Solid[]=[]){
 if([a,b].some(p=>Math.abs(p[0])+radius>18||Math.abs(p[2])+radius>13.5))return false;
 // Slab test of the swept body, not occasional point samples (which can miss a post).
 for(const solid of [...siteSolids,...extra]){
  const local=(p:Vec3):Vec3=>{if(!solid.rotation)return p;const x=p[0]-solid.pos[0],z=p[2]-solid.pos[2],c=Math.cos(solid.rotation),s=Math.sin(solid.rotation);return [solid.pos[0]+c*x-s*z,p[1],solid.pos[2]+s*x+c*z];};
  const from=local(a),to=local(b);
  let lo=0,hi=1;const min=[solid.pos[0]-solid.size[0]/2-radius,solid.pos[1]-solid.size[1]/2-height,solid.pos[2]-solid.size[2]/2-radius];
  const stepHeight=checkSupport&&radius<=RADIUS&&solid.surface?.3:.18;
  const max=[solid.pos[0]+solid.size[0]/2+radius,solid.pos[1]+solid.size[1]/2-stepHeight,solid.pos[2]+solid.size[2]/2+radius];
  for(let axis=0;axis<3;axis++){const delta=to[axis]-from[axis];if(Math.abs(delta)<1e-8){if(from[axis]<=min[axis]+1e-7||from[axis]>=max[axis]-1e-7){lo=2;break;}}else{const t1=(min[axis]-from[axis])/delta,t2=(max[axis]-from[axis])/delta;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));}}
  if(lo<hi-1e-8&&hi>0&&lo<1)return false;
 }
 // The slab sweep already covers every solid continuously; sampling it again
 // adds no safety. Only floor support needs discrete footprint samples.
 if(!checkSupport||(a[1]<.2&&b[1]<.2))return true;
 const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[2]-a[2])/.04));
 for(let i=0;i<=n;i++){const t=i/n,p:Vec3=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];if(!supported(p,radius))return false;}return true;
}
// A* is restricted to physical ground/deck surfaces; no diagonal corner cutting.
export function floorRoute(a:Vec3,b:Vec3,radius=RADIUS,extra:Solid[]=[]):Vec3[]{
 const height=radius>.4&&radius<CART_RADIUS?2.65:1.4;
 const clear=(p:Vec3,q:Vec3)=>segmentClear(p,q,radius,height,true,extra);
 if(clear(a,b))return [[...b]];
 const approaches:Vec3[]=[.9,1.8].flatMap(d=>[[b[0],b[1],b[2]-d],[b[0],b[1],b[2]+d],[b[0]-d,b[1],b[2]],[b[0]+d,b[1],b[2]]] as Vec3[]).filter(q=>clear(q,b));
 for(const q of approaches)if(clear(a,q))return [q,[...b]];
 // Exact deck/door centres avoid quantising a narrow, valid entrance away.
 if(a[1]>.2){
  const y=a[1],nodes:Vec3[]=[a,b,[-5.5,y,-4.5],[-5.5,y,4.5],[5.5,y,4.5],[5.5,y,-4.5],[5.8,y,-4.825],[7,y,-4.825],[7,y,-4.85],...LANDINGS.filter(p=>Math.abs(p[1]-y)<.05).flatMap(p=>[p,[p[0],y,-4.5] as Vec3])];
  const queue=[0],previous=new Map<number,number>([[0,-1]]);
  while(queue.length){const i=queue.shift()!;for(let j=1;j<nodes.length;j++){if(previous.has(j)||!clear(nodes[i],nodes[j]))continue;previous.set(j,i);if(j===1){const result:Vec3[]=[];let k=1;while(k!==0){result.unshift([...nodes[k]]);k=previous.get(k)!;}return result;}queue.push(j);}}
 }
 const step=.3,y=a[1],key=(x:number,z:number)=>`${x},${z}`;
 const start=[0,0],end=[Math.round((b[0]-a[0])/step),Math.round((b[2]-a[2])/step)];
 const point=(x:number,z:number):Vec3=>[a[0]+x*step,y,a[2]+z*step];
 type Node={x:number;z:number;g:number;f:number;parent?:Node};
 const open:Node[]=[],cost=new Map<string,number>();
 for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){const x=start[0]+dx,z=start[1]+dz,p=point(x,z);if(clear(a,p)){const g=Math.hypot(p[0]-a[0],p[2]-a[2]);open.push({x,z,g,f:g+Math.hypot(p[0]-b[0],p[2]-b[2])});cost.set(key(x,z),g);}}
 for(let count=0;open.length&&count<30000;count++){
  let best=0;for(let i=1;i<open.length;i++)if(open[i].f<open[best].f)best=i;const node=open.splice(best,1)[0],p=point(node.x,node.z);
  if(node.g>(cost.get(key(node.x,node.z))??Infinity)+1e-8)continue;
  const near=Math.hypot(node.x-end[0],node.z-end[1])<9;
  const approach=near?approaches.find(q=>clear(p,q)):undefined;
  if(near&&(clear(p,b)||approach)){
   const route:Vec3[]=clear(p,b)?[[...b]]:[approach!,[...b]];let n:Node|undefined=node;while(n){route.unshift(point(n.x,n.z));n=n.parent;}
   const compact:Vec3[]=[];let previous=a;while(route.length){let i=route.length-1;while(i>0&&!clear(previous,route[i]))i--;previous=route[i];compact.push(previous);route.splice(0,i+1);}return compact;
  }
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const x=node.x+dx,z=node.z+dz,next=point(x,z),g=node.g+step*Math.hypot(dx,dz);if(g>=(cost.get(key(x,z))??Infinity)-1e-8||!clear(p,next))continue;cost.set(key(x,z),g);open.push({x,z,g,f:g+Math.hypot(next[0]-b[0],next[2]-b[2]),parent:node});
  }
 }
 throw Error(`No supported clear route: ${a.join(',')} → ${b.join(',')} (radius ${radius})`);
}
