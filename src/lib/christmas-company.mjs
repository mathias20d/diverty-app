import {doc,runTransaction} from 'firebase/firestore';
import {db} from '../christmas-core.jsx';
import {ADMIN_UID} from './firebase-auth.mjs';
export function companyIdFor(uid){if(!/^[-_A-Za-z0-9]{1,128}$/.test(uid||''))throw Error('ACCOUNT_REQUIRED');return uid===ADMIN_UID?'diverty-oficial':'navidad_'+uid;}
export async function ensureChristmasCompany(user,name){
 if(!user||user.isAnonymous)throw Error('ACCOUNT_REQUIRED');if(user.uid===ADMIN_UID)return;
 const appId=companyIdFor(user.uid),ref=(section,id)=>doc(db,'artifacts',appId,'public','data',section,id),business=String(name||user.displayName||'Mi empresa').replace(/[<>]/g,'').trim().slice(0,100);
 const rows=[['configuracion','empresaNavidad',{nombre:business,ownerUid:user.uid,createdAt:new Date().toISOString()}],['config_web','global',{nombreEmpresa:business,telefonoEmpresa:'',publicado:false,capacidadSanta:1,centralBookingValidation:true,whatsappBookingEnabled:false}],['categorias_web','navidad',{nombre:'Navidad',activo:true,visible:true,orden:1}],['temas_web','navidad',{nombre:'Navidad',tipo:'christmas',isDefault:true,colorPrimario:'#B91C1C'}],['config_web','web_sync',{version:1,versions:{config_web:1,categorias_web:1,catalogo_web:1,temas_web:1}}]];
 await runTransaction(db,async tx=>{const snapshots=await Promise.all(rows.map(([section,id])=>tx.get(ref(section,id))));rows.forEach(([section,id,data],index)=>{if(!snapshots[index].exists())tx.set(ref(section,id),data);});});
}
