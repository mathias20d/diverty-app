// Browser flows use fresh page loads. Disable Vite's development WebSocket so
// dependency optimization/HMR cannot reload a mocked Firestore session mid-test.
module.exports = `const styles=new Map();
export const createHotContext=()=>({data:{},accept(){},dispose(){},prune(){},on(){},off(){},invalidate(){}});
export const injectQuery=(url,query)=>{if(url[0]!=='.'&&url[0]!=='/')return url;const pathname=url.replace(/[?#].*$/,'');const {search,hash}=new URL(url,'http://vite.dev');return pathname+'?'+query+(search?'&'+search.slice(1):'')+hash;};
export const updateStyle=(id,css)=>{let style=styles.get(id);if(!style){style=document.createElement('style');document.head.appendChild(style);styles.set(id,style);}style.textContent=css;};
export const removeStyle=id=>{styles.get(id)?.remove();styles.delete(id);};`;
