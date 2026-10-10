import {useEffect,useState} from 'react';
import {collection,onSnapshot,query,where} from 'firebase/firestore';
import {db,DATA_PATH} from './firebase';
import {sortEvents} from './workspace-data.mjs';

export default function useReservations({start='',end=''}={}){
 const [state,setState]=useState({events:[],loading:true,error:'',cached:false}),[retry,setRetry]=useState(0);
 useEffect(()=>{
  setState({events:[],loading:true,error:'',cached:false});
  const constraints=[];
  if(start)constraints.push(where('fecha','>=',start));
  if(end)constraints.push(where('fecha','<=',end));
  return onSnapshot(query(collection(db,...DATA_PATH,'eventos'),...constraints),{includeMetadataChanges:true},snapshot=>{
   setState({events:sortEvents(snapshot.docs.map(d=>({...d.data(),id:d.id}))),loading:false,error:'',cached:snapshot.metadata.fromCache});
  },()=>setState({events:[],loading:false,error:'No pudimos cargar las reservas. Comprueba tu conexión.',cached:false}));
 },[start,end,retry]);
 return {...state,reload:()=>setRetry(value=>value+1)};
}
