/* Lot B B-01: Maven coordinates from canonical CycloneDX components. No I/O. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MayaIdentityPurl=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const TOKEN=/^[A-Za-z0-9_.-]+$/;
function valid(value){return typeof value==='string'&&value.length>0&&value!=='.'&&value!=='..'&&!value.startsWith('.')&&TOKEN.test(value);}
function parseMavenPurl(value,allowUnversioned){
 if(typeof value!=='string')return null;
 const match=(allowUnversioned?/^pkg:maven\/([^/?#@]+)\/([^/?#@]+)(?:@([^/?#@]+))?$/:/^pkg:maven\/([^/?#@]+)\/([^/?#@]+)@([^/?#@]+)$/).exec(value);
 if(!match)return null;
 try{
  const namespace=decodeURIComponent(match[1]),name=decodeURIComponent(match[2]);
  const version=match[3]===undefined?null:decodeURIComponent(match[3]);
  if(!valid(namespace)||!valid(name)||(version!==null&&!valid(version)))return null;
  return {namespace,name,version};
 }catch{return null;}
}
function createPackageIdentity(coordinates){
 if(!coordinates||!valid(coordinates.namespace)||!valid(coordinates.name))return null;
 const {namespace,name}=coordinates;
 const key='maven:'+namespace+':'+name;
 const canonicalPurl='pkg:maven/'+encodeURIComponent(namespace)+'/'+encodeURIComponent(name);
 return Object.freeze({ecosystem:'maven',namespace,name,key,identityKey:key,canonicalPurl});
}
function extractMavenPurl(purl){
 const coordinates=parseMavenPurl(purl,false);
 if(!coordinates)return null;
 const identity=createPackageIdentity(coordinates);
 return Object.freeze({...identity,version:coordinates.version,purl});
}
function extractMavenCoordinates(component){
 if(!component||typeof component!=='object'||Array.isArray(component))return null;
 const purl=component.purl;
 const hasPurl=typeof purl==='string'&&purl.length>0;
 // A declared non-Maven or malformed PURL cannot be silently overridden.
 const fromPurl=hasPurl?parseMavenPurl(purl,true):null;
 if(hasPurl&&!fromPurl)return null;
 const group=component.group, name=component.name, version=component.version;
 const nativeGroup=typeof group==='string'&&group.length>0;
 const nativeName=typeof name==='string'&&name.length>0;
 const nativeVersion=typeof version==='string'&&version.length>0;
 if((nativeGroup&&!valid(group))||(nativeVersion&&!valid(version)))return null;
 if(fromPurl){
  // Preserve incompatible declarations on the original canonical component; do not select.
  if((nativeGroup&&group!==fromPurl.namespace)||(nativeName&&name!==fromPurl.name)||
     (nativeVersion&&fromPurl.version!==null&&version!==fromPurl.version))return null;
  return Object.freeze({...fromPurl,identity:createPackageIdentity(fromPurl),purl:purl,source:'purl'});
 }
 if(!nativeGroup||!nativeName||!valid(name))return null;
 const coordinates={namespace:group,name,version:nativeVersion?version:null};
 return Object.freeze({...coordinates,identity:createPackageIdentity(coordinates),purl:null,source:'native'});
}
return Object.freeze({extractMavenPurl,extractMavenCoordinates,createPackageIdentity});
});
