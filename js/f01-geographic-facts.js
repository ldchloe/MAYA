'use strict';
// F01: geographic facts are separate from governance and scores. Fail closed.
const {digest,deterministicId,sha256Text}=require('./enrichment-canonical.js');
const {resolveGovernance}=require('./e01-governance.js');
const types=Object.freeze(['LEGAL_JURISDICTION','REGISTERED_LOCATION','MAINTAINER_LOCATION','HOSTING_LOCATION','DEVELOPMENT_LOCATION','FOUNDATION_LOCATION']);
const isObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function resolveGeographicFacts({projectIdentityId,claims=[]}={}){
 // Reuse E01 project allowlist; no invented ProjectIdentity.
 resolveGovernance({projectIdentityId,claims:[]});
 if(!Array.isArray(claims))throw Error('INVALID_CLAIMS');
 // Until a reviewed, archived legal source is registered, no geographic claim is admissible.
 const evidence=[],assertions=[],conflicts=[],decisions={};
 for(const relationship of types){
  const core={projectIdentityId,relationship,status:'UNKNOWN',countryCodes:[],assertionIds:[],conflictIds:[],reason:'NO_VERIFIED_ARCHIVED_GEOGRAPHIC_EVIDENCE',ruleVersion:'F01-1'};
  decisions[relationship]={id:deterministicId('decision',core),...core};
 }
 const result={projectIdentityId,evidence,assertions,conflicts,decisions};
 return {...result,resultDigest:digest(result)};
}
function verifyGeographicFacts(r){
 if(!isObj(r)||!Array.isArray(r.evidence)||r.evidence.length||!Array.isArray(r.assertions)||r.assertions.length||!Array.isArray(r.conflicts)||r.conflicts.length||!isObj(r.decisions))return false;
 try{return JSON.stringify(r)===JSON.stringify(resolveGeographicFacts({projectIdentityId:r.projectIdentityId}))}catch{return false}
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
