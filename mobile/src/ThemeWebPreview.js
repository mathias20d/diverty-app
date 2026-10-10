import React, {useRef, useState} from 'react';
import {Text, View} from 'react-native';
import {WebView} from 'react-native-webview';
import {Action, ui} from './native-ui';
import {themePreviewHTML} from './web-admin-data.mjs';

// Only the existing, non-booking theme preview is web content. Administration
// and all form controls stay native; drafts are sent to the iframe without saving.
export default function ThemeWebPreview({form}){
  const frame=useRef(null),draft=useRef(form),[device,setDevice]=useState('mobile'),[retry,setRetry]=useState(0),[failed,setFailed]=useState(false),[ready,setReady]=useState(false),[width,setWidth]=useState(320);
  draft.current=form;
  function send(){frame.current?.injectJavaScript(`window.applyDivertyPreview(${JSON.stringify({...draft.current,themeVersion:2}).replace(/</g,'\\u003c')});true;`);}
  React.useEffect(()=>{if(ready)send();},[form,ready]);
  React.useEffect(()=>{if(ready)return;const timer=setTimeout(()=>setFailed(true),15000);return()=>clearTimeout(timer);},[ready,device,retry]);
  return <View style={ui.card} onLayout={event=>setWidth(event.nativeEvent.layout.width-32)}><Text style={ui.title}>Vista previa · Sin publicar</Text><View style={ui.row}>{['mobile','desktop'].map(value=><Action key={value} title={value==='mobile'?'Móvil':'Escritorio'} secondary={device!==value} onPress={()=>{setDevice(value);setReady(false);setFailed(false);}}/>)}</View>
    {failed?<><Text style={ui.error}>No se pudo cargar la vista previa.</Text><Action title="Reintentar vista previa" secondary onPress={()=>{setRetry(value=>value+1);setFailed(false);setReady(false);}}/></>:null}
    <WebView key={`${device}-${retry}`} ref={frame} source={{html:themePreviewHTML(device),baseUrl:'https://divertypanama.netlify.app/'}} style={{height:700*Math.min(1,width/(device==='mobile'?390:1080)),backgroundColor:'#F8FAFC'}} originWhitelist={['https://divertypanama.netlify.app']} javaScriptEnabled onMessage={event=>{if(event.nativeEvent.data==='diverty:theme-preview-ready'){setReady(true);setFailed(false);send();}}} onError={()=>setFailed(true)} onHttpError={()=>setFailed(true)} onShouldStartLoadWithRequest={request=>request.url==='about:blank'||/^https:\/\/divertypanama\.netlify\.app\//.test(request.url)}/>
    <Text style={ui.muted}>Los cambios se aplican al guardar. Aquí no se realizan reservas.</Text>
  </View>;
}
