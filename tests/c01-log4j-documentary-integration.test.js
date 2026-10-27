'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const issuer=require('../js/c01-approved-bridge-rule.js'),attribution=require('../js/c01-project-attribution.js'),policy=require('../js/c01-eligibility-policy.js');
const {fixture,refresh}=require('./c01-documentary-fixtures.js');
const {qualify,RULES_ID,RULES_VERSION}=require('../js/c01-documentary-qualification.js');
const {createProof}=require('../js/c01-completeness-proof.js'),{verify}=require('../js/c01-completeness-verifier.js');
const {run}=require('../js/c01-resolution-boundary.js'),{acceptDocumentarySnapshot}=require('../js/c01-snapshot-acceptance.js');
const {dossier:junitDossier}=require('./c01-junit-real-attribution.test.js');
const base=path.join(__dirname,'../fixtures/c01/log4j');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const pkg='maven:org.apache.logging.log4j:log4j-core:2.23.1';
const project='project:4cf1b8a8c5718164a1abd9de619fa7c15415c9ad94e0ea0dba781dc2b9fa2f48';
const claim={predicate:'attributedToProjectIdentity',packageIdentityId:pkg,externalIdentityId:pkg,projectIdentityId:project};
function dossier(){
 const issued=issuer.issue(claim);
 assert.equal(issued.status,'APPROVED_BRIDGE_RULE_ISSUED');
 const content=JSON.stringify(claim),archive=read('maven-central/log4j-core-2.23.1.observation.json');
 return {packageIdentityId:pkg,externalIdentityId:pkg,projectIdentityId:project,projectSnapshot:JSON.parse(read('apache-log4j-project-identity.snapshot.json')),archives:[{id:'maven-central-log4j-core-2.23.1',packageIdentityId:pkg,externalIdentityId:pkg,sourceRef:'fixtures/c01/log4j/maven-central/log4j-core-2.23.1.observation.json',versionScope:'2.23.1',content:archive,sha256:sha(archive)}],bridgeEvidence:[{id:issued.bridgeEvidence.id,kind:'explicit-attribution',packageIdentityId:pkg,externalIdentityId:pkg,projectIdentityId:project,sourceRef:'repository:P1-P5',versionScope:'2.23.1',content,sourceDigest:sha(content),bridgeEvidenceDigest:issued.bridgeEvidence.bridgeEvidenceDigest}],authorityRules:[],exclusive:true};
}
function real(){
 const d=dossier(),r=attribution.evaluate(d);assert.equal(r.status,'VERIFIED');
 const e=fixture({values:[r.assertion.value],allowed:[r.assertion.id],predicate:'attributedToProjectIdentity'});
 const a=e.payload.assertions[0];
 Object.assign(a,{id:r.assertion.id,subjectType:'association',subjectId:r.assertion.subjectId,value:r.assertion.value,evidenceIds:[r.assertion.evidenceIds[0]],status:'verified'});
 const v=e.payload.evidence[0];
 Object.assign(v,{id:r.assertion.evidenceIds[0],subjectType:'association',subjectId:a.subjectId,attribute:a.predicate,observedValue:a.value,sourceType:'repository',sourceRef:'repository:P1-P5',sourceDigest:d.bridgeEvidence[0].sourceDigest,versionScope:'2.23.1'});
 Object.assign(e.payload.evidenceRelations[0],{evidenceId:v.id,assertionId:a.id,subjectId:a.subjectId,predicate:a.predicate});
 e.validationContext.eligibleAssertionIds=[a.id];e.validationContext.attributionDossier=d;return refresh(e);
}
function prepare(e){let q=qualify(e);e.payload.conflicts=q.conflicts;refresh(e);q=qualify(e);e.qualificationProof=createProof(e,q);e.resolutionResult=run(e);return e;}
test('LOG-12 repository-issued Log4j rule and V-PY VERIFIED',()=>{
 const issued=issuer.issue(claim),result=attribution.evaluate(dossier());
 assert.equal(issued.status,'APPROVED_BRIDGE_RULE_ISSUED');
 assert.equal(result.validation.VX,'PASS');
 assert.equal(result.validation.VY,'PASS');
 assert.equal(result.validation.VXY,'PASS');
 assert.equal(result.status,'VERIFIED');
});
test('LOG-13 through LOG-17 real Log4j assertion eligible, qualified, complete and accepted',()=>{
 const e=prepare(real()),a=e.payload.assertions[0];
 assert.equal(policy.evaluate(e,a,true),'ELIGIBLE');
 assert.deepEqual(e.qualificationProof.examinedAssertionIds,[a.id]);
 assert.equal(verify(e,e.payload,{id:RULES_ID,version:RULES_VERSION},e.qualificationProof),true);
 assert.equal(e.resolutionResult.engineResult.decisions.length,1);
 assert.equal(acceptDocumentarySnapshot(e).acceptanceStatus,'ACCEPTED');
});
test('LOG-18 and LOG-20 offline end-to-end Log4j replay deterministic',()=>{
 const a=prepare(real()),b=prepare(real());
 assert.deepEqual(a.resolutionResult,b.resolutionResult);
 assert.deepEqual(a.qualificationProof,b.qualificationProof);
 assert.deepEqual(acceptDocumentarySnapshot(a),acceptDocumentarySnapshot(b));
 assert.deepEqual(attribution.evaluate(dossier()),attribution.evaluate(dossier()));
});
test('LOG-19 synthetic conflicting project candidate retained without selection',()=>{
 const d=dossier(),alternative='project:'+'f'.repeat(64),content=JSON.stringify({...claim,projectIdentityId:alternative});
 d.bridgeEvidence.push({id:'negative-conflicting-claim',kind:'explicit-attribution',packageIdentityId:pkg,externalIdentityId:pkg,projectIdentityId:alternative,sourceRef:'negative-fixture',versionScope:'2.23.1',content,sourceDigest:sha(content)});
 const r=attribution.evaluate(d);
 assert.equal(r.status,'CONFLICTED');
 assert.equal(r.conflicts.length,1);
 assert.equal(r.decision.selectedAssertionId,null);
});
test('LOG-18 missing bridge, H2, Y context fail closed',()=>{
 for(const mutate of [d=>d.bridgeEvidence=[],d=>d.projectSnapshot=null,d=>d.bridgeEvidence[0].bridgeEvidenceDigest='0'.repeat(64)]){
  const e=real();mutate(e.validationContext.attributionDossier);refresh(e);
  assert.equal(policy.evaluate(e,e.payload.assertions[0],true),'NOT_ELIGIBLE');
  prepare(e);assert.notEqual(acceptDocumentarySnapshot(e).acceptanceStatus,'ACCEPTED');
 }
});
test('LOG-22 JUnit and Log4j independently replay with distinct evidence and decisions',()=>{
 const a=attribution.evaluate(junitDossier()),b=attribution.evaluate(dossier());
 assert.equal(a.status,'VERIFIED');assert.equal(b.status,'VERIFIED');
 assert.notEqual(a.assertion.id,b.assertion.id);
 assert.notEqual(a.decision.id,b.decision.id);
 assert.notEqual(a.assertion.evidenceIds[0],b.assertion.evidenceIds[0]);
 assert.deepEqual([a.decision.id,b.decision.id].sort(),[b.decision.id,a.decision.id].sort());
});

module.exports={dossier,real,prepare,claim};
