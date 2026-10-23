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
// B-02 is deliberately Maven-only. Declared input is never rewritten.
function normalizeMavenPurl(coordinates){
 if(!coordinates||!valid(coordinates.namespace)||!valid(coordinates.name))return null;
 const version=coordinates.version===undefined||coordinates.version===null||coordinates.version===''?null:coordinates.version;
 if(version!==null&&!valid(version))return null;
 const base=createPackageIdentity(coordinates).canonicalPurl;
 return base+(version===null?'':'@'+encodeURIComponent(version));
}
function validateMavenPurl(value){
 if(typeof value!=='string'||!value.startsWith('pkg:maven/'))
  return Object.freeze({status:'invalid',reason:'NOT_MAVEN_PURL',coordinates:null,normalizedPurl:null});
 const parsed=parseMavenPurl(value,true);
 if(!parsed)return Object.freeze({status:'invalid',reason:'INVALID_MAVEN_PURL',coordinates:null,normalizedPurl:null});
 return Object.freeze({status:'valid',reason:null,coordinates:Object.freeze(parsed),normalizedPurl:normalizeMavenPurl(parsed)});
}
function normalizeMavenComponent(component){
 const declaredPurl=component&&typeof component.purl==='string'?component.purl:null;
 const nativeGroup=component&&component.group;
 const nativeName=component&&component.name;
 const nativeVersion=component&&component.version;
 const hasGroup=typeof nativeGroup==='string'&&nativeGroup.length>0;
 const hasName=typeof nativeName==='string'&&nativeName.length>0;
 const hasVersion=typeof nativeVersion==='string'&&nativeVersion.length>0;
 const nativeValid=hasGroup&&hasName&&valid(nativeGroup)&&valid(nativeName)&&(!hasVersion||valid(nativeVersion));
 const native= nativeValid?{namespace:nativeGroup,name:nativeName,version:hasVersion?nativeVersion:null}:null;
 const parsed=declaredPurl!==null?validateMavenPurl(declaredPurl):null;
 const empty=(status,reason)=>Object.freeze({status,reason,declaredPurl,normalizedPurl:null,reconstructedPurl:null,origin:null,identity:null,version:null});
 if(parsed&&parsed.status!=='valid')return empty('invalid',parsed.reason);
 if(parsed){
  const c=parsed.coordinates;
  if((hasGroup&&nativeGroup!==c.namespace)||(hasName&&nativeName!==c.name)||
     (hasVersion&&c.version!==null&&nativeVersion!==c.version))
   return empty('conflicted','INCOMPATIBLE_DECLARATIONS');
  if((hasGroup&&!valid(nativeGroup))||(hasName&&!valid(nativeName))||(hasVersion&&!valid(nativeVersion)))
   return empty('invalid','INVALID_NATIVE_COORDINATES');
  const version=c.version===null&&hasVersion?nativeVersion:c.version;
  const identity=createPackageIdentity(c);
  return Object.freeze({status:'valid',reason:null,declaredPurl,normalizedPurl:parsed.normalizedPurl,reconstructedPurl:null,origin:'declared',identity,version});
 }
 if(!native)return empty('insufficient','INSUFFICIENT_COORDINATES');
 return Object.freeze({status:'reconstructed',reason:null,declaredPurl:null,normalizedPurl:null,reconstructedPurl:normalizeMavenPurl(native),origin:'native',identity:createPackageIdentity(native),version:native.version});
}
return Object.freeze({extractMavenPurl,extractMavenCoordinates,createPackageIdentity,validateMavenPurl,normalizeMavenPurl,normalizeMavenComponent});
});
