'use strict';
const crypto=require('node:crypto'),canonical=require('./enrichment-canonical.js'),projects=require('./project-identity.js');
const POLICY_ID='maya.c01.package-project-evidence',POLICY_VERSION='1.0.0';
const sha=x=>crypto.createHash('sha256').update(Buffer.from(x,'utf8')).digest('hex');
const sort=xs=>[...xs].sort((a,b)=>a.id.localeCompare(b.id));
const unique=xs=>Array.isArray(xs)&&xs.every(x=>x&&typeof x.id==='string')&&new Set(xs.map(x=>x.id)).size===xs.length;
const goodArchive=(a,d)=>a&&a.packageIdentityId===d.packageIdentityId&&a.externalIdentityId===d.externalIdentityId&&typeof a.sourceRef==='string'&&a.sourceRef&&typeof a.versionScope==='string'&&a.versionScope&&typeof a.content==='string'&&/^[a-f0-9]{64}$/.test(a.sha256||'')&&sha(a.content)===a.sha256;
const goodBridge=(b,d)=>b&&b.kind==='explicit-attribution'&&b.packageIdentityId===d.packageIdentityId&&b.externalIdentityId===d.externalIdentityId&&b.projectIdentityId===d.projectIdentityId&&typeof b.sourceRef==='string'&&b.sourceRef&&typeof b.versionScope==='string'&&b.versionScope&&typeof b.content==='string'&&/^[a-f0-9]{64}$/.test(b.sourceDigest||'')&&sha(b.content)===b.sourceDigest;
function evaluate(d){
 if(!d||typeof d!=='object'||typeof d.packageIdentityId!=='string'||typeof d.externalIdentityId!=='string'||typeof d.projectIdentityId!=='string')throw Error('invalid attribution dossier');
 const archives=unique(d.archives)?sort(d.archives):[],bridges=unique(d.bridgeEvidence)?sort(d.bridgeEvidence):[];
 const vx=archives.length>0&&archives.every(a=>goodArchive(a,d))?'PASS':'FAIL';
 let vy='FAIL';try{projects.validateProjectIdentitySnapshot(d.projectSnapshot);if(projects.getProjectIdentity(d.projectSnapshot,d.projectIdentityId))vy='PASS';}catch{}
 const matching=bridges.filter(b=>goodBridge(b,d));
 const incompatible=bridges.some(b=>b.kind==='explicit-attribution'&&b.externalIdentityId===d.externalIdentityId&&b.packageIdentityId===d.packageIdentityId&&b.projectIdentityId!==d.projectIdentityId&&typeof b.content==='string'&&sha(b.content)===b.sourceDigest);
 const vxy=bridges.length>0&&matching.length===bridges.length?'PASS':'FAIL';
 const validation={VX:vx,VY:vy,VXY:vxy};
 const eligible=vx==='PASS'&&vy==='PASS'&&vxy==='PASS'&&!incompatible&&d.exclusive!==false;
 const basis={policyId:POLICY_ID,policyVersion:POLICY_VERSION,packageIdentityId:d.packageIdentityId,externalIdentityId:d.externalIdentityId,projectIdentityId:d.projectIdentityId,projectSnapshotDigest:d.projectSnapshot?.snapshotDigest||null,archives,bridgeEvidence:bridges,validation,exclusive:d.exclusive===true};
 const dossierDigest=canonical.digest(basis),assertionId='assertion:'+dossierDigest;
 const assertion={id:assertionId,subjectType:'externalIdentity',subjectId:d.externalIdentityId,predicate:'attributedToProjectIdentity',value:d.projectIdentityId,evidenceIds:bridges.map(b=>b.id),policyVersion:POLICY_VERSION};
 const conflicts=incompatible?[{id:'conflict:'+canonical.digest({dossierDigest,bridgeIds:bridges.map(b=>b.id)}),subjectId:d.externalIdentityId,predicate:'attributedToProjectIdentity',evidenceIds:bridges.map(b=>b.id)}]:[];
 const status=incompatible?'CONFLICTED':eligible?'VERIFIED':'INDETERMINATE';
 const decision={id:'decision:'+canonical.digest({dossierDigest,status}),subjectId:d.externalIdentityId,predicate:'attributedToProjectIdentity',selectedAssertionId:eligible?assertionId:null,rejectedAssertionIds:eligible?[]:[assertionId],reasonCodes:eligible?['EXPLICIT_ARCHIVED_BRIDGE_VERIFIED']:incompatible?['CONTRADICTORY_ATTRIBUTION_EVIDENCE']:['INSUFFICIENT_ATTRIBUTION_EVIDENCE'],evidenceIds:bridges.map(b=>b.id),conflictIds:conflicts.map(c=>c.id),policyVersion:POLICY_VERSION,engineVersion:'c01-attribution-v1',inputDigest:dossierDigest};
 return {policyId:POLICY_ID,policyVersion:POLICY_VERSION,dossierDigest,validation,eligibility:eligible?'ELIGIBLE':'NOT_ELIGIBLE',status,assertion,conflicts,decision};
}
module.exports={POLICY_ID,POLICY_VERSION,evaluate};
