import AnimatedProgress from '../../components/AnimatedProgress.jsx';
import React, { memo, useEffect, useMemo, useState } from 'react';
import { Award, CheckCircle2, Clock, Copy, Download, FileSpreadsheet, MessageCircle, Receipt, RefreshCw, Sparkles, Star, Truck, Users } from 'lucide-react';

function useCountUp(end, duration = 1000) { 
    const [count, setCount] = useState(0); 
    useEffect(() => { 
        if (end === 0) { setCount(0); return; } 
        let start = 0, stepTime = 16, steps = duration / stepTime, increment = end / steps, timer; 
        const delay = setTimeout(() => { timer = setInterval(() => { start += increment; if ((increment > 0 && start >= end) || (increment < 0 && start <= end)) { setCount(end); clearInterval(timer); } else { setCount(start); } }, stepTime); }, 200); 
        return () => { clearTimeout(delay); if (timer) clearInterval(timer); }; 
    }, [end, duration]); 
    return count; 
}

const AnimatedMoney = memo(function AnimatedMoney({ value }) {
    const amount = useCountUp(value);
    return <span>{amount.toFixed(0)}</span>;
});

const ListProgress = memo(function ListProgress({ shown, total, onMore, label }) {
    return <div className="py-3 text-center space-y-2">
        <p className="text-[11px] font-semibold text-slate-500" role="status">{Math.min(shown, total)} de {total} {label}</p>
        {shown < total && <button type="button" onClick={onMore} className="w-full min-h-[44px] rounded-xl bg-violet-50 border border-violet-100 text-[#7657FF] font-bold text-xs active:scale-[.98]">Mostrar más {label}</button>}
    </div>;
});

