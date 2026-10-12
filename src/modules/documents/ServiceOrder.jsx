import React from 'react';
import { serviceOrderData } from '../../lib/service-order.mjs';

export default function ServiceOrder({ event, services, catalog, company, logoUrl, emissionDate, formatTime }) {
  const order = serviceOrderData(event, catalog, services);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(order.date) ? order.date.split('-').reverse().join('/') : 'Por definir';
  const categories = ['Puntualidad', 'Presentación del personal', 'Atención y trato', 'Calificación general'];
  return <div className="service-order" data-service-order>
    <style>{`
      .service-order { font-family:Arial,sans-serif; font-size:12px; line-height:1.35; color:#1e293b; display:flex; flex-direction:column; flex:1; overflow-wrap:anywhere; }
      .service-order h1 { font-size:23px; letter-spacing:2px; font-weight:800; color:#5b4be8; text-align:center; margin:10px 0 2px; }
      .service-order h2 { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:#5b4be8; margin:0 0 6px; }
      .service-order .order-header { display:flex; justify-content:space-between; align-items:center; gap:20px; }
      .service-order .order-brand { display:flex; align-items:center; gap:14px; }
      .service-order .order-brand img { width:110px; height:54px; object-fit:contain; }
      .service-order .order-brand strong { display:block; font-size:12px; }
      .service-order .order-reference { text-align:right; max-width:230px; font-size:10px; }
      .service-order .order-reference strong { display:block; font-size:12px; margin:3px 0; }
      .service-order .order-subtitle { text-align:center; color:#64748b; margin-bottom:10px; font-size:11px; }
      .service-order .service-order-block { border:1px solid #d8dce6; border-radius:10px; padding:8px 10px; margin-bottom:8px; break-inside:avoid; }
      .service-order .order-details { display:grid; grid-template-columns:1fr 1fr; gap:4px 20px; }
      .service-order .order-details .order-full { grid-column:1/-1; }
      .service-order .order-label { color:#64748b; font-weight:700; margin-right:6px; }
      .service-order table { width:100%; border-collapse:collapse; table-layout:fixed; }
      .service-order th { font-size:10px; color:#475569; background:#f3f2ff; text-align:left; }
      .service-order td,.service-order th { padding:5px 7px; border:1px solid #d8dce6; vertical-align:top; }
      .service-order tr { break-inside:avoid; }
      .service-order .order-service-name { font-weight:700; }
      .service-order .order-service-description { white-space:pre-line; font-size:10px; color:#475569; margin-top:4px; }
      .service-order .order-staff-row { display:flex; justify-content:space-between; gap:14px; border-bottom:1px solid #e2e8f0; padding:3px 0; }
      .service-order .order-writing-line { height:20px; border-bottom:1px solid #94a3b8; }
      .service-order .order-times { display:flex; justify-content:space-between; gap:16px; margin-top:8px; font-size:11px; }
      .service-order .order-rating { text-align:center; }
      .service-order .order-rating-circle { display:inline-block; width:16px; height:16px; border:1.2px solid #64748b; border-radius:50%; vertical-align:middle; }
      .service-order .order-rating-hint { font-size:10px; color:#475569; margin:0 0 8px; }
      .service-order .service-order-signatures { display:grid; grid-template-columns:1fr 1fr; gap:30px; margin-top:12px; }
      .service-order .order-signature-line { height:40px; border-bottom:1px solid #475569; margin-bottom:6px; }
      .service-order .order-signature-name { height:18px; border-bottom:1px solid #94a3b8; margin-top:6px; }
      .service-order .order-footer { margin-top:auto; padding-top:8px; font-size:9px; color:#64748b; text-align:center; }
      @media print {
        html,body,#root { height:auto!important; overflow:visible!important; background:white!important; }
        .diverty-app-shell { height:auto!important; display:block!important; overflow:visible!important; }
        .app-workspace,.app-navigation,.app-skip-link { display:none!important; }
        .service-order-preview { display:block!important; min-height:0!important; background:white!important; animation:none!important; opacity:1!important; }
        .service-order-preview * { animation:none!important; transition:none!important; }
        .service-order-preview .pdf-preview-area { display:block!important; padding:0!important; overflow:visible!important; }
        .service-order-preview .pdf-preview-page { width:210mm!important; height:auto!important; position:static!important; }
        .service-order-preview #pdf-wrapper-scaler { position:static!important; transform:none!important; }
        .service-order-preview #pdf-content { width:210mm!important; min-height:296.8mm!important; height:auto!important; overflow:visible!important; }
        .service-order thead { display:table-header-group; }
      }
    `}</style>
    <div className="order-header service-order-block">
      <div className="order-brand">{logoUrl && <img src={logoUrl} alt="Diverty" crossOrigin="anonymous"/>}<div><strong>Diverty Eventos Panamá</strong><p>{company.telefono}</p><p>{company.email}</p></div></div>
      <div className="order-reference">Referencia de la reserva<strong>{order.reference}</strong><p>Emisión: {emissionDate}</p></div>
    </div>
    <h1>ORDEN DE SERVICIO</h1>
    <p className="order-subtitle">Entrega al animador o payaso. Completar y firmar al finalizar el evento.</p>
    <section className="service-order-block"><h2>Datos del cliente y del evento</h2><div className="order-details">
      <p className="order-full"><span className="order-label">Cliente:</span>{order.client || 'Por completar'}</p>
      <p><span className="order-label">Celular:</span>{order.phone || 'Por completar'}</p>
      <p><span className="order-label">Fecha:</span>{date}</p>
      <p><span className="order-label">Hora reservada:</span>{formatTime(order.time) || 'Por definir'}</p>
      <p><span className="order-label">Lugar:</span>{order.place || 'Por completar'}</p>
      {order.address && <p className="order-full"><span className="order-label">Dirección:</span>{order.address}</p>}
      {order.venueReference && <p className="order-full"><span className="order-label">Referencia:</span>{order.venueReference}</p>}
    </div></section>
    <section className="service-order-block"><h2>Personal responsable</h2>
      {order.staff.map((person,index)=><div className="order-staff-row" key={index}><strong>{person.name}</strong><span>{person.role}</span></div>)}
      <p style={{marginTop:8}}>Nombre del animador / payaso que realiza el servicio:</p><div className="order-writing-line"/>
      <div className="order-times"><span>Hora real de inicio: ______________</span><span>Hora real de fin: ______________</span></div>
    </section>
    <section style={{marginBottom:12}}><h2>Servicios reservados</h2><table aria-label="Servicios de la orden"><thead><tr><th style={{width:'58%'}}>Servicio / actividad</th><th style={{width:'22%'}}>Cantidad</th><th style={{width:'20%'}}>Duración</th></tr></thead><tbody>
      {order.services.map((service,index)=><tr key={index}><td><p className="order-service-name">{service.name}</p>{service.description && <p className="order-service-description">{service.description}</p>}</td><td>{service.quantity} {service.unit}</td><td>{service.duration}</td></tr>)}
    </tbody></table></section>
    <section className="service-order-block"><h2>Calificación del cliente</h2><p className="order-rating-hint">Marque un círculo por fila: 1 Muy malo · 2 Malo · 3 Regular · 4 Bueno · 5 Excelente.</p>
      <table aria-label="Calificación del servicio"><thead><tr><th style={{width:'45%'}}>Aspecto</th>{[1,2,3,4,5].map(score=><th className="order-rating" key={score}>{score}</th>)}</tr></thead><tbody>
        {categories.map(category=><tr key={category}><td>{category}</td>{[1,2,3,4,5].map(score=><td className="order-rating" key={score}><span className="order-rating-circle" aria-label={`${category}: ${score}`}/></td>)}</tr>)}
      </tbody></table>
    </section>
    <section className="service-order-block"><h2>Observaciones del cliente</h2><div className="order-writing-line"/><div className="order-writing-line"/></section>
    <section className="service-order-block"><h2>Constancia y firmas</h2><p>Dejo constancia de la realización del servicio indicado y de la evaluación registrada en esta orden.</p>
      <div className="service-order-signatures"><div><div className="order-signature-line"/><strong>Firma del cliente / responsable del evento</strong><p>Nombre de quien firma:</p><div className="order-signature-name"/></div><div><div className="order-signature-line"/><strong>Firma del animador / payaso</strong><p>Fecha de firma: ____________________</p></div></div>
    </section>
    <p className="order-footer">Conservar la orden firmada como constancia del servicio y de la opinión del cliente.</p>
  </div>;
}
