const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const origin = process.env.ORIGIN || 'http://127.0.0.1:5273';
const output = process.env.SERVICE_ORDER_PDF_DIR || path.resolve(__dirname, '../../output/pdf');
const library = process.env.PDF_LIBRARY_PATH;
(async () => {
  assert.ok(library && fs.existsSync(library), 'Set PDF_LIBRARY_PATH to html2pdf.bundle.min.js 0.10.1, the same version used by the app.');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
    await context.addInitScript(() => {
      const base = 'artifacts/diverty-oficial/public/data/';
      window.__writes = []; window.__printCalls = 0; Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false});
      window.print = () => { window.__printCalls++; };
      window.__rows = {
        [base+'configuracion/serviciosCustom']: { paquetes: [] },
        [base+'configuracion/clientesOcultos']: { clients: [] },
        [base+'configuracion/migracion_segura_v2']: { done: true },
        [base+'configuracion/migracion_portal_v1']: { done: true },
        [base+'config_web/global']: { centralBookingValidation: false },
        [base+'eventos/demo-orden-0001']: {
          id: 'demo-orden-0001', cliente: 'Cliente de ejemplo', fecha: '2026-10-22', hora: '14:00',
          telefono: '60000000', ubicacion: 'Salón de ejemplo', direccion: 'Dirección ficticia, Panamá', referenciaLugar: 'Entrada del salón social',
          estado: 'Confirmado', servicio: 'Animación infantil + Pintacaritas', total: 150, abono: 25,
          numeroFactura: 'FAC-EJEMPLO-001', numeroContrato: 'CON-EJEMPLO-001', detalleGastos: 'NO IMPRIMIR GASTOS', gastos: 90,
          serviciosSeleccionados: [
            { nombre: 'Animación infantil', cantidad: 1, duracionHoras: 2, precio: 125, descripcion: 'Juegos, globoflexia y acompañamiento del cumpleaños.' },
            { nombre: 'Pintacaritas', cantidad: 0.5, tipoCobro: 'hora', precio: 25 },
          ], personalResponsable: [{nombre:'Pintacaritas de ejemplo',rol:'Pintacaritas'}], subcontratos: [
            { nombre: 'Animador de ejemplo', servicio: 'Animación', costo: 60 },
            { nombre: 'Payaso de ejemplo', servicio: 'Payaso', costo: 30 },
          ], costosSeparados: true,
        },
      };
      localStorage.setItem('diverty_settings', JSON.stringify({ empresa: {
        nombreTitular: 'Empresa de ejemplo', ruc: 'RUC-EJEMPLO', banco: 'NO IMPRIMIR BANCO', numeroCuenta: 'NO-IMPRIMIR-CUENTA',
        telefono: '6000-0000', email: 'ejemplo@example.invalid', web: 'diverty.example',
      } }));
    });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.href === 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js') return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(library, 'utf8') });
      if (url.origin !== origin) return route.abort();
      if (url.pathname === '/@vite/client') return route.fulfill({ contentType: 'text/javascript', body: require('./vite-test-client.cjs') });
      if (url.pathname === '/src/lib/firebase-auth.mjs') return route.fulfill({ contentType: 'text/javascript', body: "export const ADMIN_UID='test-admin';export const app={};export const auth={currentUser:{uid:ADMIN_UID}};export const LOGO_URL='/icon-512.png';export const firebaseConfig={};" });
      if (url.pathname.includes('firebase_auth.js')) return route.fulfill({ contentType: 'text/javascript', body: "export const onAuthStateChanged=(_auth,next)=>{queueMicrotask(()=>next({uid:'test-admin'}));return()=>{};};export const signOut=async()=>{};export const signInWithEmailAndPassword=async()=>{};" });
      if (url.pathname.includes('firebase_firestore.js')) return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(__dirname, 'reservation-fixture.mjs'), 'utf8') });
      return route.continue();
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-10-22T15:00:00Z'));
    await page.goto(origin+'/?reservationId=demo-orden-0001');
    await page.getByRole('button', { name: 'Orden de servicio', exact: true }).waitFor();
    const before = await page.evaluate(() => window.__writes.length);
    await page.getByRole('button', { name: 'Orden de servicio', exact: true }).click();
    await page.getByRole('heading', { name: 'ORDEN DE SERVICIO', exact: true }).waitFor();
    const document = page.locator('#pdf-content');
    const text = await document.innerText();
    for (const value of ['Cliente de ejemplo', 'Animador de ejemplo', 'Payaso de ejemplo', 'Pintacaritas de ejemplo', '0.5 horas', 'Calificación general', 'Observaciones del cliente', 'Firma del cliente', 'Firma del personal responsable']) assert.ok(text.toLowerCase().includes(value.toLowerCase()), value);
    assert.doesNotMatch(text, /NO IMPRIMIR|NO-IMPRIMIR|Saldo|Banco|Abono|B\/\./);
    assert.equal(await page.evaluate(() => window.__writes.length), before);
    assert.equal(await document.locator('.order-rating-circle').count(), 20);
    console.log('Order dimensions:',await document.evaluate(element=>({width:element.offsetWidth,height:element.offsetHeight,scroll:element.scrollHeight})));
    await page.getByRole('button', { name: 'Imprimir PDF', exact: true }).click();
    assert.equal(await page.evaluate(() => window.__printCalls), 1);
    // Assign people directly in the order; providers and financial data stay intact.
    await page.getByRole('button',{name:'Asignar / cambiar personal',exact:true}).click();
    assert.equal(await page.getByRole('button',{name:'Guardar',exact:true}).isDisabled(),true);
    await page.getByLabel('Nombre en la orden 1',{exact:true}).fill('Pintacaritas asignada');
    await page.getByLabel('Función en la orden 1',{exact:true}).selectOption('Pintacaritas');
    await page.getByLabel('Quitar de la orden 3',{exact:true}).click();
    await page.getByRole('button',{name:'Agregar otra persona',exact:true}).click();
    await page.getByLabel('Nombre en la orden 3',{exact:true}).fill('Payasito asignado');
    await page.getByLabel('Función en la orden 3',{exact:true}).selectOption('Payaso(a)');
    await page.getByRole('button',{name:'Guardar personal',exact:true}).click();
    await document.getByText('Pintacaritas asignada',{exact:true}).waitFor();
    await document.getByText('Payasito asignado',{exact:true}).waitFor();
    assert.equal(await document.getByText('Payaso de ejemplo',{exact:true}).count(),0,'order roster replaces the old provider name in the PDF');
    assert.equal(await page.getByRole('dialog',{name:'Reserva',exact:true}).count(),0);
    const assigned=await page.evaluate(()=>window.__rows['artifacts/diverty-oficial/public/data/eventos/demo-orden-0001']);
    assert.equal(assigned.total,150);assert.equal(assigned.abono,25);
    assert.equal(assigned.subcontratos[0].nombre,'Animador de ejemplo');assert.equal(assigned.subcontratos[0].costo,60);
    assert.equal(await page.getByRole('button',{name:'Guardar',exact:true}).isEnabled(),true);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    const pdf = await download;
    assert.equal(pdf.suggestedFilename(), 'Orden_de_servicio_Diverty_Cliente_de_ejemplo.pdf');
    const sample = path.join(output, 'orden-servicio-ejemplo.pdf');
    await pdf.saveAs(sample);
    assert.ok(fs.statSync(sample).size > 10000);
    await page.pdf({path:path.join(output,'orden-servicio-impresion-test.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true});
    await document.screenshot({ path: path.join(output, 'orden-servicio-ejemplo.png') });
    const share = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Compartir', exact: true }).click();
    await share;
    await page.getByText('Orden descargada. Puedes adjuntarla al chat del personal responsable.', { exact: true }).waitFor();
    // Accelerated render timeout: UI must recover without a delayed download.
    await page.evaluate(()=>{
      window.__realPdfFactory=window.html2pdf;
      window.__realTimeout=window.setTimeout;
      window.setTimeout=(callback,ms,...args)=>window.__realTimeout(callback,ms===45000?150:ms,...args);
      window.html2pdf=()=>({set(){return this;},from(){return this;},output(){return new Promise(resolve=>{window.__latePdfResult=resolve;});}});
    });
    const downloadsBeforeTimeout=[];const onLateDownload=file=>downloadsBeforeTimeout.push(file);
    page.on('download',onLateDownload);
    await page.getByRole('button',{name:'Guardar',exact:true}).click();
    await page.getByText('La generación tardó demasiado. Reintenta o usa Imprimir PDF.',{exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Guardar',exact:true}).isEnabled(),true);
    await page.evaluate(()=>{window.__latePdfResult(new Blob(['late'],{type:'application/pdf'}));window.html2pdf=window.__realPdfFactory;window.setTimeout=window.__realTimeout;});
    assert.equal(downloadsBeforeTimeout.length,0);page.off('download',onLateDownload);
    const retryDownload=page.waitForEvent('download');
    await page.getByRole('button',{name:'Guardar',exact:true}).click();await retryDownload;

    await page.evaluate(()=>{
      Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
      Object.defineProperty(navigator,'share',{configurable:true,value:async payload=>{window.__shared={name:payload.files[0].name,type:payload.files[0].type,size:payload.files[0].size,text:payload.text};}});
    });
    await page.getByRole('button', { name: 'Compartir', exact: true }).click();
    await page.waitForFunction(()=>window.__shared);
    const shared=await page.evaluate(()=>window.__shared);
    assert.equal(shared.type,'application/pdf');assert.ok(shared.size>10000);assert.match(shared.name,/^Orden_de_servicio_/);assert.match(shared.text,/firma y la calificación/);
    await page.getByRole('button', { name: 'Atrás', exact: true }).click();
    await page.getByRole('button', { name: 'Orden de servicio', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__rows['artifacts/diverty-oficial/public/data/eventos/demo-orden-0001'].numeroFactura), 'FAC-EJEMPLO-001');
    assert.equal(await page.evaluate(() => window.__rows['artifacts/diverty-oficial/public/data/eventos/demo-orden-0001'].numeroContrato), 'CON-EJEMPLO-001');
    await page.setViewportSize({width:392,height:852});
    await page.getByRole('button',{name:'Orden de servicio',exact:true}).click();
    await page.getByRole('heading',{name:'ORDEN DE SERVICIO',exact:true}).waitFor();
    await page.locator('#pdf-content').getByText('Pintacaritas asignada',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Asignar / cambiar personal',exact:true}).click();
    await page.getByLabel('Nombre en la orden 2',{exact:true}).fill('Animadora móvil');
    await page.getByLabel('Función en la orden 2',{exact:true}).selectOption('Animador(a)');
    await page.evaluate(()=>{window.__failClosureSave=true;});
    await page.getByRole('button',{name:'Guardar personal',exact:true}).click();
    await page.getByRole('alert').filter({hasText:'No se pudo guardar el personal'}).waitFor();
    assert.equal(await page.getByLabel('Nombre en la orden 2',{exact:true}).inputValue(),'Animadora móvil');
    assert.equal(await page.getByRole('button',{name:'Guardar',exact:true}).isDisabled(),true);
    await page.getByRole('button',{name:'Cancelar',exact:true}).click();
    await page.locator('#pdf-content').getByText('Animador de ejemplo',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Asignar / cambiar personal',exact:true}).click();
    await page.getByLabel('Nombre en la orden 2',{exact:true}).fill('Animadora móvil');
    await page.getByLabel('Función en la orden 2',{exact:true}).selectOption('Animador(a)');
    await page.evaluate(()=>{window.__failClosureSave=false;});
    await page.getByRole('button',{name:'Guardar personal',exact:true}).click();
    await page.locator('#pdf-content').getByText('Animadora móvil',{exact:true}).waitFor();
    assert.equal(await page.getByRole('dialog',{name:'Reserva',exact:true}).count(),0);
    const mobileDownload=page.waitForEvent('download');
    await page.getByRole('button',{name:'Guardar',exact:true}).click();
    await (await mobileDownload).saveAs(path.join(output,'orden-servicio-movil-test.pdf'));
    await page.getByRole('button',{name:'Atrás',exact:true}).click();
    await page.getByRole('button',{name:'Orden de servicio',exact:true}).waitFor();
    await page.evaluate(async()=>{
      const {default:React}=await import('/node_modules/.vite/deps/react.js');
      const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js');
      const {default:Pdf}=await import('/src/modules/documents/PdfTemplate.jsx');
      document.getElementById('root').style.display='none';
      const container=document.createElement('div');document.body.appendChild(container);
      const event=structuredClone(window.__rows['artifacts/diverty-oficial/public/data/eventos/demo-orden-0001']);
      event.serviciosSeleccionados=Array.from({length:24},(_,index)=>({nombre:`Servicio de prueba ${index+1}`,cantidad:1,precio:10,duracionHoras:1,descripcion:'Actividad de ejemplo que se conserva completa al imprimir.'}));
      event.servicio=event.serviciosSeleccionados.map(line=>line.nombre).join(' + ');
      ReactDOM.createRoot(container).render(React.createElement(Pdf,{utils:{safeNum:value=>Number(value)||0,normalizeText:value=>String(value||'').toLowerCase(),formatTime12h:value=>value,getLocalYYYYMMDD:()=> '2026-10-22'},printData:event,printType:'orden_servicio',pdfScale:0.45,logoUrl:'/icon-512.png',appSettings:{empresa:{telefono:'6000-0000',email:'ejemplo@example.invalid'}},onClose:()=>{},onPrint:()=>{},onShare:()=>{},onDownload:()=>{}}));
    });
    await page.getByText('Servicio de prueba 24',{exact:true}).waitFor();
    await page.waitForFunction(()=>{
      const paper=document.getElementById('pdf-content'),wrapper=document.querySelector('.pdf-preview-page');
      return paper.scrollHeight>1123&&Math.abs(wrapper.offsetHeight-paper.scrollHeight*.45)<3;
    });
    await page.pdf({path:path.join(output,'orden-servicio-larga-test.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true});
    assert.equal(await page.locator('[aria-label="Servicios de la orden"] tbody tr').count(),24);
    assert.deepEqual(errors, []);
    console.log('PASS: printable service order, real A4 PDF download, print, share/fallback, signatures/rating, no internal amounts, unchanged numbers and long mobile preview. PDF: '+sample);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
