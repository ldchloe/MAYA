'use strict';
// H01 evidence verification v2: strict separation between SBOM assertions and external corroboration.
// External snapshots are supplied by an explicit operator manifest, never inferred from a PURL or supplier.
const fs=require('node:fs'),path=require('node:path');
const {sha256Text,deterministicId}=require('./enrichment-canonical.js');
const {collectDeclaredFacts}=require('./a01-declared-facts.js');
const STATUSES=Object.freeze(['DECLARED_UNVERIFIED','INTEGRITY_CHECKED','INDEPENDENTLY_VERIFIED','CONFLICTED','UNKNOWN']);
const ALLOWED_HOSTS=new Set(['raw.githubusercontent.com','github.com','gitlab.com','gitlab.freedesktop.org','git.gnupg.org','gnupg.org','gstreamer.freedesktop.org','crates.io','static.crates.io','docs.rs','kernel.org','www.kernel.org','layers.openembedded.org','git.openembedded.org']);
function safeUrl(value){
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&ALLOWED_HOSTS.has(u.hostname)&&!u.hash?u.href:null}catch{return null}
}
function normalizeLicense(s){return typeof s==='string'?s.trim().replace(/\\s+/g,' '):''}
function verifySnapshot(record,baseDir){
 if(!record||typeof record!=='object'||!safeUrl(record.sourceUrl)||typeof record.archivePath!=='string'||path.isAbsolute(record.archivePath)||record.archivePath.split(/[\\/]+/).includes('..')||!/^([a-f0-9]{64})$/.test(record.sha256||'')||!Number.isFinite(Date.parse(record.acquiredAt))||!['license','governance'].includes(record.dimension)||typeof record.field!=='string'||typeof record.value!=='string'||!record.value.trim()||typeof record.selector!=='string'||record.selector.length<4)return {status:'UNKNOWN',reason:'INVALID_SOURCE_METADATA'};
 const resolved=path.resolve(baseDir,record.archivePath),root=path.resolve(baseDir);
 if(!resolved.startsWith(root+path.sep))return {status:'UNKNOWN',reason:'INVALID_ARCHIVE_PATH'};
 let body;try{body=fs.readFileSync(resolved,'utf8')}catch{return {status:'UNKNOWN',reason:'ARCHIVE_NOT_FOUND'}};
 if(sha256Text(body)!==record.sha256)return {status:'UNKNOWN',reason:'ARCHIVE_DIGEST_MISMATCH'};
 if(!body.includes(record.selector)||!record.selector.includes(record.value))return {status:'UNKNOWN',reason:'SELECTOR_NOT_SUPPORTED'};
 return {status:'INTEGRITY_CHECKED',reason:'ARCHIVE_INTEGRITY_AND_SELECTOR_CONFIRMED',archiveSha256:record.sha256};
}
function verifyComponent(document,component,manifest,baseDir){
 const declared=collectDeclaredFacts(document,component),checks=[];
 const records=Array.isArray(manifest?.records)?manifest.records:[];
 for(const claim of declared.claims){
  const relevant=records.filter(r=>r.componentId===component.id&&r.dimension===claim.dimension&&r.field===claim.field);
  if(!relevant.length){checks.push({claimId:claim.id,field:claim.field,value:claim.value,status:'DECLARED_UNVERIFIED',reason:'NO_INDEPENDENT_SOURCE'});continue}
  const verified=relevant.map(r=>({r,check:verifySnapshot(r,baseDir)}));
  const accepted=verified.filter(x=>x.check.status==='INTEGRITY_CHECKED'&&x.r.identity?.name===component.raw?.name&&x.r.identity?.version===component.raw?.version&&x.r.identity?.purl===(component.raw?.purl||null)&&x.r.identity?.confirmedByOperator===true);
  const matching=accepted.filter(x=>normalizeLicense(x.r.value)===normalizeLicense(claim.value));
  const conflicts=accepted.filter(x=>normalizeLicense(x.r.value)!==normalizeLicense(claim.value));
  const status=conflicts.length?'CONFLICTED':matching.length?'INDEPENDENTLY_VERIFIED':'DECLARED_UNVERIFIED';
  const reason=conflicts.length?'OFFICIAL_SOURCE_DISAGREES':matching.length?'ARCHIVED_SOURCE_MATCHES_EXPLICIT_IDENTITY':'NO_MATCHING_VERIFIED_SOURCE';
  const sources=accepted.map(x=>({sourceUrl:x.r.sourceUrl,archiveSha256:x.r.sha256,acquiredAt:x.r.acquiredAt,archivePath:x.r.archivePath,identity:x.r.identity,sourceStatus:x.check.status}));
  const core={claimId:claim.id,field:claim.field,value:claim.value,status,reason,sources};
  checks.push({id:deterministicId('verification',core),...core});
 }
 const summary={independentlyVerified:checks.filter(x=>x.status==='INDEPENDENTLY_VERIFIED').length,conflicted:checks.filter(x=>x.status==='CONFLICTED').length,declaredUnverified:checks.filter(x=>x.status==='DECLARED_UNVERIFIED').length};
 return {componentId:component.id,checks,summary,ruleVersion:'H01-EVIDENCE-2'};
}
module.exports={STATUSES,ALLOWED_HOSTS,safeUrl,verifySnapshot,verifyComponent};
