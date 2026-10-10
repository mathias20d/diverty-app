import {useEffect,useRef,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {auth} from './firebase';
import {DEFAULT_COMPANY,companyDetails} from './documents.mjs';
import {companyKey,preferencesKey,DEFAULT_PREFERENCES,readPreferences,readCompany} from './admin-settings.mjs';
export default function useAdminSettings(){
 const uid=auth.currentUser.uid,[company,setCompany]=useState(DEFAULT_COMPANY),[preferences,setPreferences]=useState(DEFAULT_PREFERENCES),[ready,setReady]=useState(false),[error,setError]=useState(''),[saving,setSaving]=useState(false),[retry,setRetry]=useState(0),queue=useRef(Promise.resolve()),alive=useRef(true),pending=useRef(0);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{let active=true;setReady(false);setError('');Promise.all([AsyncStorage.getItem(companyKey(uid)),AsyncStorage.getItem(preferencesKey(uid))]).then(([a,b])=>{if(active){setCompany(readCompany(a));setPreferences(readPreferences(b));setReady(true);}}).catch(()=>{if(active)setError('No pudimos leer los ajustes guardados. Reintenta antes de editarlos.');});return()=>{active=false;};},[uid,retry]);
 function write(key,value,accept){
  if(!ready)return Promise.reject(new Error('SETTINGS_NOT_READY'));
  pending.current++;setSaving(true);setError('');
  const job=queue.current.then(()=>AsyncStorage.setItem(key,JSON.stringify(value))).then(()=>{if(alive.current)accept(value);}).catch(err=>{if(alive.current)setError('No se pudieron guardar los ajustes en este teléfono. Tus cambios siguen en el formulario.');throw err;}).finally(()=>{pending.current--;if(alive.current)setSaving(pending.current>0);});queue.current=job.catch(()=>{});return job;
 }
 return {company,preferences,ready,error,saving,reload:()=>setRetry(n=>n+1),acceptCompany:setCompany,saveCompany:value=>write(companyKey(uid),companyDetails(value),setCompany),savePreferences:value=>write(preferencesKey(uid),readPreferences(JSON.stringify(value)),setPreferences)};
}
