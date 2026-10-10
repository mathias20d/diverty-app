import { EMPTY_PRODUCT_OPTIONS, productOptionsFromItem, productOptionsForSave } from './domain/catalog-product.mjs';
import { themeOptionsFromItem, themeOptionsForSave } from './domain/theme-options.mjs';
import {validDate} from './domain/date-availability.mjs';

export const WEB_MENU = [
  ['categories','Catálogos','Categorías, orden y visibilidad.','categorias_web'],
  ['packages','Servicios y personajes','Paquetes, cantidades, fotos y precios.','catalogo_web'],
  ['campaigns','Campañas','Promociones, fechas y destacados.','campanas_web'],
  ['themes','Temas','Temporadas y diseño automático.','temas_web'],
  ['gallery','Galería','Imágenes públicas de Diverty.','galeria_web'],
  ['coupons','Cupones','Descuentos activos y códigos.','cupones_web'],
  ['settings','Banner y ajustes','Mensaje superior de la página.','config_web'],
];
export const EMPTY_FORMS = {
  categories: {nombre:'',icono:'',imagen:'',visibilidad:'activo',fechaInicio:'',fechaFin:''},
  packages: {...EMPTY_PRODUCT_OPTIONS,nombre:'',categoria:'',precio:'',tipoCobro:'paquete',oferta:false,destacado:false,orden:'',precioOriginal:'',descripcion:'',imagen:'',imagenTarjeta:'',serviciosLista:''},
  campaigns: {titulo:'',subtitulo:'',descripcion:'',imagen:'',precio:'',precioOriginal:'',incluyeText:'',botonTexto:'',accion:'',activo:true,destacada:false,orden:'',fechaInicio:'',fechaFin:''},
  themes: {nombre:'',descripcion:'',fechaInicio:'',fechaFin:'',gradient:'',decorations:'none',animations:true,colorPrimary:'#8B5CF6',colorSecondary:'#EC4899',colorButton:'#8B5CF6',colorText:'#1E293B',colorBg:'#FFFFFF',colorCard:'#F8FAFC',buttonStyle:'gradient'},
  gallery: {image:''},
  coupons: {code:'',type:'percent',discount:'',activo:true},
  settings: {bannerActive:false,bannerText:''},
};
export function webForm(view, item, categories=[]) {
  const form={...EMPTY_FORMS[view],...item};
  if(view==='packages')Object.assign(form,productOptionsFromItem(item||{}),{categoria:item?.categoria||categories[0]?.id||'',serviciosLista:Array.isArray(item?.serviciosLista)?item.serviciosLista.join('\n'):item?.serviciosLista||''});
  if(view==='categories')Object.assign(form,{visibilidad:item?.visibilidad||((item?.activo===false||item?.visible===false)?'oculto':'activo'),fechaInicio:item?.fechaInicio||item?.inicioTemporada||'',fechaFin:item?.fechaFin||item?.finTemporada||''});
  if(view==='campaigns')form.incluyeText=(item?.incluye||[]).join('\n');
  if(view==='themes'&&item)Object.assign(form,themeOptionsFromItem(item));
  if(view==='coupons')Object.assign(form,{code:item?.code||item?.id||'',activo:item?.activo!==false&&item?.active!==false});
  for(const key of ['precio','precioOriginal','orden','discount'])if(Object.hasOwn(form,key))form[key]=form[key]??'';
  if(view==='packages'&&form.orden===999)form.orden='';
  return form;
}
const text=value=>String(value??'').trim();
const requireValue=(condition,message)=>{if(!condition)throw new Error(message);};
const url=value=>/^https?:\/\//i.test(text(value));
function dates(form,required=false){
  for(const key of ['fechaInicio','fechaFin'])requireValue(!form[key]&&!required||validDate(form[key]),'Usa fechas válidas con formato AAAA-MM-DD.');
  requireValue(!form.fechaInicio||!form.fechaFin||form.fechaInicio<=form.fechaFin,'La fecha final no puede ser anterior a la inicial.');
}
export function webPayload(view, form, {original=null,count=0,now=new Date().toISOString()}={}) {
  let data;
  if(view==='categories'){
    requireValue(text(form.nombre),'Escribe un nombre para el catálogo.');dates(form,form.visibilidad==='temporada');
    const activo=form.visibilidad!=='oculto';
    data={nombre:text(form.nombre),icono:text(form.icono),imagen:text(form.imagen),visibilidad:form.visibilidad,fechaInicio:form.fechaInicio||'',fechaFin:form.fechaFin||'',activo,visible:activo,...(!original?{orden:count+1}:{})};
  }else if(view==='packages'){
    const precio=Number(form.precio);
    requireValue(text(form.nombre)&&Number.isFinite(precio)&&precio>0&&url(form.imagen),'Completa nombre, precio positivo e imagen (URL http/https).');
    requireValue(text(form.categoria),'Selecciona una categoría.');
    requireValue(!form.oferta||Number(form.precioOriginal)>precio,'En oferta, el precio original debe ser mayor al actual.');
    requireValue(form.orden===''||Number.isFinite(Number(form.orden)),'Revisa el orden.');
    data={...productOptionsForSave(form),nombre:text(form.nombre),categoria:form.categoria,precio,oferta:!!form.oferta,destacado:!!form.destacado,orden:form.orden===''?999:Number(form.orden),precioOriginal:form.oferta?Number(form.precioOriginal):null,descripcion:text(form.descripcion),imagen:text(form.imagen),imagenTarjeta:text(form.imagenTarjeta),serviciosLista:form.serviciosLista||''};
  }else if(view==='campaigns'){
    requireValue(text(form.titulo)&&url(form.imagen),'Título e imagen (URL http/https) son obligatorios.');dates(form,true);
    const amount=key=>{const value=form[key]===''?null:Number(form[key]);requireValue(value===null||Number.isFinite(value)&&value>=0,'Revisa los precios.');return value;};
    data={titulo:text(form.titulo),subtitulo:text(form.subtitulo),descripcion:text(form.descripcion),imagen:text(form.imagen),precio:amount('precio'),precioOriginal:amount('precioOriginal'),incluye:text(form.incluyeText).split('\n').map(text).filter(Boolean),botonTexto:text(form.botonTexto),accion:text(form.accion),activo:!!form.activo,destacada:!!form.destacada,orden:Number(form.orden)||count+1,fechaInicio:form.fechaInicio,fechaFin:form.fechaFin,...(!original?{createdAt:now}:{})};
  }else if(view==='themes'){
    requireValue(text(form.nombre),'Escribe un nombre para el tema.');dates(form);
    const {id,...options}=themeOptionsForSave(form);
    data={...options,nombre:text(form.nombre),descripcion:text(form.descripcion),isDefault:original?.isDefault??count===0,activo:original?.activo??false};
  }else if(view==='gallery'){
    requireValue(url(form.image),'Agrega una imagen con URL http/https.');data={image:text(form.image),...(!original?{createdAt:now}:{})};
  }else if(view==='coupons'){
    const code=text(form.code).toUpperCase(),discount=Number(form.discount);
    requireValue(/^[A-Z0-9_-]{2,40}$/.test(code)&&['percent','fixed'].includes(form.type)&&Number.isFinite(discount)&&discount>0&&(form.type!=='percent'||discount<=100),'Revisa el código y el descuento.');
    data={code,type:form.type,discount,activo:!!form.activo,...(original&&Object.hasOwn(original,'active')?{active:!!form.activo}:{})};
  }else if(view==='settings')data={bannerActive:!!form.bannerActive,bannerText:form.bannerText||''};
  else throw new Error('Sección desconocida.');
  return {...data,updatedAt:now};
}
export function themeWinner(themes,config,today,defaultId=themes.find(t=>t.isDefault)?.id||themes[0]?.id){
  return config.modo==='manual'?(config.temaManualActivo||defaultId):(themes.find(t=>t.fechaInicio&&t.fechaFin&&today>=t.fechaInicio&&today<=t.fechaFin)?.id||defaultId);
}
export function themePreviewHTML(device='mobile'){
  const width=device==='desktop'?1080:390;
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;overflow:hidden}iframe{border:0;width:${width}px;height:700px;transform-origin:top left}</style></head><body><iframe id="preview" src="https://divertypanama.netlify.app/theme-preview.html" sandbox="allow-scripts allow-same-origin" referrerpolicy="no-referrer" title="Vista previa"></iframe><script>
  const frame=document.getElementById('preview'),origin='https://divertypanama.netlify.app';
  const resize=()=>frame.style.transform='scale('+Math.min(1,innerWidth/${width})+')';resize();addEventListener('resize',resize);
  window.applyDivertyPreview=theme=>frame.contentWindow.postMessage({type:'diverty:theme-preview',theme},origin);
  addEventListener('message',e=>{if(e.origin===origin&&e.source===frame.contentWindow&&e.data?.type==='diverty:theme-preview-ready')window.ReactNativeWebView.postMessage('diverty:theme-preview-ready');});
  </script></body></html>`;
}