export default function FinancesView({
  Badge,
  NOMBRES_MESES,
  UI,
  appSettings,
  chartData,
  downloadExcel,
  evtCalculoBase,
  financeFocus,
  financeMonth,
  financePeriod,
  financeYear,
  finanzasData,
  finanzasMes,
  gastosPorCategoria,
  handleCopiarCobros,
  handleEstadoPagoProveedor,
  handleMarcarCobrado,
  maxChartVal,
  monthlyReport,
  monthlyReportLoading,
  openModal,
  selectedFinanceMonth,
  selectedFinanceYear,
  sendWhatsAppCall,
  setFinanceFocus,
  setFinancePeriod,
  setSelectedFinanceMonth,
  setSelectedFinanceYear,
  stats,
  todayObj,
  utils
}) {
      const [debtsVisible, setDebtsVisible] = useState(30);
      const [providersVisible, setProvidersVisible] = useState(30);
      const [incomeVisible, setIncomeVisible] = useState(30);
      const deudasPendientes = useMemo(() => evtCalculoBase.filter(e => (utils.safeNum(e.total) - utils.safeNum(e.abono)) > 0), [evtCalculoBase, utils]);
      const tieneDeudas = deudasPendientes.length > 0;
      const ingresosRecibidos = useMemo(() => evtCalculoBase.filter(e => Math.min(utils.safeNum(e.abono), utils.safeNum(e.total)) > 0).sort((a,b) => String(b.fecha || '').localeCompare(String(a.fecha || ''))), [evtCalculoBase, utils]);
      const tieneIngresos = ingresosRecibidos.length > 0;
      const cuentasProveedores = useMemo(() => evtCalculoBase.flatMap(ev => (ev.subcontratos || []).map((sc, subIndex) => ({ ev, sc, subIndex }))).filter(x => utils.safeNum(x.sc.costo) > 0).sort((a,b) => String(b.ev.fecha || '').localeCompare(String(a.ev.fecha || ''))), [evtCalculoBase, utils]);
      const cuentasProveedoresPendientes = cuentasProveedores.filter(x => !(x.sc.pagado === true || utils.normalizeText(x.sc.estadoPago) === 'pagado'));
      const totalGanancia = chartData.reduce((s,d) => s + d.value, 0);

      return (
          <div className="animate-fadeIn p-4 md:p-7 lg:p-8 max-w-5xl mx-auto space-y-5 pb-32 relative z-10">
             <div className="finance-toolbar flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
               <div><h2 className={UI.title}>Finanzas</h2><p className="text-slate-500 text-sm mt-2 font-medium">Facturación, cobros pendientes, costos internos, proveedores y ganancia.</p></div>
               <div className="finance-controls flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center bg-white/95 backdrop-blur-md p-2 rounded-[24px] border border-slate-200/80 shadow-md w-full sm:w-auto">
                 <div className="flex gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/50">
                   <button type="button" onClick={() => {utils.triggerHaptic('light'); setFinancePeriod('mes');}} className={`px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all duration-300 ease-out active:scale-[0.98] ${financePeriod === 'mes' ? 'bg-gradient-to-r from-[#7657FF] to-[#8B5CF6] text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>Este Mes</button>
                   <button type="button" onClick={() => {utils.triggerHaptic('light'); setFinancePeriod('anio'); setSelectedFinanceYear(todayObj.getFullYear());}} className={`px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all duration-300 ease-out active:scale-[0.98] ${financePeriod === 'anio' ? 'bg-gradient-to-r from-[#7657FF] to-[#8B5CF6] text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>Año</button>
                   <button type="button" onClick={() => {utils.triggerHaptic('light'); setFinancePeriod('todos');}} className={`px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all duration-300 ease-out active:scale-[0.98] ${financePeriod === 'todos' ? 'bg-gradient-to-r from-[#7657FF] to-[#8B5CF6] text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>Histórico</button>
                   <button type="button" onClick={() => {utils.triggerHaptic('light'); setFinancePeriod('seleccionado');}} className={`px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all duration-300 ease-out active:scale-[0.98] ${financePeriod === 'seleccionado' ? 'bg-gradient-to-r from-[#7657FF] to-[#8B5CF6] text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>Otro Mes</button>
                 </div>
                 {financePeriod === 'seleccionado' && (
                   <div className="flex gap-2 items-center animate-fadeIn py-1 px-2 border-l border-slate-200">
                     <select value={selectedFinanceMonth} onChange={(e) => { utils.triggerHaptic('light'); setSelectedFinanceMonth(parseInt(e.target.value)); }} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#7657FF] cursor-pointer">{NOMBRES_MESES.map((name, idx) => (<option key={idx} value={idx + 1}>{name}</option>))}</select>
                     <select value={selectedFinanceYear} onChange={(e) => { utils.triggerHaptic('light'); setSelectedFinanceYear(parseInt(e.target.value)); }} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#7657FF] cursor-pointer">{[2024, 2025, 2026, 2027, 2028].map(y => (<option key={y} value={y}>{y}</option>))}</select>
                   </div>
                 )}
                 {financePeriod === 'anio' && (
                   <div className="flex gap-2 items-center animate-fadeIn py-1 px-2 border-l border-slate-200">
                     <select value={selectedFinanceYear} onChange={(e) => { utils.triggerHaptic('light'); setSelectedFinanceYear(parseInt(e.target.value)); }} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#7657FF] cursor-pointer">{[2024, 2025, 2026, 2027, 2028].map(y => (<option key={y} value={y}>{y}</option>))}</select>
                   </div>
                 )}
                 <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
                 <button type="button" onClick={downloadExcel} className="p-2.5 sm:px-4 sm:py-2.5 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-all duration-300 ease-out active:scale-[0.98] flex items-center justify-center gap-2 border border-transparent hover:border-emerald-200" title="Exportar a Excel"><Download size={18} strokeWidth={2.5}/> <span className="hidden sm:inline text-[11px] font-bold uppercase tracking-widest">Excel</span></button>
               </div>
             </div>

             <div className="bg-gradient-to-br from-[#17142B] via-[#34256B] to-[#7657FF] rounded-[30px] p-5 sm:p-8 shadow-[0_24px_60px_rgba(118,87,255,0.24)] relative overflow-hidden border border-white/10 animate-slideDown">
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-[radial-gradient(circle,rgba(37,99,235,0.08)_0%,transparent_60%)] pointer-events-none transform-gpu"></div>
                <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-[radial-gradient(circle,rgba(124,58,237,0.08)_0%,transparent_60%)] pointer-events-none transform-gpu"></div>
                <div className="text-center relative z-10">
                  <p className="text-white/60 font-bold uppercase tracking-[0.25em] text-[10px] mb-2 flex justify-center items-center gap-2"><Star size={16} className="text-amber-400 fill-amber-400 animate-spin-slow"/> GANANCIA ESTIMADA DE {financePeriod === 'mes' ? 'ESTE MES' : financePeriod === 'anio' ? `AÑO ${financeYear}` : financePeriod === 'todos' ? 'HISTÓRICO' : `${NOMBRES_MESES[financeMonth - 1].toUpperCase()} ${financeYear}`}</p>
                  <h1 className={`text-5xl sm:text-6xl md:text-7xl font-black mb-5 tracking-tighter ${finanzasData.bT >= 0 ? 'text-white' : 'text-rose-300'}`}>${finanzasData.bT.toFixed(0)}<span className="text-2xl sm:text-3xl text-white/40">.{(finanzasData.bT % 1).toFixed(2).substring(2)}</span></h1>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 border-t border-slate-200/60 pt-4 mt-1">
                    <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-left"><p className="text-white/55 font-bold text-[9px] uppercase tracking-widest mb-1.5">Facturado</p><p className="text-emerald-300 font-black text-xl sm:text-2xl tracking-tight">${finanzasData.facturado.toFixed(2)}</p></div>
                    <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-left"><p className="text-white/55 font-bold text-[9px] uppercase tracking-widest mb-1.5">Cobrado</p><p className="text-white font-black text-xl sm:text-2xl tracking-tight">${finanzasData.cobrado.toFixed(2)}</p></div>
                    <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-left"><p className="text-white/55 font-bold text-[9px] uppercase tracking-widest mb-1.5">Por cobrar</p><p className="text-rose-300 font-black text-xl sm:text-2xl tracking-tight">${finanzasData.porCobrar.toFixed(2)}</p></div>
                    <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-left"><p className="text-white/55 font-bold text-[9px] uppercase tracking-widest mb-1.5">Gastos internos</p><p className="text-amber-300 font-black text-xl sm:text-2xl tracking-tight">-${finanzasData.gastosInternos.toFixed(2)}</p></div>
                    <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-left"><p className="text-white/55 font-bold text-[9px] uppercase tracking-widest mb-1.5">Costo proveedores</p><p className="text-purple-200 font-black text-xl sm:text-2xl tracking-tight">-${finanzasData.proveedores.toFixed(2)}</p><p className="text-[8px] font-bold text-white/45 mt-1">Pendiente: ${finanzasData.proveedoresPendientes.toFixed(2)}</p></div>
                    <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-left"><p className="text-white/55 font-bold text-[9px] uppercase tracking-widest mb-1.5">Margen estimado</p><p className="text-white font-black text-xl sm:text-2xl tracking-tight">{finanzasData.roi}%</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 mt-4 pt-4 border-t border-white/10">
                    <button type="button" onClick={() => { setFinanceFocus('cobros'); setTimeout(() => document.getElementById('cuentas-por-cobrar')?.scrollIntoView({behavior:'smooth', block:'start'}), 50); }} className="py-3.5 px-4 rounded-2xl bg-white text-[#5B3FD6] font-black text-[10px] uppercase tracking-[0.16em] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg"><Clock size={16}/> Ver por cobrar</button>
                    <button type="button" onClick={downloadExcel} className="py-3.5 px-4 rounded-2xl bg-white/10 text-white border border-white/15 font-black text-[10px] uppercase tracking-[0.16em] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"><Download size={16}/> Exportar balance</button>
                  </div>
                </div>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 animate-fadeInUp" style={{animationDelay: '100ms'}}>
               <div className={`${UI.card} p-4 sm:p-5 flex flex-col justify-center`}><p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-2.5">Ganancia Hoy</p><p className="text-3xl font-extrabold text-emerald-500 tracking-tight">$<AnimatedMoney value={stats.gananciaHoy} /></p></div>
               <div className={`${UI.card} p-4 sm:p-5 flex flex-col justify-center`}><p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-2.5">Por Cobrar Período</p><p className="text-3xl font-extrabold text-rose-500 tracking-tight">${finanzasData.deudaTotalGlobal.toFixed(0)}</p></div>
               <div className={`col-span-2 ${UI.card} p-4 sm:p-5 flex items-end justify-between gap-3 h-[105px]`}>
                 <div className="flex-1 flex justify-between items-end h-full gap-2 sm:gap-3">
                   {chartData.map((d, i) => { const hPercent = (d.value / maxChartVal) * 100; return (<div key={i} className="w-full flex flex-col items-center justify-end h-full gap-1.5 group relative"><div className="absolute -top-7 hidden sm:block bg-slate-900 text-white text-[9px] font-extrabold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap shadow-md">${d.value.toFixed(0)}</div><div className="w-full bg-slate-100/50 rounded-md relative overflow-hidden transition-all duration-300 ease-out group-hover:bg-slate-200/80 h-[58px]"><div className="absolute bottom-0 w-full bg-gradient-to-t from-[#7657FF] to-[#8B5CF6] transition-all duration-1000 ease-out" style={{height: `${hPercent}%`}}></div></div><span className="text-[9px] font-bold uppercase text-slate-400 tracking-[0.15em]">{d.date}</span></div>) })}
                 </div>
                 <div className="pl-6 border-l border-slate-200/80 flex flex-col justify-center h-full"><p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-2 leading-none">Ganancia Período</p><p className="text-2xl font-black text-slate-900 tracking-tight leading-none">${totalGanancia.toFixed(0)}</p></div>
               </div>
             </div>

             <div className={`${UI.card} p-4 sm:p-6 animate-fadeInUp`} style={{animationDelay: '170ms'}}>
               <div className="flex items-start justify-between gap-3 mb-4"><div><h4 className="font-extrabold text-xl text-slate-900 tracking-tight flex items-center gap-2"><Receipt size={21} className="text-rose-500"/> Gastos del período</h4><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 mt-1">Registro rápido por categoría</p></div><div className="text-right"><p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total interno</p><p className="text-xl font-black text-rose-500">-${finanzasData.gastosInternos.toFixed(2)}</p></div></div>
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                 <div className="rounded-[16px] bg-violet-50 border border-violet-100 p-3"><div className="flex items-center gap-2 text-violet-600"><Users size={16}/><span className="text-[9px] font-black uppercase tracking-wider">Personal</span></div><p className="text-xl font-black text-slate-900 mt-2">${gastosPorCategoria.personal.toFixed(2)}</p></div>
                 <div className="rounded-[16px] bg-blue-50 border border-blue-100 p-3"><div className="flex items-center gap-2 text-blue-600"><Truck size={16}/><span className="text-[9px] font-black uppercase tracking-wider">Transporte</span></div><p className="text-xl font-black text-slate-900 mt-2">${gastosPorCategoria.transporte.toFixed(2)}</p></div>
                 <div className="rounded-[16px] bg-pink-50 border border-pink-100 p-3"><div className="flex items-center gap-2 text-pink-600"><Sparkles size={16}/><span className="text-[9px] font-black uppercase tracking-wider">Globos / mat.</span></div><p className="text-xl font-black text-slate-900 mt-2">${gastosPorCategoria.globos.toFixed(2)}</p></div>
                 <div className="rounded-[16px] bg-slate-50 border border-slate-200 p-3"><div className="flex items-center gap-2 text-slate-600"><Receipt size={16}/><span className="text-[9px] font-black uppercase tracking-wider">Otros</span></div><p className="text-xl font-black text-slate-900 mt-2">${gastosPorCategoria.otros.toFixed(2)}</p></div>
               </div>
             </div>

             {financePeriod !== 'anio' && financePeriod !== 'todos' && (
             <div className="rounded-[26px] bg-white border border-slate-200/80 shadow-[0_12px_34px_rgba(15,23,42,.06)] p-4 sm:p-5 animate-fadeInUp" style={{animationDelay:'185ms'}}>
               <div className="flex items-start justify-between gap-3"><div className="flex gap-3"><div className="w-11 h-11 rounded-[15px] bg-emerald-50 text-emerald-600 flex items-center justify-center"><FileSpreadsheet size={20}/></div><div><h4 className="font-black text-lg text-slate-900">Cierre mensual automático</h4><p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-400 mt-1">{NOMBRES_MESES[financeMonth-1]} {financeYear}</p></div></div>{monthlyReport?.finalized && <Badge color="emerald">Cerrado</Badge>}</div>
               {monthlyReportLoading ? <p className="text-sm font-semibold text-slate-400 mt-4">Revisando reporte…</p> : monthlyReport?.finalized ? <div className="mt-4"><div className="grid grid-cols-3 gap-2"><div className="rounded-[14px] bg-slate-50 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Reservas</p><p className="text-xl font-black text-slate-900 mt-1">{monthlyReport.reservas||0}</p></div><div className="rounded-[14px] bg-emerald-50 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-emerald-500">Facturado</p><p className="text-xl font-black text-emerald-600 mt-1">${utils.safeNum(monthlyReport.facturado).toFixed(0)}</p></div><div className="rounded-[14px] bg-violet-50 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-violet-500">Ganancia</p><p className="text-xl font-black text-violet-600 mt-1">${utils.safeNum(monthlyReport.ganancia).toFixed(0)}</p></div></div><p className="text-[10px] font-semibold text-slate-400 mt-3">Reporte archivado automáticamente en la nube. Puedes volver a este mes desde “Otro Mes”.</p></div> : <div className="mt-4 rounded-[16px] bg-blue-50 border border-blue-100 p-3 flex gap-2.5"><Clock size={17} className="text-[#7657FF] shrink-0"/><p className="text-[11px] font-semibold text-slate-600 leading-relaxed">Mes en curso. El reporte se prepara el último día y queda finalizado automáticamente al abrir la app después del cambio de mes.</p></div>}
             </div>
             )}

             {financePeriod !== 'anio' && financePeriod !== 'todos' && (
             <div className={`${UI.card} p-4 sm:p-6 animate-fadeInUp`} style={{animationDelay: '200ms'}}>
               <div className="flex justify-between items-end mb-3"><div><h4 className="font-extrabold text-xl text-slate-900 tracking-tight flex items-center gap-2"><Award size={22} className="text-amber-500"/> Meta del Período</h4><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 mt-1">{financePeriod === 'todos' ? 'Progreso histórico acumulado' : `Día ${finanzasMes.diasTranscurridos} de ${finanzasMes.diasTotales} del mes`}</p></div><div className="text-right"><span className="text-3xl font-black text-emerald-500 tracking-tight">${finanzasMes.ingresosEsteMesGlobal.toFixed(0)} <span className="text-base font-bold text-slate-400">/ ${appSettings.metaMensual}</span></span></div></div>
               <div className="w-full bg-slate-200/80 rounded-full h-2.5 mb-3 overflow-hidden"><AnimatedProgress value={finanzasMes.progresoMeta} /></div>
               <div className={UI.flexBetween}><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-600 bg-slate-100/80 px-3.5 py-1.5 rounded-[10px] border border-slate-200/50 shadow-sm">{finanzasMes.progresoMeta.toFixed(1)}% Alcanzado</p>{financePeriod !== 'todos' && (<p className={`text-[11px] font-bold uppercase tracking-[0.1em] px-3.5 py-1.5 rounded-[10px] border shadow-sm ${finanzasMes.proyeccion >= appSettings.metaMensual ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-500 border-rose-200'}`}>Faltan: $${Math.max(utils.safeNum(appSettings.metaMensual) - finanzasMes.ingresosEsteMesGlobal, 0).toFixed(0)}</p>)}</div>
             </div>

             )}

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div id="cuentas-por-cobrar" className={`flex flex-col gap-3 animate-fadeInUp scroll-mt-6 ${financeFocus === 'cobros' ? 'ring-2 ring-[#FF3EA5]/25 rounded-[30px] p-2 -m-2' : ''}`} style={{animationDelay: '300ms'}}>
                  <div className="rounded-[28px] bg-white border border-slate-200/80 shadow-[0_16px_42px_rgba(15,23,42,0.07)] overflow-hidden">
                    <div className="p-5 bg-gradient-to-r from-[#7657FF]/[0.08] via-white to-[#FF3EA5]/[0.08] border-b border-slate-100">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><div className="flex items-center gap-2.5"><div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-[#7657FF] to-[#FF3EA5] text-white flex items-center justify-center shadow-[0_8px_20px_rgba(118,87,255,0.24)]"><Clock size={19}/></div><div><h4 className="font-black text-[20px] text-slate-900 tracking-tight leading-tight">Cuentas por cobrar</h4><p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 mt-1">{financePeriod === 'todos' ? 'Histórico' : financePeriod === 'anio' ? `Año ${financeYear}` : `${NOMBRES_MESES[financeMonth - 1]} ${financeYear}`}</p></div></div></div>
                        {tieneDeudas && <button type="button" onClick={handleCopiarCobros} className="shrink-0 text-[9px] font-black uppercase tracking-[0.14em] text-[#6547D9] bg-white hover:bg-[#7657FF]/5 py-2.5 px-3 rounded-[13px] border border-[#7657FF]/20 shadow-sm flex items-center gap-1.5 active:scale-[0.98] transition-all"><Copy size={14}/> Copiar</button>}
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 mt-4">
                        <div className="rounded-[16px] bg-white/90 border border-white p-3 shadow-sm"><p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">Saldo pendiente</p><p className="text-2xl font-black text-rose-500 tracking-tight mt-1">${finanzasData.deudaTotalGlobal.toFixed(2)}</p></div>
                        <div className="rounded-[16px] bg-white/90 border border-white p-3 shadow-sm"><p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">Clientes pendientes</p><p className="text-2xl font-black text-[#7657FF] tracking-tight mt-1">{deudasPendientes.length}</p></div>
                      </div>
                    </div>
                    {!tieneDeudas ? <div className="min-h-[260px] flex flex-col items-center justify-center p-8 text-center"><div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4"><CheckCircle2 size={28}/></div><p className="font-extrabold text-slate-900">Todo está cobrado</p><p className="text-[11px] font-medium text-slate-400 mt-2">No hay saldos pendientes en este período.</p></div> : <div data-finance-list="deudas" className="p-3 space-y-3 max-h-[520px] overflow-y-auto scrollbar-hide">{deudasPendientes.slice(0, debtsVisible).map((ev) => { const total=utils.safeNum(ev.total); const recibido=Math.min(utils.safeNum(ev.abono),total); const pendiente=Math.max(total-recibido,0); const avance=total>0?Math.min((recibido/total)*100,100):0; return <div key={ev.id} className="rounded-[22px] bg-white border border-slate-200/80 shadow-[0_8px_24px_rgba(15,23,42,0.05)] p-4">
                      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-black text-[16px] text-slate-900 truncate capitalize">{String(ev.cliente || 'Cliente')}</p><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 mt-1">{ev.fecha ? String(ev.fecha).split('-').reverse().join('/') : 'Sin fecha'} · {String(ev.servicio || 'Reserva')}</p></div><div className="text-right shrink-0"><p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Pendiente</p><p className="text-xl font-black text-rose-500 tracking-tight">${pendiente.toFixed(2)}</p></div></div>
                      <div className="mt-3"><div className="flex justify-between text-[9px] font-bold mb-1.5"><span className="text-slate-400">Recibido ${recibido.toFixed(2)}</span><span className="text-[#7657FF]">{avance.toFixed(0)}% pagado</span></div><div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-[#7657FF] to-[#FF3EA5] transition-all" style={{width:`${avance}%`}}></div></div></div>
                      <div className="grid grid-cols-[1fr_auto] gap-2 mt-3"><button type="button" onClick={() => handleMarcarCobrado(ev)} className="min-h-[44px] rounded-[14px] bg-gradient-to-r from-[#7657FF] to-[#8B5CF6] text-white font-black text-[9px] uppercase tracking-[0.13em] flex items-center justify-center gap-2 shadow-[0_8px_18px_rgba(118,87,255,0.22)] active:scale-[0.98] transition-transform"><CheckCircle2 size={15}/> Marcar cobrado</button><button type="button" onClick={() => sendWhatsAppCall(ev, 'recordatorio', appSettings.empresa)} className="w-12 min-h-[44px] rounded-[14px] bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center active:scale-[0.98] transition-transform" title="Enviar recordatorio por WhatsApp"><MessageCircle size={19}/></button></div>
                    </div>})}<ListProgress shown={debtsVisible} total={deudasPendientes.length} onMore={() => setDebtsVisible(n => n + 30)} label="cobros pendientes" /></div>}
                  </div>
                </div>

                <div className="flex flex-col gap-3 animate-fadeInUp" style={{animationDelay: '350ms'}}>
                  <div className="rounded-[28px] bg-white border border-slate-200/80 shadow-[0_16px_42px_rgba(15,23,42,0.07)] overflow-hidden">
                    <div className="p-5 bg-gradient-to-r from-amber-50/90 via-white to-rose-50/50 border-b border-slate-100">
                      <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2.5"><div className="w-10 h-10 rounded-[14px] bg-amber-500 text-white flex items-center justify-center shadow-sm"><Truck size={19}/></div><div><h4 className="font-black text-[20px] text-slate-900 tracking-tight">Cuentas por pagar</h4><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 mt-1">Servicios de proveedores asignados</p></div></div><div className="text-right"><p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Pendiente</p><p className="text-xl font-black text-amber-500">${finanzasData.proveedoresPendientes.toFixed(2)}</p></div></div>
                      <div className="grid grid-cols-2 gap-2.5 mt-4"><div className="rounded-[16px] bg-white p-3 shadow-sm"><p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Pagado</p><p className="text-2xl font-black text-emerald-500 mt-1">${finanzasData.proveedoresPagados.toFixed(2)}</p></div><div className="rounded-[16px] bg-white p-3 shadow-sm"><p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Pendientes</p><p className="text-2xl font-black text-amber-500 mt-1">{cuentasProveedoresPendientes.length}</p></div></div>
                    </div>
                    {cuentasProveedores.length === 0 ? <div className="p-8 text-center text-sm font-semibold text-slate-400">No hay costos de proveedores en este período.</div> : <div data-finance-list="proveedores" className="p-3 space-y-3 max-h-[520px] overflow-y-auto scrollbar-hide">{cuentasProveedores.slice(0, providersVisible).map(({ev,sc,subIndex}) => { const pagado=sc.pagado===true||utils.normalizeText(sc.estadoPago)==='pagado'; return <div key={`${ev.id}-${sc.id||subIndex}`} className="rounded-[22px] bg-white border border-slate-200/80 shadow-sm p-4"><div className="flex justify-between gap-3"><div className="min-w-0"><p className="font-black text-slate-900 truncate">{sc.nombre || 'Proveedor'}</p><p className="text-[10px] font-bold text-slate-500 mt-1">{sc.servicio || 'Servicio'} · {ev.cliente || 'Cliente'}</p><p className="text-[9px] font-semibold text-slate-400 mt-1">{ev.fecha ? String(ev.fecha).split('-').reverse().join('/') : 'Sin fecha'}</p></div><div className="text-right shrink-0"><p className={`text-[8px] font-black uppercase tracking-widest ${pagado?'text-emerald-500':'text-amber-500'}`}>{pagado?'Pagado':'Por pagar'}</p><p className={`text-xl font-black ${pagado?'text-emerald-500':'text-rose-500'}`}>${utils.safeNum(sc.costo).toFixed(2)}</p></div></div><button type="button" onClick={()=>handleEstadoPagoProveedor(ev,subIndex,!pagado)} className={`mt-3 w-full min-h-[43px] rounded-[14px] font-black text-[9px] uppercase tracking-[.13em] flex items-center justify-center gap-2 active:scale-[.98] transition-all ${pagado?'bg-slate-100 text-slate-600':'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm'}`}>{pagado?<><RefreshCw size={14}/> Marcar pendiente</>:<><CheckCircle2 size={15}/> Registrar pago</>}</button></div>})}<ListProgress shown={providersVisible} total={cuentasProveedores.length} onMore={() => setProvidersVisible(n => n + 30)} label="pagos a proveedores" /></div>}
                  </div>
                </div>

                <div className="flex flex-col gap-3 animate-fadeInUp" style={{animationDelay: '400ms'}}>
                  <div className="rounded-[28px] bg-white border border-slate-200/80 shadow-[0_16px_42px_rgba(15,23,42,0.07)] overflow-hidden">
                    <div className="p-5 bg-gradient-to-r from-emerald-50/80 via-white to-[#7657FF]/[0.06] border-b border-slate-100">
                      <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2.5 min-w-0"><div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-emerald-400 to-emerald-500 text-white flex items-center justify-center shadow-[0_8px_20px_rgba(16,185,129,0.20)]"><FileSpreadsheet size={19}/></div><div><h4 className="font-black text-[20px] text-slate-900 tracking-tight leading-tight">Ingresos del período</h4><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 mt-1">Dinero realmente recibido</p></div></div><div className="text-right shrink-0"><p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Cobrado</p><p className="text-xl font-black text-emerald-500 tracking-tight">${finanzasData.cobrado.toFixed(2)}</p></div></div>
                      <div className="grid grid-cols-2 gap-2.5 mt-4"><div className="rounded-[16px] bg-white/90 border border-white p-3 shadow-sm"><p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">Movimientos</p><p className="text-2xl font-black text-slate-900 mt-1">{ingresosRecibidos.length}</p></div><div className="rounded-[16px] bg-white/90 border border-white p-3 shadow-sm"><p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">Por cobrar</p><p className="text-2xl font-black text-rose-500 mt-1">${finanzasData.porCobrar.toFixed(2)}</p></div></div>
                    </div>
                    {!tieneIngresos ? <div className="min-h-[260px] flex flex-col items-center justify-center p-8 text-center"><div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4"><FileSpreadsheet size={28}/></div><p className="font-extrabold text-slate-900">Aún no hay cobros recibidos</p><p className="text-[11px] font-medium text-slate-400 mt-2 max-w-[240px]">Los abonos y pagos registrados aparecerán aquí.</p></div> : <div data-finance-list="ingresos" className="p-3 space-y-3 max-h-[520px] overflow-y-auto scrollbar-hide">{ingresosRecibidos.slice(0, incomeVisible).map((e) => { const total=utils.safeNum(e.total); const recibido=Math.min(utils.safeNum(e.abono),total); const pendiente=Math.max(total-recibido,0); const avance=total>0?Math.min((recibido/total)*100,100):0; return <button type="button" key={e.id} onClick={() => openModal(e, false)} className="w-full text-left rounded-[22px] bg-white border border-slate-200/80 shadow-[0_8px_24px_rgba(15,23,42,0.05)] p-4 active:scale-[0.99] transition-transform">
                      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-black text-[16px] text-slate-900 truncate capitalize">{String(e.cliente || 'Cliente')}</p><p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 mt-1 line-clamp-2">{e.fecha ? String(e.fecha).split('-').reverse().join('/') : 'Sin fecha'} · {String(e.servicio || 'Reserva')}</p></div><div className="text-right shrink-0"><p className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Recibido</p><p className="text-xl font-black text-emerald-500 tracking-tight">+${recibido.toFixed(2)}</p></div></div>
                      <div className="grid grid-cols-2 gap-2 mt-3"><div className="rounded-[13px] bg-slate-50 p-2.5"><p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total reserva</p><p className="text-[13px] font-black text-slate-700 mt-0.5">${total.toFixed(2)}</p></div><div className={`rounded-[13px] p-2.5 ${pendiente>0?'bg-rose-50':'bg-emerald-50'}`}><p className={`text-[8px] font-black uppercase tracking-widest ${pendiente>0?'text-rose-400':'text-emerald-500'}`}>{pendiente>0?'Saldo pendiente':'Estado'}</p><p className={`text-[13px] font-black mt-0.5 ${pendiente>0?'text-rose-500':'text-emerald-600'}`}>{pendiente>0?`$${pendiente.toFixed(2)}`:'Pagado'}</p></div></div>
                      <div className="mt-3"><div className="flex justify-between text-[9px] font-bold mb-1.5"><span className="text-slate-400">Progreso del pago</span><span className="text-[#7657FF]">{avance.toFixed(0)}%</span></div><div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-[#7657FF]" style={{width:`${avance}%`}}></div></div></div>
                    </button>})}<ListProgress shown={incomeVisible} total={ingresosRecibidos.length} onMore={() => setIncomeVisible(n => n + 30)} label="ingresos" /></div>}
                  </div>
                </div>
             </div>
          </div>
      );
  }
