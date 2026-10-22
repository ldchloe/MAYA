/* Lot B: strict Maven PURL extraction. No registry existence is inferred. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MayaIdentityPurl=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function extractMavenPurl(purl){
 if(typeof purl!=='string')return null;
 const match=/^pkg:maven\/([^/?#@]+)\/([^/?#@]+)@([^/?#@]+)$/.exec(purl);
 if(!match)return null;
 try{
  const values=match.slice(1).map(decodeURIComponent);
  if(values.some(x=>!x||x==='.'||x==='..'||! /^[A-Za-z0-9_.-]+$/.test(x)))return null;
  const [namespace,name,version]=values;
  if(namespace.startsWith('.')||name.startsWith('.')||version.startsWith('.'))return null;
  return Object.freeze({ecosystem:'maven',namespace,name,version,key:'maven:'+namespace+':'+name,purl});
 }catch{return null;}
}
return Object.freeze({extractMavenPurl});
});
