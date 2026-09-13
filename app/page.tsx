'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, CloudRain, Focus, HardHat, Pause, Play, Sun, Wind, RotateCw } from 'lucide-react';
import { createDiorama } from '@/lib/construction/diorama';
type Status = {
    speed: number;
    cycle: boolean;
    dust: number;
    rain: boolean;
    phase: number;
    auto: boolean;
    phaseName: string;
    fps?: number;
    instances?: number;
    drawCalls?: number;
};
export default function Home() {
    const host = useRef<HTMLDivElement>(null), world = useRef<Awaited<ReturnType<typeof createDiorama>> | null>(null);
    const [status, setStatus] = useState<Status>({ speed: 1, cycle: true, dust: 1, rain: false, phase: .3, auto: true, phaseName: '正午' }), [ready, setReady] = useState(false), [error, setError] = useState(''), [retry, setRetry] = useState(0);
    useEffect(() => { let gone = false; if (host.current)
        createDiorama(host.current, (s: Status) => { if (!gone)
            setStatus(previous => ({ ...previous, ...s })); }).then(w => { if (gone)
            w.dispose();
        else {
            world.current = w;
            setReady(true);
        } }).catch(e => { if (!gone)
            setError(e instanceof Error ? e.message : '场景初始化失败'); }); return () => { gone = true; world.current?.dispose(); world.current = null; }; }, [retry]);
    const change = (key: string, value: number | boolean) => world.current?.set(key, value);
    return <main className="workbench">
  <div ref={host} className="scene" aria-label="体素建筑工地沙盘，可拖拽环视、滚轮缩放，点击桌面旋钮控制"/>
  <header className="site-header"><div className="brand" aria-label="小小建造场"><span className="brand-icon"><HardHat size={24}/></span><span>小小建造场<small>THE CONSTRUCTION ATELIER</small></span></div><div className="edition">交互微缩世界 <span>NO. 007</span></div></header>
  <section className="intro"><div className="eyebrow"><span /> LIVE DIORAMA <i>／</i> 实时工地</div><h1>方寸之间，<br />城市生长。</h1><p>一张工作桌，一座忙碌的微缩世界。<br />放慢视线，看每一块理想落地。</p><div className="scene-tag"><span>01 — 建筑工地</span><ArrowUpRight size={15}/></div></section>
  <aside className="telemetry" aria-label="场景状态"><div className="live-status"><span />{status.rain ? '暴雨作业中' : status.speed === 0 ? '工地已暂停' : '工地运行中'}</div><div><span>时段</span><button className="phase-button" disabled={!ready} title="切换时段" aria-label="切换时段" onClick={() => { change('phase', status.phase < .2 ? .3 : status.phase < .53 ? .59 : status.phase < .7 ? .82 : .08); change('cycle', false); }}>{status.phaseName}</button></div><div><span>设备倍率</span><strong>{status.speed.toFixed(1)} ×</strong></div><div><span>实时帧率</span><strong>{status.fps ?? '—'} <small>FPS</small></strong></div><div className="telemetry-footer">07 分区 <b>·</b> 34 位工人</div></aside>
  <div className="scene-caption"><span>微缩的尺度，真实的日常。</span><small>PROCEDURAL WORLD · 1:100</small></div>
  <footer className="control-area"><div className="interaction-hint"><span>拖拽环视</span><i>·</i><span>滚轮缩放</span><i>·</i><span><kbd>SPACE</kbd> 切换暴雨</span><i>·</i><span>也可点击桌面旋钮</span></div>
   <nav className="control-bar" aria-label="沙盘控制">
    <button className="play-button" disabled={!ready} onClick={() => change('speed', status.speed ? 0 : 1)} aria-label={status.speed ? '暂停设备' : '启动设备'}>{status.speed ? <Pause size={18}/> : <Play size={18}/>}</button>
    <div className="speed-control"><small>运行速度</small><div>{[.5, 1, 2].map(s => <button disabled={!ready} key={s} aria-pressed={status.speed === s} onClick={() => change('speed', s)}>{s}×</button>)}</div></div>
    <span className="divider"/>
    <button disabled={!ready} className="setting" aria-pressed={status.cycle} onClick={() => change('cycle', !status.cycle)}><Sun size={18}/><span>昼夜循环<small>{status.cycle ? '自动流转' : '固定时段'}</small></span><i className={status.cycle ? 'switch on' : 'switch'}/></button>
    <span className="divider"/>
    <button disabled={!ready} className="setting" onClick={() => change('dust', (status.dust + 1) % 3)}><Wind size={18}/><span>施工扬尘<small>{['关闭', '轻微', '浓厚'][status.dust]}</small></span></button>
    <button disabled={!ready} className={`weather ${status.rain ? 'active' : ''}`} aria-pressed={status.rain} onClick={() => change('rain', !status.rain)} title="切换暴雨"><CloudRain size={19}/></button>
    <span className="divider"/><button disabled={!ready} className="icon-button" title="自动环绕" aria-label="自动环绕" aria-pressed={status.auto} onClick={() => change('auto', !status.auto)}><RotateCw size={18}/></button><button disabled={!ready} className="icon-button" title="恢复视角" aria-label="恢复视角" onClick={() => world.current?.resetView()}><Focus size={19}/></button>
   </nav><div className="footer-note"><span>BUILT FROM BLOCKS. BROUGHT TO LIFE.</span><span>全程序生成 <i>↗</i></span></div>
  </footer>
  {!ready && <div className="loading-panel" role="status"><HardHat size={28}/><p>{error ? '场景加载失败' : '正在搭建微缩世界…'}</p>{error && <><small>{error}</small><button onClick={() => { setError(''); setReady(false); setRetry(v => v + 1); }}>重新加载</button></>}</div>}
 </main>;
}
