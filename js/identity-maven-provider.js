/* Lot B provider abstraction: acquisition only, never makes identity decisions. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MayaIdentityProvider=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function createMavenCentralProvider({fetchImpl,now,baseUrl='https://repo.maven.apache.org/maven2'}={}){
 if(typeof fetchImpl!=='function'||typeof now!=='function')throw new Error('fetchImpl and now required');
 if(baseUrl!=='https://repo.maven.apache.org/maven2')throw new Error('unapproved provider origin');
 async function acquire(identity){
  if(!identity||identity.ecosystem!=='maven')throw new Error('Maven identity required');
  for(const segment of [identity.namespace,identity.name,identity.version])if(typeof segment!=='string'||! /^[A-Za-z0-9_.-]+$/.test(segment)||segment==='.'||segment==='..')throw new Error('unsafe Maven coordinate');
  const path=identity.namespace.replace(/\./g,'/')+'/'+identity.name+'/'+identity.version+'/'+identity.name+'-'+identity.version+'.pom';
  const url=baseUrl+'/'+path;
  const observedAt=now();
  let status=null,body='',transport='ok',error=null;
  try{
   const response=await fetchImpl(url,{redirect:'error'});
   status=response.status;
   if(status===200){body=await response.text();if(body.length>1048576){body='';transport='invalid-response';error='response-too-large';}}
   else if(status!==404){transport='unavailable';error='http-'+status;}
  }catch(e){transport='unavailable';error=e&&e.name==='AbortError'?'timeout':'network-error';}
  return Object.freeze({providerId:'maven-central',providerVersion:'1',url,query:{namespace:identity.namespace,name:identity.name,version:identity.version},observedAt,status,transport,error,body});
 }
 return Object.freeze({providerId:'maven-central',supports:ecosystem=>ecosystem==='maven',acquire});
}
return Object.freeze({createMavenCentralProvider});
});
