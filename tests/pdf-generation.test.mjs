import test from 'node:test';
import assert from 'node:assert/strict';
import {createPdfBlob,waitForPdfAssets,pdfErrorMessage} from '../src/lib/pdf.mjs';
globalThis.document={fonts:{ready:Promise.resolve()}};
globalThis.requestAnimationFrame=callback=>setTimeout(callback,0);

test('a stalled image fails promptly, cleans listeners and allows a later successful retry',async()=>{
  const image=new EventTarget();image.complete=false;
  let added=0,removed=0;
  const add=image.addEventListener.bind(image),remove=image.removeEventListener.bind(image);
  image.addEventListener=(...args)=>{added++;add(...args);};image.removeEventListener=(...args)=>{removed++;remove(...args);};
  const element={querySelectorAll:()=>[image]};
  await assert.rejects(waitForPdfAssets(element,{timeoutMs:15}),/PDF_ASSETS_TIMEOUT/);
  assert.equal(added,removed);
  image.complete=true;
  await waitForPdfAssets(element,{timeoutMs:15});
  assert.match(pdfErrorMessage(new Error('PDF_ASSETS_TIMEOUT')),/Reintenta/);
});
test('render timeout never initiates a late download, and a fresh generation returns a PDF blob',async()=>{
  const element={querySelectorAll:()=>[]};let finish,downloads=0;
  const worker={set(){return this;},from(){return this;},output:()=>new Promise(resolve=>{finish=resolve;}),save(){downloads++;}};
  await assert.rejects(createPdfBlob(element,{}, {library:async()=>()=>worker,timeoutMs:15}),/PDF_GENERATION_TIMEOUT/);
  finish(new Blob(['late'],{type:'application/pdf'}));await new Promise(resolve=>setTimeout(resolve,1));
  assert.equal(downloads,0);
  const phases=[];
  const blob=await createPdfBlob(element,{}, {library:async()=>()=>({...worker,output:async()=>new Blob(['%PDF example'],{type:'application/pdf'})}),onProgress:phase=>phases.push(phase)});
  assert.ok(blob.size);assert.equal(phases.length,3);assert.equal(downloads,0);
});
