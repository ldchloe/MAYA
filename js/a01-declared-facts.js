'use strict';
// A01: collect SBOM assertions without promoting self-declarations to verified governance.
// These observations are traceable to the imported SBOM, not independently authenticated.
const {digest,deterministicId}=require('./enrichment-canonical.js');
const str=x=>typeof x==='string'&&x.trim()?x.trim():null;
function collectDeclaredFacts(document,component){
 const raw=component.raw||{},claims=[];
 const add=(dimension,field,value,sourcePath)=>{
  const v=str(value);if(!v)return;
  const core={componentId:component.id,documentId:document.id,dimension,field,value:v,sourcePath,method:'sbom-declaration'};
  claims.push({id:deterministicId('declaration',core),...core,verificationStatus:'DECLARED_UNVERIFIED'});
 };
 const purl=str(raw.purl),ecosystem=purl?.match(/^pkg:([^/]+)/)?.[1]?.toLowerCase()||'unknown';
 add('technical','purl',purl,'$.components[].purl');
 add('technical','name',raw.name,'$.components[].name');
 add('technical','version',raw.version,'$.components[].version');
 add('technical','language',raw.language,'$.components[].language');
 if(Array.isArray(raw.licenses))for(const [i,l] of raw.licenses.entries())add('technical','license',l?.expression||l?.license?.id||l?.license?.name,'$.components[].licenses['+i+']');
 add('governance','supplier',raw.supplier?.name,'$.components[].supplier.name');
 add('governance','publisher',raw.publisher,'$.components[].publisher');
 add('governance','author',raw.author,'$.components[].author');
 if(Array.isArray(raw.authors))for(const [i,a] of raw.authors.entries())add('governance','author',a?.name,'$.components[].authors['+i+'].name');
 if(Array.isArray(raw.externalReferences))for(const [i,ref] of raw.externalReferences.entries()){
  if(['website','vcs','distribution'].includes(ref?.type))add('governance','reference:'+ref.type,ref.url,'$.components[].externalReferences['+i+'].url');
 }
 claims.sort((a,b)=>a.id.localeCompare(b.id));
 return {componentId:component.id,ecosystem,claims,verificationStatus:'DECLARED_UNVERIFIED',sourceDigest:digest(claims)};
}
function verifyDeclaredFacts(document,component,result){
 if(!result||result.componentId!==component.id)return false;
 return JSON.stringify(collectDeclaredFacts(document,component))===JSON.stringify(result);
}
module.exports={collectDeclaredFacts,verifyDeclaredFacts};
