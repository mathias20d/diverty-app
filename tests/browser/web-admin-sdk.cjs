module.exports=`const rows=window.__rows;let serial=0;const clone=x=>JSON.parse(JSON.stringify(x));
export const collection=(_, ...parts)=>({path:parts.join('/')});
export const doc=(first,...parts)=>first?.path?{path:first.path+'/'+(parts[0]||'created-'+(++serial)),id:parts[0]||'created-'+serial}:{path:parts.join('/'),id:parts.at(-1)};
const snap=path=>({id:path.split('/').at(-1),exists:()=>!!rows[path],data:()=>clone(rows[path]||{})});
export const getDoc=async ref=>snap(ref.path);
export const getDocs=async ref=>({docs:Object.keys(rows).filter(p=>p.startsWith(ref.path+'/')&&!p.slice(ref.path.length+1).includes('/')).map(snap)});
export const increment=value=>({__increment:value});
const merge=(old={},next={})=>Object.fromEntries([...new Set([...Object.keys(old),...Object.keys(next)])].map(key=>{const value=next[key];return [key,value===undefined?old[key]:value?.__increment?(Number(old[key])||0)+value.__increment:value&&typeof value==='object'&&!Array.isArray(value)?merge(old[key],value):value];}));
export const writeBatch=()=>{const pending=[];return {set:(ref,data,options)=>pending.push(()=>rows[ref.path]=options?.merge?merge(rows[ref.path],data):clone(data)),delete:ref=>pending.push(()=>delete rows[ref.path]),commit:async()=>{pending.forEach(fn=>fn());window.__commits++;}};};`;
