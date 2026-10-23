/* Lot B provider abstraction: acquisition only; no identity decisions. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MayaIdentityProvider=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const ORIGIN='https://repo.maven.apache.org/maven2';
function createMavenCentralProvider({fetchImpl,now,baseUrl=ORIGIN}={}){
 if(typeof fetchImpl!=='function'||typeof now!=='function')throw new Error('fetchImpl and now required');
 if(baseUrl!==ORIGIN)throw new Error('unapproved provider origin');
 async function acquire(identity,{scope='Version'}={}){
  if(!identity||identity.ecosystem!=='maven')throw new Error('Maven identity required');
  if(!['Package','Version'].includes(scope))throw new Error('invalid observation scope');
  for(const segment of [identity.namespace,identity.name,...(scope==='Version'?[identity.version]:[])])
   if(typeof segment!=='string'||! /^[A-Za-z0-9_.-]+$/.test(segment)||segment==='.'||segment==='..')throw new Error('unsafe Maven coordinate');
  const prefix=identity.namespace.replace(/\./g,'/')+'/'+identity.name+'/';
  const path=scope==='Package'?prefix+'maven-metadata.xml':prefix+identity.version+'/'+identity.name+'-'+identity.version+'.pom';
  const url=baseUrl+'/'+path,observedAt=now();
  if(typeof observedAt!=='string'||Number.isNaN(Date.parse(observedAt)))throw new Error('invalid observation time');
  let status=null,body='',transport='ok',error=null;
  try{
   const response=await fetchImpl(url,{redirect:'error'});
   status=response.status;
   if(status===200){
    body=await response.text();
    if(typeof body!=='string'||body.length>1048576){body='';transport='InvalidResponse';error='response-too-large-or-invalid';}
   }else if(status===404){/* valid Maven repository endpoint negative observation */ }
   else{
    transport=status===429?'RateLimited':status===401||status===403?'AuthenticationError':'ProviderUnavailable';
    error='http-'+status;
   }
  }catch(e){
   transport=e&&e.name==='AbortError'?'Timeout':'NetworkError';
   error=transport;
  }
  return Object.freeze({providerId:'maven-central',providerVersion:'2',scope,url,query:{namespace:identity.namespace,name:identity.name,version:scope==='Version'?identity.version:null},observedAt,status,transport,error,body});
 }
 return Object.freeze({providerId:'maven-central',supports:ecosystem=>ecosystem==='maven',acquire});
}
return Object.freeze({createMavenCentralProvider});
});