'use strict';
// G01: source-backed historical events only. No risk or severity assessment.
const fs=require('node:fs'),path=require('node:path');
const {digest,deterministicId,sha256Text}=require('./enrichment-canonical.js');
const {resolveGovernance}=require('./e01-governance.js');
const types=Object.freeze(['OWNERSHIP_CHANGE','ACQUISITION','GOVERNANCE_CHANGE','MAINTAINER_CHANGE','LICENSE_CHANGE','REPOSITORY_CHANGE','FOUNDATION_CHANGE','SUPPLY_CHAIN_INCIDENT','COMPROMISE','RELEASE']);
const isObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const archiveRoot=path.resolve(__dirname,'../fixtures/g01/junit');
const allowedTags=new Set(['r4.13.1','r4.13.2']);
const pinnedHashes=Object.freeze({'r4.13.1':'789aeef92cde549bffb0691fc7f8a917867ac8a364ada4afe1bf15fece79689e','r4.13.2':'570584193e1d9af512e1f16c1d492fdd04e0b4d69a7abcce05c2f084c5f01071'});
const junitProjectId='project:3b8b92fd783639e12f59ff6256967b246edd5249343217fb6d669a6ce688ff8e';
function readOfficialRelease(tag){
 if(!allowedTags.has(tag))return null;
 try{
  const raw=fs.readFileSync(path.join(archiveRoot,tag+'.json'));
  const metadata=JSON.parse(fs.readFileSync(path.join(archiveRoot,tag+'.metadata.json'),'utf8'));
  const record=JSON.parse(raw.toString('utf8'));
  const url='https://api.github.com/repos/junit-team/junit4/releases/tags/'+tag;
  const hash=sha256Text(raw.toString('utf8'));
  if(hash!==pinnedHashes[tag]||metadata.requestedUrl!==url||metadata.finalUrl!==url||metadata.httpStatus!==200||!String(metadata.contentType).includes('json')||metadata.sizeBytes!==raw.length||metadata.sha256!==hash||metadata.archiveId!=='archive:'+hash||!Number.isFinite(Date.parse(metadata.acquiredAt)))return null;
  if(record.tag_name!==tag||record.draft!==false||record.prerelease!==false||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(record.published_at)||record.html_url!=='https://github.com/junit-team/junit4/releases/tag/'+tag)return null;
  return {tag,record,metadata,hash};
 }catch{return null}
}
function evidenceFor(projectIdentityId,claim){
 if(!isObj(claim)||projectIdentityId!==junitProjectId||claim.eventType!=='RELEASE'||claim.subject!==projectIdentityId||!isObj(claim.source)||!allowedTags.has(claim.after))return null;
 const archive=readOfficialRelease(claim.after);if(!archive)return null;
 const {record,metadata,hash,tag}=archive;
 if(claim.effectiveAt!==record.published_at||claim.source.archiveSha256!==hash||claim.source.archiveId!==metadata.archiveId||claim.source.acquiredAt!==metadata.acquiredAt)return null;
 const core={projectIdentityId,subject:projectIdentityId,eventType:'RELEASE',eventKey:'github-release:'+record.id,occurredAt:record.published_at,observedAt:metadata.acquiredAt,before:null,after:tag,archivePath:'fixtures/g01/junit/'+tag+'.json',archiveSha256:hash,archiveId:metadata.archiveId,sourceUrl:metadata.finalUrl,sourceScope:'official-github-junit4-release',verificationMethod:'official-archived-release-api'};
 return {id:deterministicId('evidence',core),...core};
}
function resolveTrustEvents({projectIdentityId,claims=[]}={}){
 resolveGovernance({projectIdentityId,claims:[]});
 if(!Array.isArray(claims))throw Error('INVALID_CLAIMS');
 const evidence=[...new Map(claims.map(c=>evidenceFor(projectIdentityId,c)).filter(Boolean).map(e=>[e.id,e])).values()].sort((a,b)=>a.id.localeCompare(b.id));
 const byKey=new Map();
 for(const e of evidence){const key=e.subject+'|'+e.eventType+'|'+e.eventKey;const arr=byKey.get(key)||[];arr.push(e);byKey.set(key,arr)}
 const assertions=[],conflicts=[],events=[];
 for(const key of [...byKey.keys()].sort()){
  const group=byKey.get(key),e=group[0];
  const core={subject:e.subject,eventType:e.eventType,eventKey:e.eventKey,occurredAt:e.occurredAt,before:e.before,after:e.after};
  const eventId=deterministicId('trust-event',core);
  const assertionCore={eventId,subject:e.subject,eventType:e.eventType,occurredAt:e.occurredAt,before:e.before,after:e.after,evidenceIds:group.map(x=>x.id).sort()};
  const assertion={id:deterministicId('assertion',assertionCore),...assertionCore,status:'VERIFIED'};assertions.push(assertion);
  const eventCore={eventId,eventType:e.eventType,subject:e.subject,effectiveAt:e.occurredAt,observedAt:e.observedAt,before:e.before,after:e.after,evidenceIds:assertion.evidenceIds,assertionIds:[assertion.id],status:'VERIFIED',reason:'EXPLICIT_ARCHIVED_OFFICIAL_RELEASE',sourceScope:e.sourceScope};
  events.push({...eventCore,canonicalDigest:digest(eventCore)});
 }
 events.sort((a,b)=>a.effectiveAt.localeCompare(b.effectiveAt)||a.eventId.localeCompare(b.eventId));
 const decisionCore={projectIdentityId,status:events.length?'VERIFIED':'UNKNOWN',eventIds:events.map(e=>e.eventId),evidenceIds:evidence.map(e=>e.id),conflictIds:[],reason:events.length?'EXPLICIT_OFFICIAL_HISTORICAL_EVENTS':'NO_VERIFIED_EVENT_EVIDENCE'};
 const decision={id:deterministicId('decision',decisionCore),...decisionCore};
 const result={projectIdentityId,evidence,assertions,conflicts,events,timeline:events,decision};
 return {...result,resultDigest:digest(result)};
}
function verifyTrustEvents(r){
 if(!isObj(r)||!Array.isArray(r.evidence)||!Array.isArray(r.assertions)||!Array.isArray(r.events)||!Array.isArray(r.conflicts)||!Array.isArray(r.timeline))return false;
 try{
 const claims=r.evidence.map(e=>({eventType:e.eventType,subject:e.subject,after:e.after,effectiveAt:e.occurredAt,source:{archiveSha256:e.archiveSha256,archiveId:e.archiveId,acquiredAt:e.observedAt}}));
 return JSON.stringify(r)===JSON.stringify(resolveTrustEvents({projectIdentityId:r.projectIdentityId,claims}));
 }catch{return false}
}
function resolveSyntheticEventConflictForTest(projectIdentityId,eventType,dates){
 resolveGovernance({projectIdentityId,claims:[]});
 if(!types.includes(eventType)||!Array.isArray(dates)||dates.length<2||!dates.every(v=>/^\d{4}-\d\d-\d\d$/.test(v)))throw Error('INVALID_SYNTHETIC_FIXTURE');
 const values=[...new Set(dates)].sort();if(values.length<2)throw Error('NOT_CONFLICTING');
 const evidence=values.map(occurredAt=>{const core={projectIdentityId,eventType,occurredAt,method:'SYNTHETIC TEST ONLY'};return {id:deterministicId('evidence',core),...core}});
 const assertions=evidence.map(e=>{const core={projectIdentityId,eventType,occurredAt:e.occurredAt,evidenceIds:[e.id]};return {id:deterministicId('assertion',core),...core,status:'SYNTHETIC TEST ONLY'}});
 const conflictCore={projectIdentityId,eventType,values,assertionIds:assertions.map(a=>a.id),reason:'SYNTHETIC TEST ONLY'};
 const conflict={id:deterministicId('conflict',conflictCore),...conflictCore};
 const dc={projectIdentityId,status:'CONFLICTED',conflictIds:[conflict.id],reason:'SYNTHETIC TEST ONLY'};
 return {testOnly:true,projectIdentityId,evidence,assertions,conflicts:[conflict],events:[],timeline:[],decision:{id:deterministicId('decision',dc),...dc}};
}
function resolveSyntheticChangeForTest(projectIdentityId,eventType,before,after,effectiveAt){
 resolveGovernance({projectIdentityId,claims:[]});
 if(!types.includes(eventType)||eventType==='RELEASE'||typeof before!=='string'||!before||typeof after!=='string'||!after||before===after||!/^\d{4}-\d\d-\d\d$/.test(effectiveAt))throw Error('INVALID_SYNTHETIC_CHANGE');
 const core={projectIdentityId,eventType,subject:projectIdentityId,before,after,effectiveAt,method:'SYNTHETIC TEST ONLY'};
 const evidence={id:deterministicId('evidence',core),...core};
 const eventCore={eventType,subject:projectIdentityId,before,after,effectiveAt};
 const eventId=deterministicId('trust-event',eventCore);
 const assertionCore={eventId,evidenceIds:[evidence.id],before,after,effectiveAt};
 const assertion={id:deterministicId('assertion',assertionCore),...assertionCore,status:'SYNTHETIC TEST ONLY'};
 const event={eventId,...eventCore,evidenceIds:[evidence.id],assertionIds:[assertion.id],status:'SYNTHETIC TEST ONLY'};
 const dc={projectIdentityId,status:'VERIFIED',eventIds:[eventId],reason:'SYNTHETIC TEST ONLY'};
 return {testOnly:true,projectIdentityId,evidence:[evidence],assertions:[assertion],conflicts:[],events:[event],timeline:[event],decision:{id:deterministicId('decision',dc),...dc}};
}
module.exports={resolveTrustEvents,verifyTrustEvents,resolveSyntheticEventConflictForTest,resolveSyntheticChangeForTest,EVENT_TYPES:types};
