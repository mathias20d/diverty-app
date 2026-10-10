// Expo Print can return a host cache URI outside the experience's readable
// directories in Expo Go. Transfer bytes into the experience's own cache;
// never ask FileSystem or Sharing to read the original Print URI.
export async function sharePDF({Print,Sharing,File,Paths,html,name,title,onStage=()=>{}}) {
  onStage('pdf');
  const rendered=await Print.printToFileAsync({html,width:595,height:842,base64:true});
  if(typeof rendered?.base64 !== 'string' || !rendered.base64.trim())throw new Error('El motor de impresión no devolvió el contenido del PDF.');
  onStage('file');
  const safeName=String(name || 'Diverty').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80);
  const file=new File(Paths.cache,`${safeName}-${Date.now()}-${Math.random().toString(36).slice(2,10)}.pdf`);
  file.create();
  file.write(rendered.base64,{encoding:'base64'});
  if(!file.exists || file.size<=0)throw new Error('No se pudo guardar el PDF en la caché de la app.');
  onStage('share');
  await Sharing.shareAsync(file.uri,{mimeType:'application/pdf',UTI:'com.adobe.pdf',dialogTitle:title});
  // Keep it in cache after the chooser closes: the receiving app can read it
  // asynchronously. The OS can reclaim cache files when space is needed.
  return file.uri;
}
