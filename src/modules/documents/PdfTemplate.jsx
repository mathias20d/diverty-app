import React, { memo } from 'react';
import { Briefcase, Calendar, Download, FileSignature, Printer, Share2, Users, X } from 'lucide-react';
import {serviceDurationHours} from '../../lib/service-duration.mjs';
import { billingMode } from '../../lib/reservation-lines.mjs';

const PdfTemplate = memo(function PdfTemplate({ utils, logoUrl, brandName = 'Diverty Eventos Panamá', shortBrandName = 'Diverty', printData, printType, pdfScale, onClose, onPrint, onShare, onDownload, appSettings, catalogoPaquetes = [] }) {
    const isC = printType === 'cotizacion', isContrato = printType === 'contrato', isContratoProv = printType === 'contrato_proveedor';
    const cli = String(printData.cliente || printData.nombre || ''), tel = String(printData.telefono || ''), emailStr = String(printData.email || ''), rucStr = String(printData.ruc || '');
    const ubi = String(printData.ubicacion || 'Por definir'), dir = String(printData.direccion || '');
    const fechaEvento = printData.fecha ? String(printData.fecha).split('-').reverse().join('/') : 'Por definir';
    const fechaEmisionISO = isC && printData.fechaEmisionCotizacion ? String(printData.fechaEmisionCotizacion).slice(0,10) : utils.getLocalYYYYMMDD(new Date());
    const fechaEmision = fechaEmisionISO.split('-').reverse().join('/');
    const vigenciaDias = Math.max(1, Math.round(utils.safeNum(printData.vigenciaCotizacion) || 7));
    const fechaValidaHasta = (() => { try { const d = new Date(`${fechaEmisionISO}T12:00:00`); d.setDate(d.getDate() + vigenciaDias); return utils.getLocalYYYYMMDD(d).split('-').reverse().join('/'); } catch (_) { return ''; } })();
    const horaStr = utils.formatTime12h(printData.hora), storedTotal = utils.safeNum(printData.total), trn = utils.safeNum(printData.transporte), abo = utils.safeNum(printData.abono);
    // PDF: la fuente de verdad son ÚNICAMENTE los servicios escogidos en esta reserva/cotización.
    // `catalogoPaquetes` se usa más abajo solo para completar descripciones/duración; nunca para sumar precios.
    const rawSelectedServices = Array.isArray(printData.serviciosSeleccionados)
      ? printData.serviciosSeleccionados.filter(s => s && String(s.nombre || '').trim())
      : [];
    const summaryNames = String(printData.servicio || '')
      .split(/\s+\+\s+/)
      .map(x => x.replace(/\s*\(x\d+(?:[.,]\d+)?\)\s*$/i, '').trim())
      .filter(Boolean)
      .map(x => utils.normalizeText(x));
    let selectedServices = rawSelectedServices;
    // Compatibilidad con datos antiguos donde, por error, pudo persistirse una lista mayor
    // que los servicios realmente indicados en el resumen de la reserva.
    // Si existe un resumen explícito, SIEMPRE manda ese resumen. Si ningún registro
    // coincide, preferimos una única línea de respaldo antes que imprimir el inventario completo.
    if (summaryNames.length) {
      const allowed = new Set(summaryNames);
      selectedServices = rawSelectedServices.filter(s => allowed.has(utils.normalizeText(s?.nombre || '').trim()));
    }
    const seenServices = new Set();
    selectedServices = selectedServices.filter(s => {
      const key = String(s?.id || '') || `${utils.normalizeText(s?.nombre || '')}|${Number(s?.cantidad)||1}|${utils.safeNum(s?.precio).toFixed(2)}`;
      if (seenServices.has(key)) return false;
      seenServices.add(key);
      return true;
    });
    const fallbackServiceSubtotal = Math.max(0, storedTotal - trn);
    const sA = selectedServices.length
      ? selectedServices
      : [{ nombre: String(printData.servicio || printData.especialidad || 'Servicio General'), precio: fallbackServiceSubtotal, cantidad: 1, descripcion: String(printData.comentarios || '') }];
    const selectedServicesSubtotal = sA.reduce((sum, s) => sum + Math.max(0, utils.safeNum(s?.precio)), 0);
    // En cotizaciones se recalcula el total desde los servicios seleccionados para impedir
    // que un valor antiguo/dañado del inventario termine impreso en la propuesta.
    const tot = isC ? selectedServicesSubtotal + trn : storedTotal;
    const subServicios = isC ? selectedServicesSubtotal : Math.max(0, tot - trn);
    const saldo = Math.max(0, tot - abo);
    const numRef = isC ? (printData.numeroCotizacion || 'COT-PENDIENTE') : isContratoProv ? (printData.numeroSubcontrato || 'SUB-PENDIENTE') : isContrato ? (printData.numeroContrato || 'CON-PENDIENTE') : (printData.numeroFactura || 'FAC-PENDIENTE');
    const docTitle = isC ? 'COTIZACIÓN' : isContratoProv ? (printData.contratoEvento === true || !!printData.eventoAsignado ? 'SUBCONTRATO DEL EVENTO' : 'ACUERDO MARCO DE PROVEEDOR') : isContrato ? 'CONTRATO DE SERVICIO' : 'FACTURA COMERCIAL';
    const providerId = String(printData.identificacion || printData.ruc || '').trim();
    const providerAddress = String(printData.direccion || '').trim();
    const providerEmail = String(printData.email || '').trim();
    const providerPaymentTerms = String(printData.condicionesPago || 'Pago contra prestación satisfactoria del servicio.').trim();
    // Subcontrato de proveedor: si el PDF corresponde a una reserva concreta,
    // la fuente de verdad son SOLO los servicios de ese proveedor seleccionados en esa reserva.
    // `printData.servicios` es el catálogo completo del proveedor y se usa únicamente para el contrato marco.
    const assignedProviderServices = Array.isArray(printData.serviciosAsignados)
      ? printData.serviciosAsignados.filter(x => x && String(x.nombre || x.servicio || '').trim())
      : [];
    const isProviderEventContract = isContratoProv && (assignedProviderServices.length > 0 || printData.contratoEvento === true || !!printData.eventoAsignado);
    const providerServices = isProviderEventContract
      ? assignedProviderServices.map((x,i) => ({
          id: x.id || `asig-${i}`,
          nombre: String(x.nombre || x.servicio || 'Servicio').trim(),
          costo: Math.max(0, utils.safeNum(x.costo ?? x.precio)),
          cantidad: Math.max(1, Number(x.cantidad) || 1)
        }))
      : (Array.isArray(printData.servicios) && printData.servicios.length
          ? printData.servicios.filter(x=>x && x.activo !== false)
          : [{ nombre: printData.especialidad || 'Servicios para eventos', costo: utils.safeNum(printData.costoBase), cantidad: 1 }]);
    const providerTotal = providerServices.reduce((sum, srv) => sum + Math.max(0, utils.safeNum(srv?.costo)), 0);
    const providerEvent = printData.eventoAsignado && typeof printData.eventoAsignado === 'object' ? printData.eventoAsignado : null;

    const serviceInfo = (servicio) => {
        const cant = Number(servicio.cantidad) || 1;
        const n = utils.normalizeText(servicio.nombre || '').trim();
        const catalogMatch = (Array.isArray(catalogoPaquetes) ? catalogoPaquetes : []).find(p => utils.normalizeText(p?.nombre || '').trim() === n) || {};
        const toLines = (value) => {
            if (Array.isArray(value)) return value.flatMap(toLines);
            if (value && typeof value === 'object') return Object.values(value).flatMap(toLines);
            return String(value || '').split(/\n|\r|\||;/).map(x => x.replace(/^(?:todo lo que incluye\s*:?|incluye\s*:?|[•\-–—*])\s*/i, '').trim()).filter(Boolean);
        };
        const includeCandidates = [
            servicio.incluye, servicio.serviciosLista, servicio.todoIncluido, servicio.todoLoIncluido, servicio.actividades, servicio.detalles, servicio.itemsIncluidos,
            catalogMatch.incluye, catalogMatch.serviciosLista, catalogMatch.todoIncluido, catalogMatch.todoLoIncluido, catalogMatch.actividades, catalogMatch.detalles, catalogMatch.itemsIncluidos
        ];
        const includeLines = includeCandidates.flatMap(toLines);
        const descLines = [servicio.descripcionCompleta, servicio.descripcion, catalogMatch.descripcionCompleta, catalogMatch.descripcion].flatMap(toLines);
        // Los campos de nivel superior solo se usan en documentos realmente antiguos que
        // no guardaban serviciosSeleccionados. Así una descripción histórica contaminada
        // tampoco puede volver a inyectar el inventario completo dentro del PDF.
        const topLevelLines = rawSelectedServices.length === 0 && sA.length === 1
          ? [printData.descripcionEvento, printData.todoIncluido, printData.todoLoIncluido, printData.serviciosLista].flatMap(toLines)
          : [];
        const rawDetails = [...includeLines, ...descLines, ...topLevelLines].filter(x => !/^\d+(?:[.,]\d+)?\s*(?:h|hr|hrs|hora|horas)(?:\s*\([^)]*\))?$/i.test(x));
        const detalles = [...new Map(rawDetails.map(x => [utils.normalizeText(x), x])).values()].slice(0, 12);
        const hrs = serviceDurationHours(servicio,catalogMatch);
        const hourly = billingMode({...catalogMatch, ...servicio}) === 'hora';
        const duracion = hourly ? `${cant} ${cant === 1 ? 'Hora' : 'Horas'}` : (hrs > 0 ? `${hrs} ${hrs === 1 ? 'Hora' : 'Horas'}` : '—');
        return { cant, duracion, detalles, hourly, precio: utils.safeNum(servicio.precio) };
    };

    const invoiceConceptDescription = (servicio, info) => {
        const n = utils.normalizeText(servicio?.nombre || '');
        if (n.includes('plan')) return 'Paquete de entretenimiento para evento.';
        if (n.includes('personaje')) return 'Servicio de personaje y entretenimiento para evento.';
        if (n.includes('show') || n.includes('animacion') || n.includes('animación')) return 'Servicio de entretenimiento para evento.';
        if (n.includes('brincolin') || n.includes('brincolín') || n.includes('inflable')) return 'Servicio recreativo para evento.';
        const first = Array.isArray(info?.detalles) ? info.detalles.find(Boolean) : '';
        return first ? String(first) : 'Servicio contratado para el evento.';
    };

    const BrandHeader = () => (<>
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#7657FF] via-[#8B5CF6] to-[#FF3EA5]" />
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-gradient-to-br from-[#FF3EA5]/10 via-[#8B5CF6]/8 to-[#7657FF]/5 pointer-events-none" />
        <div className="flex justify-between items-start relative z-10">
            <div className="flex items-center gap-4">
                <div className="bg-white p-2.5 rounded-[18px] border border-slate-100 shadow-sm w-[138px]"><img src={logoUrl} alt={brandName} className="h-12 w-full object-contain" crossOrigin="anonymous" /></div>
                <div><p className="text-[10px] font-black tracking-[0.23em] text-[#7657FF] uppercase">{brandName}</p><p className="text-[9px] font-semibold text-slate-400 mt-1">{appSettings.empresa.email} · {appSettings.empresa.telefono}</p><p className="text-[9px] font-semibold text-slate-400">{appSettings.empresa.web}</p></div>
            </div>
            <div className="text-right relative z-20"><div className="inline-block border border-slate-200 px-4 py-2 rounded-xl" style={{backgroundColor:'#F8FAFC', color:'#0F172A'}}><p className="text-[8px] font-black tracking-[0.18em] uppercase" style={{color:'#94A3B8'}}>Nº Documento</p><p className="text-[14px] font-black mt-0.5" style={{color:'#0F172A', WebkitTextFillColor:'#0F172A'}}>{numRef}</p></div><p className="text-[9px] font-bold mt-2" style={{color:'#94A3B8'}}>Emisión: {fechaEmision}</p>{isC&&<p className="text-[9px] font-black mt-1" style={{color:'#8B5CF6'}}>Válida hasta: {fechaValidaHasta}</p>}</div>
        </div>
        <div className="mt-5 mb-5 relative z-10"><h1 className="text-[25px] font-black tracking-[0.16em] text-center" style={{color:'#5B4BE8', WebkitTextFillColor:'#5B4BE8', background:'transparent'}}>{docTitle}</h1>{isContrato && <p className="text-center text-[8px] font-black tracking-[0.3em] text-slate-400 uppercase mt-1">Eventos infantiles y sociales</p>}{isC && <p className="text-center text-[9px] font-bold text-slate-400 mt-1">Propuesta comercial sujeta a disponibilidad al momento de confirmar</p>}</div>
    </>);

    const InfoCards = ({ compact=false }) => (<div className={`grid grid-cols-2 gap-4 ${compact?'mb-4':'mb-5'} relative z-10`}>
        <div className="bg-slate-50/80 rounded-2xl border border-slate-100 p-4"><p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#8B5CF6] mb-3 flex items-center gap-1.5"><Users size={12}/> Datos del cliente</p><div className="space-y-1.5 text-[9.5px]"><p><span className="text-slate-400 font-bold">Nombre:</span> <strong className="float-right text-slate-800 max-w-[190px] truncate">{cli || '—'}</strong></p><p><span className="text-slate-400 font-bold">Teléfono:</span> <strong className="float-right text-slate-800">{tel || '—'}</strong></p>{emailStr&&<p><span className="text-slate-400 font-bold">Correo:</span> <strong className="float-right text-slate-800 max-w-[190px] truncate">{emailStr}</strong></p>}{rucStr&&<p><span className="text-slate-400 font-bold">RUC / ID fiscal:</span> <strong className="float-right text-slate-800 max-w-[180px] truncate">{rucStr}</strong></p>}</div></div>
        <div className="bg-slate-50/80 rounded-2xl border border-slate-100 p-4"><p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#7657FF] mb-3 flex items-center gap-1.5"><Calendar size={12}/> Detalles del evento</p><div className="space-y-1.5 text-[9.5px]"><p><span className="text-slate-400 font-bold">Fecha:</span> <strong className="float-right text-slate-800">{fechaEvento}</strong></p><p><span className="text-slate-400 font-bold">Horario:</span> <strong className="float-right text-slate-800">{horaStr || 'Por definir'}</strong></p><p><span className="text-slate-400 font-bold">Zona:</span> <strong className="float-right text-slate-800 max-w-[180px] truncate">{ubi}</strong></p>{dir&&<p className="pt-1 text-[8.5px] text-slate-500 italic line-clamp-2 text-right">{dir}</p>}</div></div>
    </div>);

    const FooterBrand = () => (<div className="mt-auto pt-3 relative z-10"><div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-3"/><div className="flex justify-between items-center"><p className="text-[8px] font-bold text-slate-400">{brandName} · {appSettings.empresa.telefono}</p><p className="text-[10px] font-black italic text-[#8B5CF6]">¡Hacemos de tu evento un momento inolvidable!</p></div></div>);

    const Invoice = () => (<>
        <BrandHeader/><InfoCards/>
        <div className="relative z-10 border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-[10px]"><thead className="bg-gradient-to-r from-[#7657FF]/7 to-[#FF3EA5]/7"><tr className="text-[8px] uppercase tracking-wider text-slate-500"><th className="p-3 text-center w-[8%]">Cant.</th><th className="p-3 text-left w-[42%]">Concepto / Servicio</th><th className="p-3 text-center w-[16%]">Duración</th><th className="p-3 text-right w-[17%]">P. Unit.</th><th className="p-3 text-right w-[17%]">Total</th></tr></thead><tbody className="divide-y divide-slate-100">
            {sA.map((s,i)=>{const x=serviceInfo(s); return <tr key={i}><td className="p-3 text-center font-bold">{x.cant}{x.hourly ? ' h' : ''}</td><td className="p-3"><p className="font-black text-slate-900">{String(s.nombre)}</p><p className="text-[8.5px] text-slate-400 mt-1">{invoiceConceptDescription(s, x)}</p></td><td className="p-3 text-center font-bold text-[#8B5CF6]">{x.duracion}</td><td className="p-3 text-right font-bold">B/. {(x.precio/x.cant).toFixed(2)}</td><td className="p-3 text-right font-black">B/. {x.precio.toFixed(2)}</td></tr>})}
            {trn>0&&<tr><td className="p-3 text-center font-bold">1</td><td className="p-3"><p className="font-black">Viáticos / Transporte</p><p className="text-[8.5px] text-slate-400 mt-1">Cobertura logística a {ubi}.</p></td><td className="p-3 text-center">—</td><td className="p-3 text-right font-bold">B/. {trn.toFixed(2)}</td><td className="p-3 text-right font-black">B/. {trn.toFixed(2)}</td></tr>}
            </tbody></table>
        </div>
        <div className="grid grid-cols-[1.15fr_.85fr] gap-5 mt-5 relative z-10">
            <div className="space-y-4"><div className="bg-slate-50 rounded-2xl border border-slate-100 p-4"><p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#7657FF] mb-2 flex items-center gap-1.5"><Briefcase size={12}/> Datos para transferencia</p><div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px]"><p><b>Banco:</b> {appSettings.empresa.banco}</p><p><b>Tipo:</b> {appSettings.empresa.tipoCuenta}</p><p><b>Cuenta:</b> <span className="text-[#7657FF] font-black">{appSettings.empresa.numeroCuenta}</span></p><p><b>Yappy/Cel:</b> <span className="text-[#8B5CF6] font-black">{appSettings.empresa.telefono}</span></p><p className="col-span-2 truncate"><b>Titular:</b> {appSettings.empresa.nombreTitular}</p></div></div><div className="bg-blue-50/60 rounded-2xl border border-blue-100 p-4"><p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#7657FF] mb-2">Información del documento</p><p className="text-[9px] text-slate-500 leading-relaxed font-semibold">Factura correspondiente a los servicios reservados para el evento indicado. El detalle contractual completo y las condiciones del servicio se encuentran en el contrato asociado.</p></div></div>
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm h-fit"><div className="flex justify-between px-4 py-3 text-[10px] bg-slate-50"><b>Subtotal servicios</b><b>B/. {subServicios.toFixed(2)}</b></div>{trn>0&&<div className="flex justify-between px-4 py-3 text-[10px] border-t border-slate-100"><b>Transporte</b><b>B/. {trn.toFixed(2)}</b></div>}<div className="flex justify-between px-4 py-3 text-[11px] border-t border-slate-100"><b>TOTAL FACTURADO</b><b>B/. {tot.toFixed(2)}</b></div><div className="flex justify-between px-4 py-3 text-[10px] border-t border-slate-100 bg-emerald-50 text-emerald-700"><b>Abono recibido</b><b>- B/. {abo.toFixed(2)}</b></div><div className="bg-gradient-to-r from-[#7657FF] to-[#8B5CF6] text-white p-4 text-center"><p className="text-[8px] font-black tracking-[0.2em] uppercase">Saldo pendiente</p><p className="text-[27px] leading-none font-black mt-1">B/. {saldo.toFixed(2)}</p></div></div>
        </div><FooterBrand/>
    </>);

    const Quote = () => (<>
        <BrandHeader/><InfoCards compact/>
        <div className="relative z-10 border border-slate-100 rounded-2xl overflow-hidden shadow-sm"><table className="w-full text-[9px]"><thead className="bg-gradient-to-r from-[#7657FF]/7 to-[#FF3EA5]/7"><tr className="text-[7.5px] uppercase tracking-wider text-slate-500"><th className="p-2.5 text-left w-[28%]">Paquete / Servicio</th><th className="p-2.5 text-left w-[47%]">Qué incluye</th><th className="p-2.5 text-center w-[10%]">Duración</th><th className="p-2.5 text-right w-[15%]">Precio</th></tr></thead><tbody className="divide-y divide-slate-100">{sA.map((s,i)=>{const x=serviceInfo(s);return <tr key={i}><td className="p-3 align-top"><p className="font-black text-[10px] text-slate-900">{String(s.nombre)}</p>{x.cant>1&&<p className="text-[8px] text-slate-400 mt-1">Cantidad: {x.cant}</p>}</td><td className="p-3 align-top"><div className="grid grid-cols-1 gap-0.5">{(x.detalles.length?x.detalles:['Servicio personalizado según lo conversado.']).slice(0,6).map((d,j)=><p key={j} className="text-[8.2px] text-slate-600 flex gap-1"><span className="text-[#FF3EA5]">•</span><span>{d}</span></p>)}</div></td><td className="p-3 text-center align-middle font-black text-[#8B5CF6]">{x.duracion}</td><td className="p-3 text-right align-middle font-black text-[11px]">B/. {x.precio.toFixed(2)}</td></tr>})}{trn>0&&<tr><td className="p-3 font-black">Viáticos / Transporte</td><td className="p-3 text-slate-500">Traslado y cobertura logística a {ubi}.</td><td className="p-3 text-center">—</td><td className="p-3 text-right font-black">B/. {trn.toFixed(2)}</td></tr>}</tbody></table></div>
        <div className="grid grid-cols-[1.2fr_.8fr] gap-5 mt-5 relative z-10"><div className="bg-slate-50 rounded-2xl border border-slate-100 p-4"><p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#8B5CF6] mb-2">Condiciones de la propuesta</p><div className="text-[9px] text-slate-500 font-semibold leading-relaxed space-y-1"><p>• La fecha queda reservada únicamente al confirmarse el abono acordado.</p><p>• La disponibilidad se confirma al momento de aceptar esta cotización.</p><p>• Cambios de horario, ubicación o servicios pueden modificar el valor final.</p><p>• Esta cotización no constituye comprobante de pago.</p><p>• Vigencia: {vigenciaDias} {vigenciaDias===1?'día':'días'}, hasta el {fechaValidaHasta}.</p></div></div><div className="rounded-2xl overflow-hidden border border-slate-200 h-fit"><div className="px-4 py-3 flex justify-between text-[10px] bg-slate-50"><b>Servicios</b><b>B/. {subServicios.toFixed(2)}</b></div>{trn>0&&<div className="px-4 py-3 flex justify-between text-[10px] border-t border-slate-100"><b>Transporte</b><b>B/. {trn.toFixed(2)}</b></div>}<div className="bg-gradient-to-r from-[#7657FF] to-[#FF3EA5] text-white px-4 py-4 text-center"><p className="text-[8px] font-black tracking-[0.2em] uppercase">Inversión propuesta</p><p className="text-[26px] font-black leading-none mt-1">B/. {tot.toFixed(2)}</p></div></div></div>
        <div className="mt-5 bg-gradient-to-r from-[#7657FF]/5 via-[#8B5CF6]/5 to-[#FF3EA5]/5 border border-[#8B5CF6]/10 rounded-2xl p-4 text-center relative z-10"><p className="text-[11px] font-black text-slate-800">¿Deseas reservar esta experiencia?</p><p className="text-[9px] text-slate-500 font-semibold mt-1">Confírmanos por WhatsApp al {appSettings.empresa.telefono} para validar disponibilidad y abono.</p></div><FooterBrand/>
    </>);

    const Contract = () => (<>
        <BrandHeader/><InfoCards compact/>
        <div className="relative z-10 border border-slate-100 rounded-2xl overflow-hidden shadow-sm mb-4"><table className="w-full text-[8.5px]"><thead className="bg-gradient-to-r from-[#7657FF]/7 to-[#FF3EA5]/7"><tr className="text-[7px] uppercase tracking-wider text-slate-500"><th className="p-2 text-left w-[25%]">Servicio</th><th className="p-2 text-left w-[45%]">Todo lo contratado</th><th className="p-2 text-center w-[12%]">Duración</th><th className="p-2 text-right w-[18%]">Precio</th></tr></thead><tbody className="divide-y divide-slate-100">{sA.map((s,i)=>{const x=serviceInfo(s);return <tr key={i}><td className="p-2.5 align-top"><p className="font-black text-slate-900">{String(s.nombre)}</p>{x.cant>1&&<p className="text-[7px] text-slate-400 mt-1">Cant. {x.cant}</p>}</td><td className="p-2.5 align-top">{(x.detalles.length?x.detalles:['Servicio personalizado según lo acordado.']).map((d,j)=><p key={j} className="text-[7.6px] leading-[1.35] text-slate-600">• {d}</p>)}</td><td className="p-2.5 text-center align-middle font-black text-[#8B5CF6]">{x.duracion}</td><td className="p-2.5 text-right align-middle font-black">B/. {x.precio.toFixed(2)}</td></tr>})}{trn>0&&<tr><td className="p-2.5 font-black">Viáticos / Transporte</td><td className="p-2.5 text-slate-500">Traslado y cobertura logística a {ubi}.</td><td className="p-2.5 text-center">—</td><td className="p-2.5 text-right font-black">B/. {trn.toFixed(2)}</td></tr>}</tbody></table></div>
        <div className="grid grid-cols-[1.42fr_.58fr] gap-4 relative z-10">
            <div className="border border-slate-100 rounded-2xl p-4"><p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#7657FF] mb-2.5 flex items-center gap-1.5"><FileSignature size={12}/> Cláusulas y condiciones del servicio</p><div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[7.4px] leading-[1.34] text-slate-600 text-justify">
                <p><b className="text-slate-800">1. Objeto.</b> {shortBrandName} prestará los servicios descritos en este documento, en la fecha, horario y ubicación acordados.</p>
                <p><b className="text-slate-800">2. Reserva y pago.</b> La fecha se confirma mediante el abono acordado. El saldo pendiente deberá cancelarse conforme a las condiciones pactadas para el evento.</p>
                <p><b className="text-slate-800">3. Cancelación.</b> El abono no es reembolsable cuando la cancelación sea ajena a {shortBrandName}. Cualquier reprogramación estará sujeta a disponibilidad.</p>
                <p><b className="text-slate-800">4. Cambios.</b> Modificaciones de fecha, horario, dirección, cantidad o servicios pueden generar ajustes de precio, logística o disponibilidad.</p>
                <p><b className="text-slate-800">5. Obligaciones del cliente.</b> Garantizar acceso seguro, espacio adecuado, permisos del lugar y condiciones necesarias para montaje y operación.</p>
                <p><b className="text-slate-800">6. Obligaciones de {shortBrandName}.</b> Prestar los servicios contratados con personal y equipos adecuados y comunicar oportunamente cualquier situación operativa relevante.</p>
                <p><b className="text-slate-800">7. Horarios y retrasos.</b> El tiempo contratado corresponde al horario acordado. Retrasos imputables al cliente no obligan a extender el servicio.</p>
                <p><b className="text-slate-800">8. Seguridad y equipos.</b> El cliente y sus invitados deberán respetar las instrucciones del personal. {shortBrandName} podrá suspender una actividad ante condiciones inseguras.</p>
                <p><b className="text-slate-800">9. Daños.</b> Daños causados por uso indebido, negligencia de invitados o terceros podrán ser responsabilidad del cliente cuando corresponda.</p>
                <p><b className="text-slate-800">10. Clima y fuerza mayor.</b> Situaciones fuera del control razonable de las partes podrán requerir ajustes, suspensión o reprogramación según disponibilidad.</p>
                <p><b className="text-slate-800">11. Proveedores.</b> {shortBrandName} podrá apoyarse en personal o proveedores para ejecutar componentes del servicio, manteniendo la coordinación del evento.</p>
                <p><b className="text-slate-800">12. Aceptación.</b> La firma o aceptación del presente documento confirma que el cliente conoce el alcance, precio y condiciones aquí indicadas.</p>
            </div></div>
            <div className="space-y-3"><div className="rounded-2xl overflow-hidden border border-slate-200"><div className="p-3 bg-slate-50 flex justify-between text-[8.5px]"><b>Total contratado</b><b>B/. {tot.toFixed(2)}</b></div><div className="p-3 border-t border-slate-100 flex justify-between text-[8.5px] text-emerald-600"><b>Abono</b><b>B/. {abo.toFixed(2)}</b></div><div className="p-3 bg-gradient-to-r from-[#7657FF] to-[#8B5CF6] text-white text-center"><p className="text-[7px] font-black uppercase tracking-widest">Saldo</p><p className="text-[18px] font-black">B/. {saldo.toFixed(2)}</p></div></div><div className="bg-slate-50 border border-slate-100 rounded-2xl p-3"><p className="text-[7px] font-black uppercase tracking-wider text-[#FF3EA5] mb-2">Aceptación y firmas</p><div className="pt-5 border-b border-slate-300 mb-1"></div><p className="text-[7px] text-center font-black text-slate-700 truncate">{cli}</p><p className="text-[6.5px] text-center text-slate-400">Firma del cliente</p><div className="pt-5 border-b border-slate-300 mb-1 mt-2"></div><p className="text-[7px] text-center font-black text-slate-700 truncate">{appSettings.empresa.nombreTitular}</p><p className="text-[6.5px] text-center text-slate-400">{brandName}</p></div></div>
        </div><FooterBrand/>
    </>);

    const ProviderContract = () => (<>
        <BrandHeader/>
        <div className="relative z-10 grid grid-cols-[1.15fr_.85fr] gap-4 mb-4">
            <div className="rounded-2xl border border-[#7657FF]/12 bg-gradient-to-br from-[#F7F4FF] via-white to-[#FFF7FB] p-4">
                <p className="text-[8px] font-black uppercase tracking-[.18em] text-[#7657FF]">Proveedor / contratista independiente</p>
                <p className="text-[18px] leading-tight font-black text-slate-900 mt-2">{cli || 'Proveedor'}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-[8.5px]">
                    <p><span className="text-slate-400 font-bold">WhatsApp:</span> <b className="text-slate-700">{tel || '—'}</b></p>
                    <p><span className="text-slate-400 font-bold">ID / RUC:</span> <b className="text-slate-700">{providerId || '—'}</b></p>
                    {providerEmail && <p className="col-span-2 truncate"><span className="text-slate-400 font-bold">Correo:</span> <b className="text-slate-700">{providerEmail}</b></p>}
                    {providerAddress && <p className="col-span-2"><span className="text-slate-400 font-bold">Dirección:</span> <b className="text-slate-700">{providerAddress}</b></p>}
                </div>
            </div>
            <div className="rounded-2xl bg-slate-950 text-white p-4">
                {isProviderEventContract ? <>
                    <p className="text-[8px] font-black uppercase tracking-[.18em] text-white/55">Asignación específica</p>
                    <p className="text-[12px] font-black mt-2">{providerEvent?.cliente || 'Evento asignado'}</p>
                    <div className="mt-2 space-y-1 text-[8.2px] text-white/72">
                        <p><b className="text-white">Fecha:</b> {providerEvent?.fecha ? String(providerEvent.fecha).split('-').reverse().join('/') : '—'}</p>
                        <p><b className="text-white">Hora:</b> {utils.formatTime12h(providerEvent?.hora || '')}</p>
                        <p><b className="text-white">Ubicación:</b> {providerEvent?.ubicacion || 'Por definir'}</p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/10 flex items-end justify-between gap-3"><div><p className="text-[7px] uppercase tracking-widest text-white/45 font-black">Emisión</p><p className="text-[10px] font-black">{fechaEmision}</p></div><div className="text-right"><p className="text-[7px] uppercase tracking-widest text-white/45 font-black">Total proveedor</p><p className="text-[16px] font-black">B/. {providerTotal.toFixed(2)}</p></div></div>
                </> : <>
                    <p className="text-[8px] font-black uppercase tracking-[.18em] text-white/55">Naturaleza del acuerdo</p>
                    <p className="text-[12px] font-black mt-2">Contrato marco de servicios</p>
                    <p className="text-[8.5px] leading-relaxed text-white/70 mt-2">Acuerdo general para futuras asignaciones independientes. Las tarifas listadas corresponden al perfil del proveedor y no representan una reserva concreta.</p>
                    <div className="mt-3 pt-3 border-t border-white/10"><p className="text-[7px] uppercase tracking-widest text-white/45 font-black">Emisión</p><p className="text-[10px] font-black">{fechaEmision}</p></div>
                </>}
            </div>
        </div>

        <div className="relative z-10 rounded-2xl border border-slate-100 overflow-hidden mb-4">
            <div className="px-4 py-2.5 bg-slate-50 flex items-center justify-between gap-3">
                <p className="text-[8px] font-black uppercase tracking-[.18em] text-[#7657FF]">{isProviderEventContract ? 'Servicios seleccionados para este evento' : 'Servicios y tarifas del proveedor'}</p>
                <p className="text-[7.5px] font-bold text-slate-400 text-right">{isProviderEventContract ? 'Solo se muestran los servicios asignados en la reserva.' : 'Catálogo general del proveedor.'}</p>
            </div>
            <table className="w-full text-[8.5px]"><thead className="bg-white"><tr className="text-[7px] uppercase tracking-wider text-slate-400"><th className="p-2.5 text-left">Servicio</th><th className="p-2.5 text-right w-[28%]">{isProviderEventContract ? 'Monto acordado' : 'Tarifa base'}</th></tr></thead><tbody className="divide-y divide-slate-100">
                {providerServices.length > 0 ? providerServices.map((srv,i)=><tr key={srv.id||i}><td className="p-2.5 font-bold text-slate-700">{srv.nombre || 'Servicio'}{Number(srv.cantidad)>1 ? ` ×${Number(srv.cantidad)}` : ''}</td><td className="p-2.5 text-right font-black text-slate-900">{utils.safeNum(srv.costo)>0?`B/. ${utils.safeNum(srv.costo).toFixed(2)}`:'Por acordar'}</td></tr>) : <tr><td colSpan="2" className="p-4 text-center text-[8px] font-bold text-rose-500">No hay servicios de este proveedor asignados a esta reserva.</td></tr>}
            </tbody>{isProviderEventContract && <tfoot><tr className="bg-[#7657FF]/5 border-t border-[#7657FF]/10"><td className="p-3 text-right text-[8px] uppercase tracking-[.14em] font-black text-[#7657FF]">Total a pagar</td><td className="p-3 text-right text-[13px] font-black text-slate-950">B/. {providerTotal.toFixed(2)}</td></tr></tfoot>}</table>
        </div>

        <div className="relative z-10 grid grid-cols-[1.35fr_.65fr] gap-4">
            <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-[8px] font-black uppercase tracking-[.18em] text-[#7657FF] mb-3 flex items-center gap-1.5"><FileSignature size={11}/> Condiciones del subcontrato</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[7.25px] leading-[1.34] text-slate-600 text-justify">
                    <p><b className="text-slate-800">1. Objeto.</b> El proveedor prestará de forma independiente los servicios que {shortBrandName} le asigne y que este acepte para eventos específicos.</p>
                    <p><b className="text-slate-800">2. Independencia.</b> Este acuerdo no crea relación laboral, subordinación, exclusividad, sociedad ni representación permanente entre las partes.</p>
                    <p><b className="text-slate-800">3. Asignaciones.</b> Fecha, horario, lugar, servicio, tarifa y condiciones particulares se comunicarán para cada evento y se entenderán aceptadas al confirmarlas.</p>
                    <p><b className="text-slate-800">4. Puntualidad.</b> El proveedor deberá presentarse con la anticipación acordada y cumplir íntegramente el horario, vestuario, materiales y funciones asignadas.</p>
                    <p><b className="text-slate-800">5. Calidad y conducta.</b> Mantendrá trato respetuoso, presentación adecuada y estándares compatibles con eventos infantiles y familiares.</p>
                    <p><b className="text-slate-800">6. Honorarios.</b> {shortBrandName} pagará la tarifa acordada para cada asignación, una vez verificada la prestación satisfactoria, salvo acuerdo escrito diferente.</p>
                    <p><b className="text-slate-800">7. Cancelaciones.</b> Reprogramaciones, ausencias o cancelaciones deberán comunicarse con la mayor anticipación posible. Los pagos dependerán del servicio efectivamente prestado y de lo acordado para el evento.</p>
                    <p><b className="text-slate-800">8. Confidencialidad.</b> El proveedor protegerá datos de clientes, precios internos, contactos, logística, fotografías no autorizadas y cualquier información comercial de {shortBrandName}.</p>
                    <p><b className="text-slate-800">9. Relación con clientes.</b> No utilizará una asignación de {shortBrandName} para captar directamente al cliente, negociar servicios paralelos o desviar futuras contrataciones sin autorización.</p>
                    <p><b className="text-slate-800">10. Seguridad y responsabilidad.</b> Cumplirá instrucciones razonables de seguridad y responderá por sus propios equipos, materiales, permisos y actuaciones durante la prestación.</p>
                    <p><b className="text-slate-800">11. Uso de imagen y marca.</b> No podrá usar el nombre, logotipo o material de {shortBrandName} para publicidad propia sin autorización previa.</p>
                    <p><b className="text-slate-800">12. Aceptación.</b> La firma confirma que las partes comprenden el carácter independiente del acuerdo y aceptan sus condiciones generales.</p>
                </div>
            </div>
            <div className="space-y-3">
                <div className="rounded-2xl bg-amber-50/70 border border-amber-100 p-3">
                    <p className="text-[7px] font-black uppercase tracking-wider text-amber-600">Condición de pago</p>
                    <p className="text-[8px] font-semibold text-slate-600 mt-1.5 leading-relaxed">{providerPaymentTerms}</p>
                    {isProviderEventContract && <div className="mt-2 pt-2 border-t border-amber-200/60 flex justify-between items-center gap-2"><span className="text-[7px] font-black uppercase tracking-wider text-amber-700">Total acordado</span><span className="text-[12px] font-black text-slate-900">B/. {providerTotal.toFixed(2)}</span></div>}
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                    <p className="text-[7px] font-black uppercase tracking-wider text-[#7657FF]">Coordinación</p>
                    <p className="text-[8px] font-semibold text-slate-600 mt-1.5 leading-relaxed">Cada evento podrá incluir instrucciones adicionales de horario, contacto, ubicación, uniforme, materiales o protocolo operativo.</p>
                </div>
                <div className="rounded-2xl border border-slate-100 p-3">
                    <p className="text-[7px] font-black uppercase tracking-wider text-slate-400">Firma {shortBrandName}</p>
                    <div className="h-9 border-b border-slate-300"></div>
                    <p className="text-[7.5px] text-center font-black text-slate-700 mt-1">{appSettings.empresa.nombreTitular}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 p-3">
                    <p className="text-[7px] font-black uppercase tracking-wider text-slate-400">Firma proveedor</p>
                    <div className="h-9 border-b border-slate-300"></div>
                    <p className="text-[7.5px] text-center font-black text-slate-700 mt-1">{cli || 'Proveedor'}</p>
                </div>
            </div>
        </div>
        <div className="relative z-10 mt-3 rounded-xl bg-[#7657FF]/5 border border-[#7657FF]/10 px-4 py-2 text-[7.4px] text-slate-500 font-semibold">{isProviderEventContract ? 'Este subcontrato corresponde exclusivamente a los servicios seleccionados para el evento indicado. Cualquier servicio adicional deberá acordarse y registrarse por separado.' : 'Documento marco de coordinación de servicios. Las condiciones particulares de cada evento prevalecen cuando hayan sido aceptadas expresamente por ambas partes.'}</div>
        <FooterBrand/>
    </>);

    return (<div className="bg-[#172235] min-h-screen text-slate-900 flex flex-col font-sans overflow-x-hidden animate-fadeIn relative z-[99999]">
        <style>{`@media print{body *{visibility:hidden;}#pdf-wrapper-scaler,#pdf-wrapper-scaler *{visibility:visible;}#pdf-wrapper-scaler{position:absolute;left:0;top:0;width:100%;transform:scale(1)!important;margin:0;}.print\\:hidden{display:none!important;}@page{size:A4;margin:0;}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}}`}</style>
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md shadow-lg flex flex-col sm:flex-row justify-between items-center z-50 print:hidden border-b border-slate-800 p-4 gap-4"><button type="button" onClick={onClose} className="text-white flex items-center font-bold hover:text-indigo-400 self-start sm:self-auto"><X size={20} className="mr-1"/> Atrás</button><div className="flex flex-wrap gap-2 justify-end w-full sm:w-auto"><button type="button" onClick={onPrint} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center shadow-lg text-sm"><Printer size={16} className="mr-2"/> Imprimir PDF</button><button type="button" onClick={onShare} className="bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-bold flex items-center shadow-lg text-sm"><Share2 size={16} className="mr-2"/> Compartir</button><button type="button" onClick={onDownload} className="bg-violet-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center shadow-lg text-sm"><Download size={16} className="mr-2"/> Guardar</button></div></div>
        <div className="w-full flex-1 flex justify-center pb-12 pt-8 overflow-hidden"><div style={{width:`${794*pdfScale}px`,height:`${1123*pdfScale}px`,position:'relative'}}><div id="pdf-wrapper-scaler" style={{transform:`scale(${pdfScale})`,transformOrigin:'top left',width:'794px',position:'absolute',top:0,left:0}}><div id="pdf-content" className="bg-white w-[794px] h-[1123px] relative overflow-hidden font-sans text-slate-800 px-10 pt-9 pb-7 flex flex-col">{isContratoProv?<ProviderContract/>:isContrato?<Contract/>:isC?<Quote/>:<Invoice/>}</div></div></div></div>
    </div>);
});

export default PdfTemplate;
