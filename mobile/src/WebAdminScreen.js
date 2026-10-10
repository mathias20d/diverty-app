import React, {useEffect, useRef, useState} from 'react';
import {Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View} from 'react-native';
import {collection, doc} from 'firebase/firestore';
import {LinearGradient} from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import ThemeWebPreview from './ThemeWebPreview';
import {auth, db, DATA_PATH} from './firebase';
import useWebAdminData from './useWebAdminData';
import useScreenBack from './useScreenBack';
import {Action, openLink, ui} from './native-ui';
import {WEB_MENU, webForm, webPayload, themeWinner} from './web-admin-data.mjs';
import {THEME_PRESETS, inferThemePreset} from './domain/theme-options.mjs';
import {panamaToday} from './domain/date-availability.mjs';

const PUBLIC_SITE='https://divertypanama.netlify.app/';
const tones=['#7657FF','#DB2777','#E11D48','#D97706','#0284C7','#059669','#475569'];
const symbols=['▦','✦','◉','◈','▧','%','⚙'];
const labels={categories:'catálogo',packages:'servicio',campaigns:'campaña',themes:'tema',gallery:'imagen',coupons:'cupón'};
function Choice({label,value,options,onChange,disabled}){
  return <View style={s.field}><Text style={s.label}>{label}</Text><View style={ui.chips}>{options.map(([key,title])=><Pressable key={key} accessibilityRole="button" accessibilityState={{selected:value===key,disabled}} disabled={disabled} onPress={()=>onChange(key)} style={[s.choice,value===key&&s.chosen]}><Text style={[s.choiceText,value===key&&{color:'#fff'}]}>{title}</Text></Pressable>)}</View></View>;
}
function Toggle({label,value,onChange,disabled}){return <View style={s.toggle}><Text style={ui.body}>{label}</Text><Switch accessibilityLabel={label} disabled={disabled} value={!!value} onValueChange={onChange} trackColor={{true:'#7657FF'}}/></View>;}
export default function WebAdminScreen({onClose}){
  const data=useWebAdminData({db,appId:DATA_PATH[1],currentUser:auth.currentUser});
  const [view,setView]=useState('home'),[editor,setEditor]=useState(null),[form,setForm]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[query,setQuery]=useState(''),[filter,setFilter]=useState('all');
  const lock=useRef(false),draftInitial=useRef('');
  const row=WEB_MENU.find(item=>item[0]===view),items=view==='settings'?[]:data[view]||[];
  const ref=(section,id)=>doc(db,...DATA_PATH,section,id);
  const disabled=busy||data.loading||data.loadError;
  function openEditor(item=null,duplicate=false){
    const draft=webForm(view,item,data.categories);
    if(duplicate)Object.assign(draft,{titulo:`${item.titulo||'Campaña'} (Copia)`,activo:false,orden:data.campaigns.length+1});
    setEditor({original:duplicate?null:item});setForm(draft);draftInitial.current=JSON.stringify(draft);setError('');setMessage('');
  }
  function closeEditor(){
    if(lock.current)return;
    const close=()=>{setEditor(null);setForm(null);setError('');if(view==='settings')setView('home');};
    if(JSON.stringify(form)!==draftInitial.current)return Alert.alert('Descartar cambios','Hay cambios sin guardar.',[{text:'Seguir editando',style:'cancel'},{text:'Descartar',style:'destructive',onPress:close}]);
    close();
  }
  function back(){if(lock.current)return;if(editor)return closeEditor();if(view!=='home'){setView('home');setError('');setMessage('');}else onClose();}
  useScreenBack(back,busy);
  useEffect(()=>{if(view==='settings'&&!editor){const draft=webForm('settings',data.settings);setForm(draft);draftInitial.current=JSON.stringify(draft);setEditor({original:data.settings});}},[view]);
  const change=(key,value)=>setForm(previous=>({...previous,[key]:value,...(view==='themes'&&key==='colorButton'?{buttonStyle:'solid'}:{})}));
  async function operation(callback,success){
    if(lock.current)return;lock.current=true;setBusy(true);setError('');setMessage('');
    try{const result=await callback();if(result!==false)setMessage(success);}catch(err){setError(err.message?.startsWith('Revisa')?err.message:'No se pudo completar la operación. Comprueba tu conexión y reintenta.');}finally{lock.current=false;setBusy(false);}
  }
  async function save(keepCreating=false){
    if(disabled||lock.current)return;
    let payload;try{payload=webPayload(view,form,{original:editor.original,count:items.length});}catch(err){setError(err.message);return;}
    const original=editor.original;
    const id=view==='settings'?'global':view==='coupons'?payload.code:original?.id||editor.targetId|| (view==='categories'?payload.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||doc(collection(db,...DATA_PATH,row[3])).id:doc(collection(db,...DATA_PATH,row[3])).id);
    if(!original&&items.some(item=>item.id===id)){setError('Ya existe este registro. Abre Editar para cambiarlo.');return;}
    if(view==='coupons'&&original?.id!==id&&items.some(item=>item.id===id)){setError('Ya existe un cupón con este código.');return;}
    const createCharacters=view==='packages'&&payload.tipoServicio==='personaje'&&payload.categoria==='personajes'&&!data.categories.some(item=>item.id==='personajes');
    setEditor(previous=>({...previous,targetId:id}));
    await operation(async()=>{
      const fresh=await data.commitMutation(batch=>{
        if(view==='coupons'&&original?.id&&original.id!==id)batch.delete(ref(row[3],original.id));
        batch.set(ref(row[3],id),{...payload,...(['categories','campaigns'].includes(view)?{id}:{})},{merge:true});
        if(createCharacters)batch.set(ref('categorias_web','personajes'),{id:'personajes',nombre:'Personajes',icono:'sparkles',imagen:payload.imagen,visibilidad:'activo',activo:true,visible:true,orden:data.categories.length+1},{merge:true});
      },createCharacters?[row[3],'categorias_web']:[row[3]]);
      if(keepCreating===true&&view==='packages'){
        const next={...webForm(view,null,data.categories),tipoServicio:'personaje',categoria:form.categoria,tematica:form.tematica};setEditor({original:null});setForm(next);draftInitial.current=JSON.stringify(next);
      }else {setEditor(null);setForm(null);if(view==='settings')setView('home');}
      if(!fresh)setError('Guardado confirmado. No se pudo actualizar la lista; pulsa Reintentar.');
    },'Cambios guardados en la página web.');
  }
  function remove(item){
    Alert.alert(`Eliminar ${labels[view]}`,view==='categories'?'Los servicios de esta categoría no se eliminarán.':`¿Eliminar ${item.nombre||item.titulo||item.code||'esta imagen'} de la página web?`,[{text:'Cancelar',style:'cancel'},{text:'Eliminar',style:'destructive',onPress:()=>operation(()=>data.commitMutation(batch=>batch.delete(ref(row[3],item.id)),[row[3]]),'Registro eliminado.')}]);
  }
  async function copyLink(item){
    const url=new URL(PUBLIC_SITE);url.searchParams.set(view==='categories'?'categoria':'plan',item.id);url.searchParams.set('pv',Date.now().toString(36));
    try{await Clipboard.setStringAsync(url.toString());setMessage('Enlace directo copiado.');}catch{setError('No se pudo copiar el enlace.');}
  }
  function move(item,delta){
    const list=view==='packages'?items.filter(value=>value.categoria===item.categoria):items;
    const index=list.findIndex(value=>value.id===item.id),other=index+delta;
    if(other<0||other>=list.length)return;
    const next=[...list];[next[index],next[other]]=[next[other],next[index]];
    operation(()=>data.commitMutation(batch=>next.forEach((value,i)=>batch.set(ref(row[3],value.id),{orden:i+1},{merge:true})),[row[3]]),'Orden actualizado.');
  }
  function activateTheme(id,mode=data.themeConfig.modo,defaultId){
    const config={...data.themeConfig,modo:mode,...(mode==='manual'?{temaManualActivo:id}:{})};
    const winner=themeWinner(data.themes,config,panamaToday(),defaultId);
    operation(()=>data.commitMutation(batch=>{
      batch.set(ref('config_web','tema_global'),config,{merge:true});
      data.themes.forEach(theme=>batch.set(ref('temas_web',theme.id),{activo:theme.id===winner,...(defaultId?{isDefault:theme.id===defaultId}:{})},{merge:true}));
    },['temas_web','config_web']),'Tema actualizado.');
  }
  async function upload(key){
    if(lock.current)return;
    await operation(async()=>{
      const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:0.84});
      if(result.canceled)return false;
      const asset=result.assets[0],body=new FormData();
      body.append('file',{uri:asset.uri,name:asset.fileName||'diverty.jpg',type:asset.mimeType||'image/jpeg'});body.append('upload_preset','diverty_web');
      const response=await fetch('https://api.cloudinary.com/v1_1/djfboe8rg/image/upload',{method:'POST',body});
      const output=await response.json();if(!response.ok||!output.secure_url)throw new Error('UPLOAD_FAILED');
      change(key,output.secure_url);
    },'Imagen preparada. Pulsa Guardar para publicarla.');
  }
  const field=(key,label,options={})=><View key={key} style={s.field}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} editable={!busy} value={String(form?.[key]??'')} onChangeText={value=>change(key,value)} style={[ui.input,options.multiline&&{minHeight:100,textAlignVertical:'top'}]} autoCapitalize={options.numeric?'none':'sentences'} keyboardType={options.numeric?'decimal-pad':'default'} {...options}/></View>;
  const choice=(key,label,options,onChange=value=>change(key,value))=><Choice label={label} value={form?.[key]} options={options} onChange={onChange} disabled={busy}/>;
  const toggle=(key,label)=><Toggle label={label} value={form?.[key]} onChange={value=>change(key,value)} disabled={busy}/>;
  const image=(key,label)=><View style={s.field}>{field(key,label,{autoCapitalize:'none'})}<Action title={`Seleccionar foto · ${label}`} disabled={busy} secondary onPress={()=>upload(key)}/>{/^https?:\/\//i.test(form?.[key]||'')?<Image source={{uri:form[key]}} accessibilityLabel={label} style={s.image}/>:null}</View>;
  const dates=<>{field('fechaInicio','Inicio (AAAA-MM-DD)')}{field('fechaFin','Fin (AAAA-MM-DD)')}</>;
  const visibleItems=items.filter(item=>{
    const matches=String(item.nombre||item.titulo||item.code||'').toLowerCase().includes(query.toLowerCase());
    return matches&&(view!=='packages'||filter==='all'||filter==='destacados'&&item.destacado||filter==='ofertas'&&item.oferta||item.categoria===filter);
  });
  return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView style={ui.page} contentContainerStyle={ui.scroll} keyboardShouldPersistTaps="handled">
    <Action title={editor?'Cerrar edición':view==='home'?'Volver al administrador':'Volver a Administrar página web'} secondary disabled={busy} onPress={back}/>
    <Text style={ui.heading}>{editor?`${editor.original?'Editar':'Nuevo'} ${labels[view]||'ajustes'}`:view==='home'?'Administrar página web':row?.[1]}</Text>
    {data.loading?<Text style={ui.muted}>Actualizando contenido…</Text>:null}
    {data.loadError?<View style={ui.card}><Text accessibilityRole="alert" style={ui.error}>{data.loadErrorMessage||'No se pudo actualizar parte del contenido. Tus datos y lo que estás escribiendo se conservan.'}</Text><Action title="Reintentar" disabled={busy||data.loading} onPress={()=>data.refresh()}/></View>:null}
    {error?<Text accessibilityRole="alert" style={ui.error}>{error}</Text>:null}{message?<Text accessibilityRole="alert" style={ui.success}>{message}</Text>:null}
    {editor&&form?<View style={ui.card}>
      {view==='categories'?<>{field('nombre','Nombre del catálogo')}{field('icono','Icono')}{image('imagen','Imagen del catálogo')}{choice('visibilidad','Visibilidad',[['activo','Activo'],['oculto','Oculto'],['temporada','Temporada']])}{dates}</>:null}
      {view==='packages'?<>
        {choice('tipoServicio','¿Qué quieres ofrecer?',[['servicio','Servicio'],['producto','Por cantidad'],['personaje','Personaje']],value=>setForm(old=>({...old,tipoServicio:value,tipoCobro:value==='producto'?'unidad':value==='personaje'?'paquete':old.tipoCobro,categoria:value==='personaje'?(data.categories.find(c=>c.id==='personajes'||c.nombre?.trim().toLowerCase()==='personajes')?.id||'personajes'):old.categoria})))}
        {field('nombre','Nombre del servicio')}{choice('categoria','Categoría',[...data.categories.map(c=>[c.id,c.nombre]),...(!data.categories.some(c=>c.id==='personajes')&&form.tipoServicio==='personaje'?[['personajes','Personajes']]:[])])}
        {form.tipoServicio==='personaje'?field('tematica','Temática (opcional)'):choice('tipoCobro','Tipo de cobro',[['paquete','Paquete'],['unidad','Unidad'],['hora','Hora'],['nino','Niño']])}
        {field('precio','Precio',{numeric:true})}{toggle('oferta','En oferta')}{form.oferta?field('precioOriginal','Precio original',{numeric:true}):null}{toggle('destacado','Destacado')}{field('orden','Orden',{numeric:true})}
        {form.tipoServicio!=='personaje'&&['unidad','hora','nino'].includes(form.tipoCobro)?<>{field('cantidadMinima','Cantidad mínima',{numeric:true})}{field('cantidadMaxima','Cantidad máxima',{numeric:true})}{field('incrementoCantidad','Aumentar de',{numeric:true})}{field('unidadEtiqueta','Nombre de la unidad')}</>:null}
        {field('descripcion','Descripción',{multiline:true})}{field('serviciosLista','Servicios incluidos (uno por línea)',{multiline:true})}{image('imagen','Imagen principal')}{image('imagenTarjeta','Imagen de tarjeta (opcional)')}
      </>:null}
      {view==='campaigns'?<>{field('titulo','Título')}{field('subtitulo','Subtítulo')}{field('descripcion','Descripción',{multiline:true})}{dates}{field('precio','Precio',{numeric:true})}{field('precioOriginal','Precio anterior',{numeric:true})}{field('incluyeText','Lo que incluye (uno por línea)',{multiline:true})}{field('botonTexto','Texto del botón')}{field('accion','Acción')}{toggle('activo','Activa')}{toggle('destacada','Destacada')}{field('orden','Orden',{numeric:true})}{image('imagen','Imagen de campaña')}</>:null}
      {view==='themes'?<>{field('nombre','Nombre del tema')}{field('descripcion','Descripción',{multiline:true})}{dates}{['colorPrimary','colorSecondary','colorButton','colorText','colorBg','colorCard'].map((key,i)=>field(key,['Color principal','Color secundario','Color del botón','Color del texto','Color del fondo','Color de tarjeta'][i],{autoCapitalize:'none'}))}{field('gradient','Degradado (CSS)',{autoCapitalize:'none'})}{choice('buttonStyle','Estilo del botón',[['gradient','Degradado'],['solid','Sólido']])}{choice('decorations','Decoración',[['auto','Automática'],['none','Ninguna'],['snow','Nieve'],['confetti','Confeti'],['bats','Murciélagos'],['bubbles','Burbujas'],['leaves','Hojas']])}{toggle('animations','Animaciones')}<Action title="Restaurar colores sugeridos" disabled={busy} secondary onPress={()=>setForm(value=>({...value,...THEME_PRESETS[inferThemePreset(value.nombre,value.descripcion)],animations:true,buttonStyle:'gradient'}))}/><ThemeWebPreview form={form}/></>:null}
      {view==='gallery'?image('image','Imagen de galería'):null}
      {view==='coupons'?<>{field('code','Código',{autoCapitalize:'characters'})}{choice('type','Tipo de descuento',[['percent','Porcentaje'],['fixed','Monto fijo']])}{field('discount','Descuento',{numeric:true})}{toggle('activo','Activo')}</>:null}
      {view==='settings'?<>{toggle('bannerActive','Banner activo')}{field('bannerText','Texto del banner',{multiline:true})}</>:null}
      {view==='packages'&&form.tipoServicio==='personaje'?<Action title="Guardar y agregar otro personaje" disabled={disabled} secondary onPress={()=>save(true)}/>:null}
      <Action title={busy?'Guardando…':`Guardar ${labels[view]||'ajustes'}`} disabled={disabled} onPress={()=>save()}/>
    </View>:view==='home'?<>
      <LinearGradient colors={['#17142B','#34256B','#7657FF']} style={s.hero}><Text style={s.eyebrow}>Centro de control</Text><Text style={s.heroTitle}>Página Web</Text><Text style={s.heroText}>Administra el contenido público de Diverty desde la misma app.</Text><View style={s.stats}><Text style={s.heroText}>{data.categories.length} Catálogos</Text><Text style={s.heroText}>{data.packages.length} Servicios</Text><Text style={s.heroText}>{data.campaigns.filter(c=>c.activo!==false).length} Campañas</Text></View></LinearGradient>
      <Action title="Ver página pública" secondary onPress={()=>openLink(PUBLIC_SITE)}/>
      <View style={s.grid}>{WEB_MENU.map(([key,title,description],index)=><Pressable key={key} accessibilityRole="button" accessibilityLabel={title} disabled={data.loading||data.loadError} accessibilityState={{disabled:data.loading||data.loadError}} style={[s.menuCard,(data.loading||data.loadError)&&{opacity:.5}]} onPress={()=>{setView(key);setQuery('');setFilter('all');setMessage('');setError('');}}><Text style={[s.symbol,{color:tones[index]}]}>{symbols[index]}</Text><Text style={ui.title}>{title}</Text><Text style={ui.muted}>{description}</Text><Text style={[s.count,{color:tones[index]}]}>{key==='settings'?(data.settings.bannerActive?'ON':'OFF'):data[key]?.length||0}</Text></Pressable>)}</View>
    </>:<>
      {view==='themes'?<View style={ui.card}><Text style={ui.title}>Modo {data.themeConfig.modo==='manual'?'manual':'automático'}</Text><Text style={ui.muted}>El modo automático aplica el tema de temporada y después el predeterminado.</Text><Action title={data.themeConfig.modo==='manual'?'Activar modo automático':'Activar modo manual'} disabled={disabled} secondary onPress={()=>activateTheme(data.themeConfig.temaManualActivo||data.themes.find(t=>t.activo)?.id||data.themes[0]?.id,data.themeConfig.modo==='manual'?'automatico':'manual')}/></View>:null}
      <Action title={`Nuevo ${labels[view]}`} disabled={disabled} onPress={()=>openEditor()}/>
      {view!=='gallery'?<TextInput accessibilityLabel="Buscar contenido web" placeholder="Buscar…" value={query} onChangeText={setQuery} style={ui.input}/>:null}
      {view==='packages'?<Choice label="Filtrar servicios" value={filter} options={[['all','Todos'],['destacados','Destacados'],['ofertas','Ofertas'],...data.categories.map(c=>[c.id,c.nombre])]} onChange={setFilter}/>:null}
      {!visibleItems.length&&!data.loading?<Text style={ui.muted}>No hay registros para mostrar.</Text>:null}
      {visibleItems.map(item=><View key={item.id} style={ui.card}>{(item.imagenTarjeta||item.imagen||item.image)?<Image source={{uri:item.imagenTarjeta||item.imagen||item.image}} style={s.image} accessibilityLabel={item.nombre||item.titulo||'Imagen de galería'}/>:null}<Text style={ui.title}>{item.nombre||item.titulo||item.code||'Imagen de galería'}</Text>
        {item.precio!=null?<Text style={ui.body}>${Number(item.precio).toFixed(2)}{item.oferta?' · Oferta':''}{item.destacado?' · Destacado':''}</Text>:null}
        {view==='categories'?<Text style={ui.muted}>{item.visibilidad||'activo'}{item.fechaInicio?` · ${item.fechaInicio} → ${item.fechaFin}`:''}</Text>:null}
        {view==='campaigns'?<Text style={ui.muted}>{item.fechaInicio} → {item.fechaFin} · {item.activo===false?'Inactiva':'Activa'}</Text>:null}
        {view==='coupons'?<Text style={ui.body}>{item.type==='percent'?`${item.discount}%`:`$${item.discount}`} · {item.activo===false||item.active===false?'Inactivo':'Activo'}</Text>:null}
        {view==='themes'?<><Text style={ui.muted}>{item.activo?'Activo · ':''}{item.isDefault?'Predeterminado':''}</Text><Action title="Activar tema" disabled={disabled} secondary onPress={()=>activateTheme(item.id,'manual')}/><Action title="Usar como predeterminado" disabled={disabled} secondary onPress={()=>activateTheme(data.themeConfig.temaManualActivo,data.themeConfig.modo,item.id)}/></>:null}
        <Action title="Editar" disabled={disabled} secondary onPress={()=>openEditor(item)}/>
        {['categories','packages'].includes(view)?<Action title="Copiar enlace directo" secondary onPress={()=>copyLink(item)}/>:null}
        {['categories','packages','campaigns'].includes(view)?<View style={s.stats}><Action title="Subir" disabled={disabled} secondary onPress={()=>move(item,-1)}/><Action title="Bajar" disabled={disabled} secondary onPress={()=>move(item,1)}/></View>:null}
        {view==='campaigns'?<Action title="Duplicar campaña" disabled={disabled} secondary onPress={()=>openEditor(item,true)}/>:null}
        {['campaigns','coupons'].includes(view)?<Action title={item.activo===false||item.active===false?'Activar':'Desactivar'} disabled={disabled} secondary onPress={()=>operation(()=>data.commitMutation(batch=>batch.set(ref(row[3],item.id),{activo:item.activo===false||item.active===false,...(view==='coupons'&&Object.hasOwn(item,'active')?{active:item.activo===false||item.active===false}:{}),updatedAt:new Date().toISOString()},{merge:true}),[row[3]]),'Estado actualizado.')}/>:null}
        {view!=='themes'?<Action title="Eliminar" danger disabled={disabled} onPress={()=>remove(item)}/>:null}
      </View>)}
    </>}
  </ScrollView></KeyboardAvoidingView>;
}
const s=StyleSheet.create({field:{gap:8,marginVertical:4},label:{fontSize:11,fontFamily:'Outfit_900Black',color:'#64748B',textTransform:'uppercase',letterSpacing:1},toggle:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12,minHeight:50},choice:{minHeight:44,padding:12,borderRadius:14,backgroundColor:'#F1F5F9'},chosen:{backgroundColor:'#7657FF'},choiceText:{fontSize:12,fontFamily:'Outfit_800ExtraBold',color:'#475569'},image:{height:180,width:'100%',borderRadius:20,resizeMode:'cover'},hero:{borderRadius:30,padding:24,gap:14},eyebrow:{fontFamily:'Outfit_900Black',color:'#D8CDFF',letterSpacing:2,fontSize:10},heroTitle:{fontSize:28,fontFamily:'Outfit_900Black',color:'#fff'},heroText:{color:'#E4DEFF',fontSize:13,fontFamily:'Outfit_600SemiBold'},stats:{flexDirection:'row',flexWrap:'wrap',gap:14},grid:{flexDirection:'row',flexWrap:'wrap',gap:12},menuCard:{width:'100%',borderRadius:24,backgroundColor:'#fff',padding:18,gap:10,borderWidth:1,borderColor:'#E2E8F0'},symbol:{fontSize:28,fontFamily:'Outfit_900Black'},count:{fontSize:22,fontFamily:'Outfit_900Black'}});
