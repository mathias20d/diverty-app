export function documentReadiness({busy,ready,settings,editing,catalogReady,catalogError,summary,savedServicesOnly=false}){
 if(busy)return {disabled:true,message:'Preparando el documento…'};
 if(!ready)return {disabled:true,message:'Esperando los datos de empresa guardados en este teléfono.'};
 if(!settings||editing)return {disabled:true,message:'Revisa los datos de empresa y pulsa Guardar datos para documentos para habilitar el PDF.'};
 if(!summary)return {disabled:true,message:'Revisa los montos, cantidades y fechas de la reserva antes de generar el PDF.'};
 if(!savedServicesOnly&&(!catalogReady||catalogError))return {disabled:true,message:catalogError||'Esperando las descripciones y duraciones del catálogo. Puedes continuar con los servicios guardados en la reserva.'};
 return {disabled:false,message:savedServicesOnly?'El PDF usará los servicios guardados en la reserva, sin completar datos desde el catálogo.':'Documento listo para generar y compartir.'};
}
