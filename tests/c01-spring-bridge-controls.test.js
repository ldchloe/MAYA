'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createProjectIdentityRegistry,allocateProjectIdentity,linkPackageIdentity,validateProjectIdentitySnapshot}=require('../js/project-identity.js');
const {resolveApprovedAuthority}=require('../js/c01-approved-authorities.js');
const {materializeApproved,verifyApproved}=require('../js/c01-p1-p5-evidence.js');
const {issue}=require('../js/c01-approved-bridge-rule.js');
const pkg='maven:org.springframework:spring-core:6.1.3';
const project='project:389fa659b1d9c46c996fcbef55f8b0c0c3dc7bb9790b9db8e4755c8f82ee79ef';
const claim={externalIdentityId:pkg,packageIdentityId:pkg,predicate:'attributedToProjectIdentity',projectIdentityId:project};
test('SPR-03 complete official repository-bound source evidence and deterministic bridge digest',()=>{
 const a=resolveApprovedAuthority(claim),corpus=materializeApproved(a);
 const expected={packageIdentityId:pkg,projectIdentityId:project,snapshotDigest:a.projectSnapshotDigest};
 assert.equal(corpus.length,7);
 assert.equal(verifyApproved(corpus,expected,a).status,'BRIDGE_EVIDENCE_COMPLETE');
 assert.deepEqual(issue(claim),issue(claim));
});
test('SPR-04 missing mandatory official module evidence rejects V-PY',()=>{
 const a=resolveApprovedAuthority(claim),corpus=materializeApproved(a);
 const expected={packageIdentityId:pkg,projectIdentityId:project,snapshotDigest:a.projectSnapshotDigest};
 assert.equal(verifyApproved(corpus.filter(x=>x.evidenceClass!=='official-module-settings'),expected,a).status,'BRIDGE_EVIDENCE_INCOMPLETE');
});
test('SPR-07 altered evidence or swapped source digest rejects V-PY',()=>{
 const a=resolveApprovedAuthority(claim),corpus=materializeApproved(a);
 const expected={packageIdentityId:pkg,projectIdentityId:project,snapshotDigest:a.projectSnapshotDigest};
 assert.equal(verifyApproved(corpus.map((x,i)=>i===0?{...x,sourceDigest:'0'.repeat(64)}:x),expected,a).status,'BRIDGE_EVIDENCE_INVALID');
 assert.equal(verifyApproved(corpus,{...expected,projectIdentityId:'project:'+'f'.repeat(64)},a).status,'BRIDGE_EVIDENCE_INVALID');
});
test('SPR-MULTI-01 controlled two packages link to same Y without merging package identities',()=>{
 const source=require('../fixtures/c01/spring/spring-framework-project-identity.snapshot.json');
 const original=source.projects[0];
 let registry=allocateProjectIdentity(createProjectIdentityRegistry(),{...original,projectId:original.id});
 for(const [i,p] of [pkg,'maven:org.springframework:spring-beans:6.1.3'].entries()){
  registry=linkPackageIdentity(registry,{relationId:'relation:'+(i+1).toString(16).padStart(64,'0'),packageIdentityId:p,projectId:project,evidenceRefs:['evidence:controlled-multimodule-fixture-'+i],createdAt:original.createdAt,attributionContext:{scope:'controlled-multimodule-test-only',documentaryBridgeStatus:i===0?'verified':'not-established'},versionScope:'6.1.3'});
 }
 assert.equal(validateProjectIdentitySnapshot(registry),true);
 assert.equal(registry.projects.length,1);
 assert.equal(registry.links.length,2);
 assert.notEqual(registry.links[0].packageIdentityId,registry.links[1].packageIdentityId);
});
