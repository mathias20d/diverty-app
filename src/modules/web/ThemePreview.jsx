import React, { useEffect, useRef, useState } from 'react';

export default function ThemePreview({ form }) {
  const origin=import.meta.env.VITE_THEME_PREVIEW_ORIGIN || 'https://divertypanama.netlify.app';
  const frame=useRef(null),container=useRef(null),draft=useRef(form);
  const [device,setDevice]=useState('mobile'),[width,setWidth]=useState(320),[ready,setReady]=useState(false),[retry,setRetry]=useState(0),[failed,setFailed]=useState(false);
  draft.current=form;
  const send=()=>frame.current?.contentWindow?.postMessage({type:'diverty:theme-preview',theme:{...draft.current,themeVersion:2}},origin);
  useEffect(()=>{
    const measure=()=>setWidth(container.current.getBoundingClientRect().width);
    measure();
    if(typeof ResizeObserver==='undefined'){window.addEventListener('resize',measure);return()=>window.removeEventListener('resize',measure);}
    const observer=new ResizeObserver(entries=>setWidth(entries[0].contentRect.width));observer.observe(container.current);return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const receive=e=>{if(e.origin===origin&&e.source===frame.current?.contentWindow&&e.data?.type==='diverty:theme-preview-ready'){setReady(true);setFailed(false);send();}};
    window.addEventListener('message',receive);
    const timer=setTimeout(()=>setFailed(true),15000);
    return()=>{window.removeEventListener('message',receive);clearTimeout(timer);};
  },[origin,retry]);
  useEffect(()=>{if(ready)send();},[form,ready,origin]);
  const viewport=device==='mobile'?390:1080,scale=Math.min(1,width/viewport),height=700;
  return <section className="rounded-2xl border border-violet-200 bg-white p-3 space-y-3" aria-label="Vista previa del tema">
    <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-black text-slate-900">Vista previa</h4><span className="text-[10px] font-bold text-violet-700">Sin publicar</span></div>
    <div className="flex gap-2">{[['mobile','Móvil'],['desktop','Escritorio']].map(([id,label])=><button type="button" key={id} aria-pressed={device===id} onClick={()=>setDevice(id)} className={`min-h-[44px] flex-1 rounded-xl text-xs font-bold ${device===id?'bg-violet-600 text-white':'bg-slate-100 text-slate-600'}`}>{label}</button>)}</div>
    {failed&&!ready&&<div className="text-xs text-slate-600" role="status">No se pudo cargar la vista previa. <button type="button" className="font-bold text-violet-700 underline" onClick={()=>{setFailed(false);setReady(false);setRetry(v=>v+1);}}>Reintentar</button></div>}
    <div ref={container} className="overflow-hidden rounded-xl border border-slate-200" style={{height:height*scale}}>
      <iframe key={retry} ref={frame} title={`Vista previa ${device==='mobile'?'móvil':'escritorio'}`} src={`${origin}/theme-preview.html`} sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer" style={{width:viewport,height,border:0,transform:`scale(${scale})`,transformOrigin:'top left'}}/>
    </div>
    <p className="text-[11px] font-semibold text-slate-500">La vista previa muestra tu web. Los cambios se aplican al guardar; aquí no se realizan reservas.</p>
  </section>;
}
