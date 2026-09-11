import { Simulation, STAGES } from './simulation';
type Tool={name:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean};execute:(input:unknown)=>unknown};
export function registerSimulationTools(sim:Simulation,notify:()=>void){
 const ctx=(document as Document & {modelContext?:{registerTool:(tool:Tool,options:{signal:AbortSignal})=>void|Promise<void>}}).modelContext;
 if(!ctx)return ()=>{};const lifecycle=new AbortController();
 const status=()=>({stage:STAGES[sim.stage]??'建造完成',progress:Math.round(sim.progress*100),paused:sim.paused,speed:sim.speed,time:Math.round(sim.time),inventory:sim.inventory,lifts:sim.crane.lifts,workers:sim.workers.map(w=>({id:w.id+1,role:w.role,state:w.state,task:sim.task(w)?.label??null}))});
 const tools:Tool[]=[{name:'read_construction_status',description:'读取当前房屋施工进度和五位工人的状态。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:status},{name:'set_construction_playback',description:'设置与页面控制栏一致的暂停状态或播放速度。不会重置施工。',inputSchema:{type:'object',properties:{paused:{type:'boolean'},speed:{type:'number',enum:[1,2,4]}},additionalProperties:false},annotations:{readOnlyHint:false},execute:(input)=>{if(!input||typeof input!=='object'||Array.isArray(input))throw Error('参数必须是对象');const data=input as {paused?:boolean;speed?:number};if(Object.keys(data).some(k=>k!=='paused'&&k!=='speed')||(data.paused!==undefined&&typeof data.paused!=='boolean')||(data.speed!==undefined&&![1,2,4].includes(data.speed)))throw Error('无效的暂停状态或速度');if(data.paused!==undefined)sim.paused=data.paused;if(data.speed!==undefined)sim.speed=data.speed;notify();return status();}}];
 for(const t of tools){try{Promise.resolve(ctx.registerTool(t,{signal:lifecycle.signal})).catch(console.warn);}catch(e){console.warn(e);}}
 return ()=>lifecycle.abort();
}
