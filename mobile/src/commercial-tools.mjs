import {normalize} from './workspace-data.mjs';
import {billingMode,unitPrice} from './domain/reservation-lines.mjs';
import {validDate} from './domain/date-availability.mjs';
export function commercialPatch(form,quoteMode,today){
 const patch={};for(const key of ['ruc','tipoEvento','ninos','direccion','referenciaLugar'])if(form[key]!==undefined)patch[key]=String(form[key]).trim();
 if(patch.ninos&&!/^\d+$/.test(patch.ninos))throw new Error('La cantidad de niños debe ser un número entero.');
 if(quoteMode){const days=Number(form.vigenciaCotizacion??7),issue=form.fechaEmisionCotizacion||today;if(!Number.isInteger(days)||days<1||days>365)throw new Error('La vigencia debe ser de 1 a 365 días.');if(!validDate(issue))throw new Error('La fecha de emisión no es válida.');patch.vigenciaCotizacion=days;patch.fechaEmisionCotizacion=issue;patch.estado=form.estado==='Cot. Aprobada'?'Cot. Aprobada':'Cotización';}
 return patch;
}
export async function saveCustomService({runTransaction,db,ref,line,id}){
 const nombre=String(line.nombre||'').trim(),precio=unitPrice(line);if(!nombre||!Number.isFinite(precio)||precio<0)throw new Error('Revisa el nombre y precio del servicio.');
 return runTransaction(db,async tx=>{const snap=await tx.get(ref),rows=snap.data()?.paquetes||[];if(!Array.isArray(rows))throw new Error('El catálogo necesita revisión.');const existing=[...rows].reverse().find(row=>normalize(row.nombre).trim()===normalize(nombre).trim());if(existing)return existing;
 const tipoCobro=billingMode(line),item={id,nombre,precio,short:nombre.substring(0,12)+'...',descripcion:line.descripcion||'Servicio personalizado.',incluye:Array.isArray(line.incluye)?line.incluye:[],duracionHoras:Number(line.duracionHoras)||0,tipoCobro,isHourly:tipoCobro==='hora',isCustom:true};tx.set(ref,{paquetes:[...rows,item]},{merge:true});return item;});
}
export async function hideClient({runTransaction,db,ref,client}){
 return runTransaction(db,async tx=>{const snap=await tx.get(ref),rows=snap.data()?.clients||[];if(!Array.isArray(rows))throw new Error('La lista de clientes ocultos necesita revisión.');const marker=`key:${client.key}`;tx.set(ref,{clients:[...new Set([...rows,marker])]},{merge:true});});
}
