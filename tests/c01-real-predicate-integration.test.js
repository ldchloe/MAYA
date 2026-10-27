'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {fixture,refresh}=require('./c01-documentary-fixtures.js');
const {qualify,RULES_ID,RULES_VERSION}=require('../js/c01-documentary-qualification.js');
const {createProof}=require('../js/c01-completeness-proof.js');
const {verify}=require('../js/c01-completeness-verifier.js');
const {run}=require('../js/c01-resolution-boundary.js');
const {acceptDocumentarySnapshot}=require('../js/c01-snapshot-acceptance.js');
const policy=require('../js/c01-eligibility-policy.js');
function real(values=['project:'+'a'.repeat(32)],allowed=[]){
 const e=fixture({values,allowed,predicate:'attributedToProjectIdentity'});
 for(let i=0;i<values.length;i++){
  const a=e.payload.assertions[i],v=e.payload.evidence[i];
  a.subjectType='association';a.subjectId='external:junit';a.value=values[i];
  v.subjectType='association';v.subjectId=a.subjectId;v.attribute=a.predicate;v.observedValue=values[i];
  e.payload.evidenceRelations[i].subjectId=a.subjectId;
 }
 return refresh(e);
}
function attachProof(e){
 const q=qualify(e);
 e.payload.conflicts=q.conflicts;
 refresh(e);
 e.qualificationProof=createProof(e,qualify(e));
 e.resolutionResult=run(e);
 return e;
}
test('T40 real predicate qualified and covered',()=>{
 const e=real();const q=qualify(e);
 assert.equal(q.comparisonClasses[0].predicate,'attributedToProjectIdentity');
 assert.deepEqual(q.examinedAssertionIds,['a1']);
 const proof=createProof(e,q);assert.deepEqual(proof.examinedAssertionIds,['a1']);
 assert.equal(verify(e,e.payload,{id:RULES_ID,version:RULES_VERSION},proof),true);
});
test('T41 real predicate default deny even when allowlisted without bridge verification',()=>{
 const e=real(undefined,['a1']);
 assert.equal(policy.evaluate(e,e.payload.assertions[0],true),'NOT_ELIGIBLE');
});
test('T42 noneligible real assertion retained and not transmitted',()=>{
 const e=attachProof(real());
 assert.deepEqual(e.resolutionResult.admittedIds,['a1']);
 assert.deepEqual(e.resolutionResult.transmittedIds,[]);
 assert.deepEqual(e.qualificationProof.examinedAssertionIds,['a1']);
 assert.equal(e.payload.evidenceRelations.length,1);
 assert.equal(e.resolutionResult.engineResult.decisions.length,0);
 assert.equal(acceptDocumentarySnapshot(e).acceptanceStatus,'ACCEPTED');
});
test('T43 contradictory real values create documentary conflict and no selection',()=>{
 const e=real(['project:'+'a'.repeat(32),'project:'+'b'.repeat(32)]);
 const q=qualify(e);
 assert.equal(q.conflicts.length,1);
 assert.deepEqual(q.conflicts[0].assertionIds,['a1','a2']);
 attachProof(e);
 assert.equal(verify(e,e.payload,{id:RULES_ID,version:RULES_VERSION},e.qualificationProof),true);
 assert.equal(e.resolutionResult.engineResult.decisions.length,0);
 assert.equal(acceptDocumentarySnapshot(e).acceptanceStatus,'ACCEPTED');
});
test('T44 incomplete proof rejected and unexpected decision rejected',()=>{
 const e=attachProof(real());
 assert.equal(acceptDocumentarySnapshot(e).acceptanceStatus,'ACCEPTED');
 e.qualificationProof={...e.qualificationProof,examinedAssertionIds:[]};
 assert.equal(acceptDocumentarySnapshot(e).acceptanceStatus,'REJECTED');
 attachProof(e);
 e.resolutionResult={...e.resolutionResult,engineResult:{decisions:[{id:'forged'}],conflicts:[]}};
 assert.equal(acceptDocumentarySnapshot(e).acceptanceStatus,'REJECTED');
});
