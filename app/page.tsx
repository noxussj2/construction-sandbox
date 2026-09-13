'use client';
import {useEffect,useRef,useState} from 'react';
import {Pause,Play,RotateCcw,Focus,HardHat} from 'lucide-react';
import {AlertDialog,AlertDialogTrigger,AlertDialogContent,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {Simulation} from '@/lib/construction/simulation';
import {registerSimulationTools} from '@/lib/construction/webmcp';
import type {Choreography} from '@/lib/construction/playback';
const clock=(seconds:number)=>`${Math.floor(seconds/60).toString().padStart(2,'0')}:${Math.floor(seconds%60).toString().padStart(2,'0')}`;
let choreography:Promise<Choreography>|undefined;
function loadChoreography(){return choreography??=fetch('/playback/house.json').then(response=>{if(!response.ok)throw Error('施工动画加载失败');return response.json() as Promise<Choreography>;}).catch(error=>{choreography=undefined;throw error;});}
export default function Home(){
 const host=useRef<HTMLDivElement>(null),fps=useRef<HTMLOutputElement>(null),sim=useRef<Simulation|null>(null);
 const world=useRef<{resetView:()=>void;dispose:()=>void}|null>(null);
 const [epoch,setEpoch]=useState(0),[,update]=useState(0),[ready,setReady]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  let gone=false;setReady(false);setError('');const s=new Simulation();sim.current=s;
  const unregister=registerSimulationTools(s,()=>update(v=>v+1));
  Promise.all([import('@/lib/construction/scene'),loadChoreography()]).then(([{createWorld},data])=>{
   if(gone||!host.current)return;
   world.current=createWorld(host.current,s,()=>update(v=>v+1),data,value=>{if(fps.current)fps.current.textContent=`${value} FPS`;});setReady(true);
  }).catch(e=>{if(gone)return;setError(e instanceof Error?e.message:'加载失败');console.error(e);});
  return()=>{gone=true;unregister();world.current?.dispose();world.current=null;};
 },[epoch]);
 const s=sim.current,paused=s?.paused??false,progress=Math.round((s?.progress??0)*100);
 return <main className="workbench">
  <div ref={host} className="scene" aria-label="固定距离自动环绕房屋，拖动可调整角度"/>
  <header className="minimal-header"><h1><HardHat size={22} strokeWidth={1.5}/>第五顶安全帽</h1><output ref={fps} aria-label="实时帧率" aria-live="off">— FPS</output></header>
  <p className="view-help">自动环视 · 拖动调整</p>
  <div className="minimal-progress" aria-label={`施工进度 ${progress}%`}><span>{s?.complete?'完成':`${progress}%`}</span><span className="progress-line"><i style={{width:`${progress}%`}}/></span><time>{clock(s?.time??0)}</time></div>
  <nav className="playback-controls" aria-label="播放控制">
   <button disabled={!ready} aria-label={paused?'继续':'暂停'} title={paused?'继续':'暂停'} onClick={()=>{if(s)s.paused=!s.paused;update(v=>v+1);}}>{paused?<Play size={18}/>:<Pause size={18}/>}</button>
   <div className="speed-buttons">{[1,2,4].map(speed=><button key={speed} aria-pressed={s?.speed===speed} onClick={()=>{if(s)s.speed=speed;update(v=>v+1);}}>{speed}×</button>)}</div>
   <button aria-label="恢复视角" title="恢复视角" onClick={()=>world.current?.resetView()}><Focus size={19}/></button>
   <AlertDialog><AlertDialogTrigger asChild><button aria-label="重新建造" title="重新建造"><RotateCcw size={17}/></button></AlertDialogTrigger><AlertDialogContent className="reset-dialog"><AlertDialogTitle>重新建造？</AlertDialogTitle><AlertDialogDescription>当前进度将清空。</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={()=>setEpoch(v=>v+1)}>重新开始</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </nav>
  {!ready&&<div className="loading-panel" role="status"><p>{error||'准备开工…'}</p>{error&&<button onClick={()=>setEpoch(v=>v+1)}>重试</button>}</div>}
 </main>;
}
