const clone=x=>JSON.parse(JSON.stringify(x));
const rows=window.__rows;
export const getFirestore=()=>({});
export const enableIndexedDbPersistence=async()=>{};
export const collection=(_,...parts)=>({path:parts.join('/'),id:parts.at(-1)});
export const doc=collection;
export const where=(field,op,value)=>({field,op,value});
export const orderBy=field=>({sort:field});
export const limit=count=>({count});
export const startAfter=row=>({after:row.id});
export const documentId=()=> '__id';
export const query=(ref,...filters)=>({...ref,filters});
const snap=(path)=>({id:path.split('/').at(-1),exists:()=>!!rows[path],data:()=>clone(rows[path]||{})});
const snapshot=ref=>{
 let paths=Object.keys(rows).filter(path=>path.startsWith(ref.path+'/')&&path.slice(ref.path.length+1).indexOf('/')<0).sort();
 for(const f of ref.filters||[]){
  if(f.field)paths=paths.filter(path=>f.op==='>='?rows[path][f.field]>=f.value:f.op==='<='?rows[path][f.field]<=f.value:f.op==='in'?f.value.includes(rows[path][f.field]):rows[path][f.field]===f.value);
  if(f.after)paths=paths.filter(path=>path.split('/').at(-1)>f.after);
  if(f.count)paths=paths.slice(0,f.count);
 }
 const docs=paths.map(snap);return {docs,size:docs.length,empty:!docs.length,docChanges:()=>docs.map(doc=>({type:'added',doc}))};
};
export const getDoc=async ref=>snap(ref.path);
export const getDocs=async ref=>snapshot(ref);
export const getDocsFromCache=getDocs;
export const onSnapshot=(ref,options,next)=>{if(typeof options==='function')next=options;let active=true;queueMicrotask(()=>active&&next(ref.filters||ref.path.split('/').length%2?snapshot(ref):snap(ref.path)));return ()=>active=false;};
export const setDoc=async(ref,data,options)=>{rows[ref.path]=options?.merge?{...rows[ref.path],...clone(data)}:clone(data);window.__writes.push({path:ref.path,data:clone(rows[ref.path])});};
export const deleteDoc=async ref=>delete rows[ref.path];
export const runTransaction=async(_db,callback)=>{if(window.__failClosureSave)throw new Error('Simulated network failure');return callback({get:getDoc,set:(...args)=>setDoc(...args),delete:deleteDoc});};
export const writeBatch=()=>({set:setDoc,delete:deleteDoc,commit:async()=>{}});
