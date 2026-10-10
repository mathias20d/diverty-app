const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const React=require('react'),Renderer=require('react-test-renderer'),babel=require('@babel/core');
global.IS_REACT_ACT_ENVIRONMENT=true;
test('web admin waits for server, blocks offline writes and recovers without replacing loaded data',async()=>{
 const source=path.resolve(__dirname,'../src'),oldLoad=Module._load,oldJS=Module._extensions['.js'];
 let listener,errorListener,api,view,reads=0,batches=0,online=false;
 const firestore={collection:(_, ...parts)=>({path:parts.join('/')}),doc:(_, ...parts)=>({path:parts.join('/')}),
  onSnapshot:(_,options,callback,onError)=>{listener=callback;errorListener=onError;return()=>{};},
  getDoc:async ref=>{reads++;assert.ok(online,'document read must wait for connectivity');return {exists:()=>true,data:()=>ref.path.endsWith('/global')?{bannerText:'Saved banner',custom:'keep'}:{modo:'manual'},metadata:{fromCache:false}};},
  getDocs:async()=>{reads++;assert.ok(online);return {docs:[],metadata:{fromCache:false}};},increment:n=>n,
  writeBatch:()=>{batches++;return {set(){},commit:async()=>{}};}};
 Module._load=function(request,parent,isMain){if(request==='firebase/firestore')return firestore;return oldLoad.call(this,request,parent,isMain);};
 Module._extensions['.js']=function(module,filename){if(!filename.startsWith(source+path.sep))return oldJS(module,filename);const {code}=babel.transformSync(fs.readFileSync(filename,'utf8'),{filename,babelrc:false,configFile:false,plugins:['@babel/plugin-transform-modules-commonjs']});module._compile(code,filename);};
 try{
  const useData=require('../src/useWebAdminData').default,db={};
  function Host(){api=useData({db,appId:'test-app',currentUser:{uid:'admin'}});return null;}
  const emit=fromCache=>listener({exists:()=>true,data:()=>({version:1,versions:{config_web:1}}),metadata:{fromCache,hasPendingWrites:false}});
  await Renderer.act(async()=>{view=Renderer.create(React.createElement(Host));});
  await Renderer.act(async()=>emit(true));assert.equal(reads,0);assert.equal(api.loadError,true);assert.equal(api.loading,false);
  await assert.rejects(api.commitMutation(()=>{},['config_web']),/WEB_OFFLINE/);assert.equal(batches,0);
  online=true;await Renderer.act(async()=>emit(false));assert.equal(api.loadError,false);assert.equal(api.settings.bannerText,'Saved banner');assert.equal(api.settings.custom,'keep');const loaded=reads;
  online=false;await Renderer.act(async()=>emit(true));await Renderer.act(async()=>api.refresh());assert.equal(reads,loaded);assert.equal(api.settings.bannerText,'Saved banner');assert.equal(api.loadError,true);
  online=true;await Renderer.act(async()=>emit(false));assert.equal(api.loadError,false);assert.equal(api.settings.custom,'keep');assert.equal(reads,loaded);
  const log=console.error;try{console.error=()=>{};await Renderer.act(async()=>errorListener({code:'permission-denied'}));}finally{console.error=log;}assert.ok(api.loadErrorMessage.includes('rechazó el acceso'));assert.equal(api.settings.bannerText,'Saved banner');
 }finally{if(view)await Renderer.act(async()=>view.unmount());Module._load=oldLoad;Module._extensions['.js']=oldJS;}
});
