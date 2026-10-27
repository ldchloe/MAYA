'use strict';
// F01: immutable archived legal facts, bound to verified E01 governance. No geographic inference.
const fs=require('node:fs'),path=require('node:path');
const {digest,deterministicId,sha256Text}=require('./enrichment-canonical.js');
const {resolveGovernance,verifyGovernance}=require('./e01-governance.js');
const registry=require('./c01-corpus-registry.js');
const types=Object.freeze(['LEGAL_JURISDICTION','REGISTERED_LOCATION','MAINTAINER_LOCATION','HOSTING_LOCATION','DEVELOPMENT_LOCATION','FOUNDATION_LOCATION']);
const isObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const log4j=registry.approved.find(x=>x.contractDomain==='C01-I06').projectIdentityId;
const sourceUrl='https://www.apache.org/foundation/governance/corporation.html';
const archivePath='fixtures/f01/asf/corporation.html';
const metadataPath='fixtures/f01/asf/corporation.metadata.json';
const foundationClaim={projectIdentityId:log4j,predicate:'governedByFoundation',object:'Apache Software Foundation',source:{archivePath:'fixtures/e01/apache/apache-logging-guidelines.html',sourceUrl:'https://logging.apache.org/guidelines.html',selector:'Logging Services is a <em>project</em> of the <a href="https://apache.org">Apache Software Foundation</a> (ASF) and composed of several <em>subprojects</em>; Log4cxx, Log4j',observedAt:'2026-10-27T13:49:41.385Z'}};
function approvedSubject(projectIdentityId,subject,relationship){
 if(projectIdentityId!==log4j||subject!=='Apache Software Foundation'||relationship!=='LEGAL_JURISDICTION')return false;
 const governance=resolveGovernance({projectIdentityId,claims:[foundationClaim]});
 return verifyGovernance(governance)&&governance.decisions.governedByFoundation.status==='VERIFIED'&&governance.decisions.governedByFoundation.objects.includes(subject);
}
function evidenceFor(projectIdentityId,c){
 if(!isObj(c)||!approvedSubject(projectIdentityId,c.subject,c.relationship)||c.countryCode!=='US'||c.countryObserved!=='United States'||c.jurisdictionSubdivision!=='Delaware'||!isObj(c.source))return null;
 const s=c.source;
 if(s.archivePath!==archivePath||s.sourceUrl!==sourceUrl||s.selector!=='The ASF is a Delaware membership corporation'||(s.validFrom!=null&&typeof s.validFrom!=='string')||(s.validTo!=null&&typeof s.validTo!=='string'))return null;
 let raw,meta;
 try{raw=fs.readFileSync(path.resolve(__dirname,'..',archivePath));meta=JSON.parse(fs.readFileSync(path.resolve(__dirname,'..',metadataPath),'utf8'))}catch{return null}
 const hash=sha256Text(raw.toString('utf8'));
 if(meta.requestedUrl!==sourceUrl||meta.finalUrl!==sourceUrl||meta.httpStatus!==200||!String(meta.contentType).includes('text/html')||meta.sha256!==hash||meta.archiveId!=='archive:'+hash||meta.sizeBytes!==raw.length||!Number.isFinite(Date.parse(meta.acquiredAt))||!raw.toString('utf8').includes(s.selector)||!raw.toString('utf8').includes('subject to DE laws'))return null;
 if(s.acquiredAt!==meta.acquiredAt||s.archiveSha256!==hash)return null;
 const core={projectIdentityId,subject:c.subject,relationship:c.relationship,countryCode:'US',countryObserved:'United States',jurisdictionSubdivision:'Delaware',archivePath,archiveId:meta.archiveId,archiveSha256:hash,sourceUrl,selector:s.selector,acquiredAt:meta.acquiredAt,observedAt:meta.acquiredAt,validFrom:s.validFrom??null,validTo:s.validTo??null,verificationMethod:'official-archived-corporate-statement'};
 return {id:deterministicId('evidence',core),...core};
}
function resolveGeographicFacts({projectIdentityId,claims=[]}={}){
 resolveGovernance({projectIdentityId,claims:[]});
 if(!Array.isArray(claims))throw Error('INVALID_CLAIMS');
 const evidence=[...new Map(claims.map(c=>evidenceFor(projectIdentityId,c)).filter(Boolean).map(e=>[e.id,e])).values()].sort((a,b)=>a.id.localeCompare(b.id));
 const assertions=evidence.map(e=>{const core={projectIdentityId,subject:e.subject,relationship:e.relationship,countryCode:e.countryCode,jurisdictionSubdivision:e.jurisdictionSubdivision,evidenceIds:[e.id],validFrom:e.validFrom,validTo:e.validTo};return {id:deterministicId('assertion',core),...core,status:'VERIFIED'}}).sort((a,b)=>a.id.localeCompare(b.id));
 const conflicts=[],decisions={},countryRelationships=[];
 for(const relationship of types){
  const matched=assertions.filter(a=>a.relationship===relationship);
  const countries=[...new Set(matched.map(a=>a.countryCode))].sort();
  const status=countries.length>1?'CONFLICTED':countries.length?'VERIFIED':'UNKNOWN';
  const core={projectIdentityId,subject:matched[0]?.subject??null,relationship,status,countryCodes:status==='VERIFIED'?countries:[],jurisdictionSubdivision:status==='VERIFIED'?matched[0].jurisdictionSubdivision:null,evidenceIds:matched.flatMap(a=>a.evidenceIds).sort(),assertionIds:matched.map(a=>a.id),conflictIds:[],validFrom:matched[0]?.validFrom??null,validTo:matched[0]?.validTo??null,reason:status==='VERIFIED'?'EXPLICIT_ARCHIVED_LEGAL_SOURCE':'NO_VERIFIED_ARCHIVED_GEOGRAPHIC_EVIDENCE',ruleVersion:'F01-1'};
  decisions[relationship]={id:deterministicId('decision',core),...core};
  if(status==='VERIFIED'){const relation={subject:core.subject,relationship,countryCode:countries[0],jurisdictionSubdivision:core.jurisdictionSubdivision,decisionId:decisions[relationship].id};countryRelationships.push({id:deterministicId('country-relationship',relation),...relation})}
 }
 const result={projectIdentityId,evidence,assertions,conflicts,decisions,countryRelationships};
 return {...result,resultDigest:digest(result)};
}
function verifyGeographicFacts(r){
 if(!isObj(r)||!Array.isArray(r.evidence)||!Array.isArray(r.assertions)||!Array.isArray(r.conflicts)||!isObj(r.decisions)||!Array.isArray(r.countryRelationships))return false;
 try{
 const claims=r.evidence.map(e=>({subject:e.subject,relationship:e.relationship,countryCode:e.countryCode,countryObserved:e.countryObserved,jurisdictionSubdivision:e.jurisdictionSubdivision,source:{archivePath:e.archivePath,sourceUrl:e.sourceUrl,selector:e.selector,acquiredAt:e.acquiredAt,archiveSha256:e.archiveSha256,validFrom:e.validFrom,validTo:e.validTo}}));
 return JSON.stringify(r)===JSON.stringify(resolveGeographicFacts({projectIdentityId:r.projectIdentityId,claims}));
 }catch{return false}
}
function resolveSyntheticGeographicConflictForTest(projectIdentityId,relationship,values){
 resolveGovernance({projectIdentityId,claims:[]});
 if(!types.includes(relationship)||!Array.isArray(values)||values.length<2||!values.every(v=>typeof v==='string'&&/^[A-Z]{2}$/.test(v)))throw Error('INVALID_SYNTHETIC_FIXTURE');
 const countries=[...new Set(values)].sort();if(countries.length<2)throw Error('NOT_CONFLICTING');
 const evidence=countries.map(countryCode=>{const core={projectIdentityId,relationship,countryCode,method:'SYNTHETIC TEST ONLY'};return {id:deterministicId('evidence',core),...core}});
 const assertions=evidence.map(e=>{const core={projectIdentityId,relationship,countryCode:e.countryCode,evidenceIds:[e.id]};return {id:deterministicId('assertion',core),...core,status:'SYNTHETIC TEST ONLY'}});
 const core={projectIdentityId,relationship,values:countries,assertionIds:assertions.map(a=>a.id),reason:'SYNTHETIC TEST ONLY'};
 const conflict={id:deterministicId('conflict',core),...core};
 const decisionCore={projectIdentityId,relationship,status:'CONFLICTED',conflictIds:[conflict.id],reason:'SYNTHETIC TEST ONLY'};
 return {testOnly:true,projectIdentityId,evidence,assertions,conflicts:[conflict],decisions:{[relationship]:{id:deterministicId('decision',decisionCore),...decisionCore}}};
}
module.exports={resolveGeographicFacts,verifyGeographicFacts,resolveSyntheticGeographicConflictForTest};
