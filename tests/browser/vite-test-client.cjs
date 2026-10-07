// Browser flows use fresh page loads. Disable Vite's development WebSocket so
// dependency optimization/HMR cannot reload a mocked Firestore session mid-test.
module.exports = `const styles=new Map();
export const createHotContext=()=>({data:{},accept(){},dispose(){},prune(){},on(){},off(){},invalidate(){}});
export const updateStyle=(id,css)=>{let style=styles.get(id);if(!style){style=document.createElement('style');document.head.appendChild(style);styles.set(id,style);}style.textContent=css;};
export const removeStyle=id=>{styles.get(id)?.remove();styles.delete(id);};`;
