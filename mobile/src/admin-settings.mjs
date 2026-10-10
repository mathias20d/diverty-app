import {DEFAULT_COMPANY,companyDetails} from './documents.mjs';
import {financeSummary,financialEvent,sortEvents,quote,webRequest,archived,visibleEvent} from './workspace-data.mjs';
export const ADMIN_MENU=[['inicio','Inicio'],['agenda','Agenda'],['clientes','Clientes'],['proveedores','Proveedores'],['finanzas','Finanzas'],['web','Web'],['ajustes','Ajustes']];
export const SETTINGS_MENU=[['business','Mi negocio','Logo, identidad e información general.'],['billing','Facturación y banco','Datos fiscales y cuenta bancaria para documentos.'],['goal','Meta mensual','Objetivo de ventas y seguimiento.'],['notifications','Notificaciones','Push, alertas web y permisos.'],['resources','Personal disponible','Animadores y payasos disponibles por horario.'],['documents','Documentos','Información para contratos y facturas.'],['tools','Herramientas del sistema','Mantenimiento y numeración.'],['security','Seguridad y sesión','Cerrar sesión y gestión de acceso.'],['danger','Zona de peligro','Acciones avanzadas del sistema.']];
export const DEFAULT_PREFERENCES={metaMensual:1500,christmasModuleVisible:true};
export const companyKey=uid=>`diverty-document-company:${uid}`;
export const preferencesKey=uid=>`diverty-native-settings:${uid}`;
export function readPreferences(value){
 let saved;try{saved=JSON.parse(value);}catch{return {...DEFAULT_PREFERENCES};}
 if(!saved||typeof saved!=='object'||Array.isArray(saved))return {...DEFAULT_PREFERENCES};
 return {...saved,metaMensual:saved.metaMensual!=null&&Number.isFinite(Number(saved.metaMensual))&&Number(saved.metaMensual)>=0?Number(saved.metaMensual):1500,christmasModuleVisible:saved.christmasModuleVisible!==false};
}
export function readCompany(value){return value?companyDetails({...DEFAULT_COMPANY,...JSON.parse(value)}):{...DEFAULT_COMPANY};}
export function resourcesFromConfig(config={}){
 const count=(value,fallback,min,max)=>Number.isInteger(Number(value))&&value!=null&&Number(value)>=min&&Number(value)<=max?Number(value):fallback;
 return {animadores:count(config.recursosDisponibles?.animadores,3,0,50),payasos:count(config.recursosDisponibles?.payasos,1,0,50),capacidadSimultanea:count(config.capacidadSimultanea,3,1,100),capacidadSanta:count(config.capacidadSanta,1,1,20)};
}
export function capacityPayload(form){
 for(const [key,min,max] of [['animadores',0,50],['payasos',0,50],['capacidadSimultanea',1,100],['capacidadSanta',1,20]])if(form[key]==null||String(form[key]).trim()===''||!Number.isInteger(Number(form[key]))||Number(form[key])<min||Number(form[key])>max)throw new Error(`Revisa ${key}: debe ser un entero entre ${min} y ${max}.`);
 return {recursosDisponibles:{animadores:Number(form.animadores),payasos:Number(form.payasos)},capacidadSimultanea:Number(form.capacidadSimultanea),capacidadSanta:Number(form.capacidadSanta)};
}
export async function saveCapacity({runTransaction,db,ref,syncRef,form,original,now=new Date().toISOString()}){
 const payload=capacityPayload(form);
 return runTransaction(db,async tx=>{
  const snapshot=await tx.get(ref),sync=await tx.get(syncRef),current=snapshot.data()||{};
  if(JSON.stringify(resourcesFromConfig(current))!==JSON.stringify(resourcesFromConfig(original)))throw new Error('CAPACITY_CHANGED');
  tx.set(ref,{...payload,updatedAt:now},{merge:true});
  const previous=sync.data()||{};
  tx.set(syncRef,{version:Number(previous.version||0)+1,versions:{...previous.versions,config_web:Number(previous.versions?.config_web||0)+1},updatedAt:now},{merge:true});
  return {...current,...payload,updatedAt:now};
 });
}
export function homeSummary(events,today,goal=1500){
 const active=sortEvents(events).filter(financialEvent),month=active.filter(e=>e.fecha?.startsWith(today.slice(0,7))),finance=financeSummary(month),date=new Date(`${today}T12:00:00Z`),offset=(date.getUTCDay()+6)%7,start=new Date(date);start.setUTCDate(date.getUTCDate()-offset);const end=new Date(start);end.setUTCDate(start.getUTCDate()+6);const tomorrow=new Date(date);tomorrow.setUTCDate(date.getUTCDate()+1);
 const day=value=>value.toISOString().slice(0,10),todayEvents=active.filter(e=>e.fecha===today);
 return {finance,today:todayEvents,tomorrow:active.filter(e=>e.fecha===day(tomorrow)),week:active.filter(e=>e.fecha>=day(start)&&e.fecha<=day(end)&&e.estado!=='Completado'),upcoming:active.filter(e=>e.fecha>=today&&e.estado!=='Completado'),quotes:sortEvents(events).filter(e=>quote(e)&&!archived(e)),requests:events.filter(e=>visibleEvent(e)&&webRequest(e)),goal:Number(goal)||0,progress:goal>0?Math.min(100,finance.total/goal*100):0};
}
