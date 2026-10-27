'use strict';
const crypto=require('node:crypto');
const canonical=require('./enrichment-canonical.js');
const projects=require('./project-identity.js');
const authority=require('./c01-bridge-authority.js');

const POLICY_ID='maya.c01.package-project-evidence',POLICY_VERSION='1.0.0';
const sha=text=>crypto.createHash('sha256').update(Buffer.from(text,'utf8')).digest('hex');
const digest=canonical.digest;
const isDigest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const sorted=items=>[...items].sort((a,b)=>a.id.localeCompare(b.id));
const unique=items=>Array.isArray(items)&&items.every(x=>x&&nonempty(x.id))&&new Set(items.map(x=>x.id)).size===items.length;
function deepFreeze(value){
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  Object.values(value).forEach(deepFreeze);
  Object.freeze(value);
 }
 return value;
}
function validArchive(a,d){
 return a.packageIdentityId===d.packageIdentityId&&a.externalIdentityId===d.externalIdentityId&&
  nonempty(a.sourceRef)&&nonempty(a.versionScope)&&typeof a.content==='string'&&
  isDigest(a.sha256)&&sha(a.content)===a.sha256;
}
function observedBridge(b){
 try{const x=JSON.parse(b.content);return x&&typeof x==='object'&&!Array.isArray(x)&&x.predicate==='attributedToProjectIdentity'&&nonempty(x.packageIdentityId)&&nonempty(x.externalIdentityId)&&nonempty(x.projectIdentityId)?x:null;}catch{return null;}
}
function validBridge(b,d){
 return b.kind==='explicit-attribution'&&b.packageIdentityId===d.packageIdentityId&&
  b.externalIdentityId===d.externalIdentityId&&b.projectIdentityId===d.projectIdentityId&&
  nonempty(b.sourceRef)&&nonempty(b.versionScope)&&typeof b.content==='string'&&
  isDigest(b.sourceDigest)&&sha(b.content)===b.sourceDigest&&
  observedBridge(b)?.packageIdentityId===d.packageIdentityId&&observedBridge(b)?.externalIdentityId===d.externalIdentityId&&observedBridge(b)?.projectIdentityId===d.projectIdentityId;
}
function isOtherCandidate(b,d){
 return b.kind==='explicit-attribution'&&b.packageIdentityId===d.packageIdentityId&&
  b.externalIdentityId===d.externalIdentityId&&b.projectIdentityId!==d.projectIdentityId&&
  nonempty(b.projectIdentityId)&&nonempty(b.sourceRef)&&nonempty(b.versionScope)&&
  typeof b.content==='string'&&isDigest(b.sourceDigest)&&sha(b.content)===b.sourceDigest&&
  observedBridge(b)?.packageIdentityId===d.packageIdentityId&&observedBridge(b)?.externalIdentityId===d.externalIdentityId&&observedBridge(b)?.projectIdentityId===b.projectIdentityId;
}
function makeAssertion(d,projectId,bridgeIds){
 const basis={packageIdentityId:d.packageIdentityId,externalIdentityId:d.externalIdentityId,projectIdentityId:projectId,bridgeIds:[...bridgeIds].sort()};
 return {id:'assertion:'+digest(basis),subjectType:'association',subjectId:d.externalIdentityId,
  predicate:'attributedToProjectIdentity',value:projectId,packageIdentityId:d.packageIdentityId,
  evidenceIds:[...bridgeIds].sort(),policyVersion:POLICY_VERSION};
}
function evaluate(d){
 if(!d||typeof d!=='object'||!nonempty(d.packageIdentityId)||!nonempty(d.externalIdentityId)||!nonempty(d.projectIdentityId))throw Error('invalid attribution dossier');
 const archives=unique(d.archives)?sorted(d.archives):[];
 const bridges=unique(d.bridgeEvidence)?sorted(d.bridgeEvidence):[];
 const vx=unique(d.archives)&&archives.length>0&&archives.every(a=>validArchive(a,d))?'PASS':'FAIL';
 let vy='FAIL';
 try{
  projects.validateProjectIdentitySnapshot(d.projectSnapshot);
  if(projects.getProjectIdentity(d.projectSnapshot,d.projectIdentityId))vy='PASS';
 }catch{}
 const matching=bridges.filter(b=>validBridge(b,d));
 const alternatives=bridges.filter(b=>isOtherCandidate(b,d));
 const incompatible=alternatives.length>0;
 const bridgeAuthority=matching.length>0&&matching.every(b=>authority.evaluate(b,{predicate:'attributedToProjectIdentity',packageIdentityId:d.packageIdentityId,externalIdentityId:d.externalIdentityId,projectIdentityId:d.projectIdentityId},d.authorityRules||[])==='APPLICABLE')?'APPLICABLE':'NOT_APPLICABLE';
 const vxy=unique(d.bridgeEvidence)&&bridges.length>0&&matching.length===bridges.length&&bridgeAuthority==='APPLICABLE'?'PASS':'FAIL';
 const validation={VX:vx,VY:vy,VXY:vxy,bridgeAuthority};
 const eligible=vx==='PASS'&&vy==='PASS'&&vxy==='PASS'&&!incompatible&&d.exclusive!==false;
 const basis={policyId:POLICY_ID,policyVersion:POLICY_VERSION,packageIdentityId:d.packageIdentityId,
  externalIdentityId:d.externalIdentityId,projectIdentityId:d.projectIdentityId,
  projectSnapshotDigest:d.projectSnapshot?.snapshotDigest||null,
  archives,bridgeEvidence:bridges,authorityRules:d.authorityRules||[],validation,exclusive:d.exclusive===true};
 const dossierDigest=digest(basis);
 const assertion=makeAssertion(d,d.projectIdentityId,matching.map(b=>b.id));
 const assertions=[assertion,...alternatives.map(b=>makeAssertion(d,b.projectIdentityId,[b.id]))].sort((a,b)=>a.id.localeCompare(b.id));
 const conflicts=incompatible?[{id:'conflict:'+digest({dossierDigest,assertionIds:assertions.map(a=>a.id)}),
  subjectId:d.externalIdentityId,predicate:'attributedToProjectIdentity',
  assertionIds:assertions.map(a=>a.id),evidenceIds:bridges.map(b=>b.id).sort(),
  conflictType:'contradictory-evidence',status:'conflicted'}]:[];
 const status=incompatible?'CONFLICTED':eligible?'VERIFIED':'INDETERMINATE';
 const decision={id:'decision:'+digest({dossierDigest,status}),subjectId:d.externalIdentityId,
  predicate:'attributedToProjectIdentity',selectedAssertionId:eligible?assertion.id:null,
  rejectedAssertionIds:eligible?[]:[assertion.id],reasonCodes:eligible?['EXPLICIT_ARCHIVED_BRIDGE_VERIFIED']:
   incompatible?['CONTRADICTORY_ATTRIBUTION_EVIDENCE']:['INSUFFICIENT_ATTRIBUTION_EVIDENCE'],
  evidenceIds:bridges.map(b=>b.id).sort(),conflictIds:conflicts.map(c=>c.id),
  policyVersion:POLICY_VERSION,engineVersion:'c01-attribution-v1',inputDigest:dossierDigest};
 return deepFreeze({policyId:POLICY_ID,policyVersion:POLICY_VERSION,dossierDigest,
  validation,eligibility:eligible?'ELIGIBLE':'NOT_ELIGIBLE',status,assertion,assertions,conflicts,decision});
}
module.exports={POLICY_ID,POLICY_VERSION,evaluate};
