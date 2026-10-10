import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sharePDF} from '../src/pdf-sharing.mjs';

function fixture(){
 const bytes=Buffer.from('%PDF-1.4\nTest PDF bytes\n%%EOF'),calls=[],stages=[];
 class File {
  constructor(directory,name){this.uri=directory.uri+name;this.exists=false;this.size=0;}
  create(){this.exists=true;calls.push('create');}
  write(value,options){assert.equal(options.encoding,'base64');assert.deepEqual(Buffer.from(value,'base64'),bytes);this.size=bytes.length;calls.push('write');}
 }
 return {calls,stages,args:{File,Paths:{cache:{uri:'file:///experience/cache/'}},Print:{printToFileAsync:async options=>{assert.equal(options.base64,true);return {uri:'file:///host/Print/not-readable.pdf',base64:bytes.toString('base64')};}},Sharing:{shareAsync:async(uri,options)=>{assert.ok(uri.startsWith('file:///experience/cache/'));assert.ok(uri.endsWith('.pdf'));assert.equal(options.mimeType,'application/pdf');calls.push('share');}},html:'<html>test</html>',name:'FAC-00008',onStage:stage=>stages.push(stage)}};
}
test('sharing writes exact PDF bytes into allowed experience cache instead of reading denied Print URI',async()=>{
 const {args,calls,stages}=fixture();const uri=await sharePDF(args);assert.ok(uri.includes('FAC-00008'));assert.deepEqual(calls,['create','write','share']);assert.deepEqual(stages,['pdf','file','share']);
});
test('missing PDF bytes and failed cache writes never open sharing',async()=>{
 const missing=fixture();missing.args.Print.printToFileAsync=async()=>({uri:'file:///host/Print/denied.pdf'});await assert.rejects(sharePDF(missing.args),/contenido/);assert.deepEqual(missing.calls,[]);
 const failed=fixture();failed.args.File=class {create(){throw new Error('Disk full');}};await assert.rejects(sharePDF(failed.args),/Disk full/);assert.ok(!failed.calls.includes('share'));
});
