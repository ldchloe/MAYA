'use strict';
/* Evidence-bound governance facts; reuse canonical deterministic IDs and existing C-01 project registry. */
const fs=require('node:fs'),path=require('node:path');
const {digest,deterministicId,sha256Text}=require('./enrichment-canonical.js');
const registry=require('./c01-corpus-registry.js');
const allowedProjects=new Set([...registry.approved.map(x=>x.projectIdentityId),'project:3b8b92fd783639e12f59ff6256967b246edd5249343217fb6d669a6ce688ff8e']);
const predicates=['attributedToOrganization','governedByFoundation','maintainedBy'];
const archiveScopes=Object.freeze({
 'fixtures/c01/junit4-r4.13.2-upstream-pom.xml':{projectId:'project:3b8b92fd783639e12f59ff6256967b246edd5249343217fb6d669a6ce688ff8e'},
 'fixtures/c01/spring/spring-framework-v6.1.3-readme.md':{domain:'C01-I05'},
 'fixtures/c01/log4j/apache-log4j-parent-pom.xml':{domain:'C01-I06'},
 'fixtures/e01/apache/apache-logging-guidelines.html':{domain:'C01-I06',sha256:'55d5377bdf82ec38d4bd8357c97095a6a059b86c2e771598c848f94a872102f3',url:'https://logging.apache.org/guidelines.html',observedAt:'2026-10-27T13:49:41.385Z'},
 'fixtures/e01/apache/apache-log4j-guidelines.html':{domain:'C01-I06',sha256:'9a51e1fca74ce85cc287cf2f87c405b028831746165b406e40ae5bca79e32fad',url:'https://logging.apache.org/log4j/2.3.x/guidelines.html',observedAt:'2026-10-27T13:49:41.505Z'},
 'fixtures/e01/apache/apache-logging-charter.html':{domain:'C01-I06',sha256:'b2bbf5c22c56729e3d92693ad1b302004cbb8f1c3e99d6c43c2e64dce6974df4',url:'https://logging.apache.org/charter.html',observedAt:'2026-10-27T13:49:41.627Z'}
});
const isObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function evidenceFor(c,id){
 if(!isObj(c)||c.projectIdentityId!==id||!predicates.includes(c.predicate)||typeof c.object!=='string'||!c.object.trim()||!isObj(c.source))return null;
 const s=c.source;
 const scope=archiveScopes[s.archivePath];
 if(!scope||(scope.projectId&&scope.projectId!==id)||(scope.domain&&!registry.approved.some(x=>x.projectIdentityId===id&&x.contractDomain===scope.domain))||typeof s.sourceUrl!=='string'||!s.sourceUrl.startsWith('https://')||typeof s.selector!=='string'||s.selector.length<12||typeof s.observedAt!=='string'||!Number.isFinite(Date.parse(s.observedAt)))return null;
 if(scope.url&&(s.sourceUrl!==scope.url||s.observedAt!==scope.observedAt))return null;
 if((s.validFrom!=null&&typeof s.validFrom!=='string')||(s.validTo!=null&&typeof s.validTo!=='string'))return null;
 let raw;try{raw=fs.readFileSync(path.resolve(__dirname,'..',s.archivePath),'utf8')}catch{return null}
 if(scope.sha256&&sha256Text(raw)!==scope.sha256)return null;
 if(!raw.includes(s.selector))return null;
 // An explicit contextual statement is required; names, domain URLs and contribution alone are not governance.
 if(c.predicate==='attributedToOrganization'&&!/(<organization>\s*<name>|governed by|maintained by|stewardship of)/i.test(s.selector))return null;
 if(c.predicate==='governedByFoundation'&&!/(governed by.*foundation|foundation governs|project.*of the .*foundation|project<\\/em> of the .*foundation)/i.test(s.selector))return null;
 if(c.predicate==='maintainedBy'&&!/(<maintainer>|maintained by|maintainers:|responsible for managing the Apache)/i.test(s.selector))return null;
 if(!s.selector.includes(c.object))return null;
 const core={projectIdentityId:id,predicate:c.predicate,object:c.object,archivePath:s.archivePath,archiveId:'archive:'+sha256Text(raw),archiveSha256:sha256Text(raw),sourceUrl:s.sourceUrl,selector:s.selector,observedAt:s.observedAt,validFrom:s.validFrom??null,validTo:s.validTo??null,method:'official-archived-document'};
 return {id:deterministicId('evidence',core),...core};
}
function resolveGovernance({projectIdentityId,claims=[]}={}){
 if(!allowedProjects.has(projectIdentityId)||!Array.isArray(claims))throw Error('UNKNOWN_PROJECT_OR_INVALID_CLAIMS');
 const evidence=claims.map(c=>evidenceFor(c,projectIdentityId)).filter(Boolean);
 const unique=[...new Map(evidence.map(e=>[e.id,e])).values()].sort((a,b)=>a.id.localeCompare(b.id));
 const assertions=unique.map(e=>{const core={projectIdentityId,predicate:e.predicate,object:e.object,evidenceIds:[e.id],validFrom:e.validFrom,validTo:e.validTo};return {id:deterministicId('assertion',core),...core,status:'VERIFIED'};}).sort((a,b)=>a.id.localeCompare(b.id));
 const conflicts=[],decisions={};
 for(const predicate of predicates){
  const matches=assertions.filter(a=>a.predicate===predicate),values=[...new Set(matches.map(a=>a.object))].sort();
  if(values.length>1){const core={projectIdentityId,predicate,reason:'CONTRADICTORY_GOVERNANCE',values,assertionIds:matches.map(a=>a.id)};conflicts.push({id:deterministicId('conflict',core),...core})}
  const status=values.length>1?'CONFLICTED':values.length===1?'VERIFIED':'UNKNOWN';
  const core={projectIdentityId,predicate,status,objects:values.length===1?values:[],assertionIds:matches.map(a=>a.id),conflictIds:conflicts.filter(c=>c.predicate===predicate).map(c=>c.id),reason:status==='UNKNOWN'?'NO_VERIFIED_OFFICIAL_EVIDENCE':status==='CONFLICTED'?'CONTRADICTORY_GOVERNANCE':'EXPLICIT_ARCHIVED_SOURCE',ruleVersion:'E01-1'};
  decisions[predicate]={id:deterministicId('decision',core),...core};
 }
 const result={projectIdentityId,evidence:unique,assertions,conflicts,decisions};
 return {...result,resultDigest:digest(result)};
}
function verifyGovernance(r){
 if(!isObj(r)||!allowedProjects.has(r.projectIdentityId)||!Array.isArray(r.evidence)||!Array.isArray(r.assertions)||!Array.isArray(r.conflicts)||!isObj(r.decisions))return false;
 try{
  const ids=new Set(r.evidence.map(e=>e.id));
  if(!r.evidence.every(e=>{const {id,...core}=e;const source={archivePath:e.archivePath,sourceUrl:e.sourceUrl,selector:e.selector,observedAt:e.observedAt,validFrom:e.validFrom,validTo:e.validTo};const reconstructed=evidenceFor({projectIdentityId:r.projectIdentityId,predicate:e.predicate,object:e.object,source},r.projectIdentityId);return id===deterministicId('evidence',core)&&reconstructed?.id===id}))return false;
  if(!r.assertions.every(a=>{const {id,status,...core}=a;return status==='VERIFIED'&&id===deterministicId('assertion',core)&&a.evidenceIds.every(x=>ids.has(x))}))return false;
  if(!Object.values(r.decisions).every(d=>{const {id,...core}=d;return id===deterministicId('decision',core)}))return false;
  const {resultDigest,...core}=r;return resultDigest===digest(core);
 }catch{return false}
}
// Explicitly synthetic fixture path: never admitted by production resolver or verifier.
function resolveSyntheticConflictForTest(projectIdentityId,predicate,values){
 if(!allowedProjects.has(projectIdentityId)||!predicates.includes(predicate)||!Array.isArray(values)||values.length<2)throw Error('INVALID_SYNTHETIC_FIXTURE');
 const names=[...new Set(values)].sort();
 if(names.length<2)throw Error('NOT_CONFLICTING');
 const evidence=names.map(object=>{const core={projectIdentityId,predicate,object,method:'SYNTHETIC TEST ONLY'};return {id:deterministicId('evidence',core),...core}});
 const assertions=evidence.map(e=>{const core={projectIdentityId,predicate,object:e.object,evidenceIds:[e.id]};return {id:deterministicId('assertion',core),...core,status:'SYNTHETIC TEST ONLY'}});
 const core={projectIdentityId,predicate,reason:'SYNTHETIC TEST ONLY',values:names,assertionIds:assertions.map(a=>a.id)};
 const conflict={id:deterministicId('conflict',core),...core};
 const decisionCore={projectIdentityId,predicate,status:'CONFLICTED',conflictIds:[conflict.id],reason:'SYNTHETIC TEST ONLY'};
 return {testOnly:true,projectIdentityId,evidence,assertions,conflicts:[conflict],decisions:{[predicate]:{id:deterministicId('decision',decisionCore),...decisionCore}}};
}
module.exports={resolveGovernance,verifyGovernance,resolveSyntheticConflictForTest};
