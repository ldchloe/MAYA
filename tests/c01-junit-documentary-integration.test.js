'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {dossier}=require('./c01-junit-real-attribution.test.js');
const attribution=require('../js/c01-project-attribution.js'),policy=require('../js/c01-eligibility-policy.js');
const {fixture,refresh}=require('./c01-documentary-fixtures.js');
const {qualify,RULES_ID,RULES_VERSION}=require('../js/c01-documentary-qualification.js');
const {createProof}=require('../js/c01-completeness-proof.js'),{verify}=require('../js/c01-completeness-verifier.js');
const {run}=require('../js/c01-resolution-boundary.js'),{acceptDocumentarySnapshot}=require('../js/c01-snapshot-acceptance.js');
function real(){const d=dossier(),r=attribution.evaluate(d);assert.equal(r.status,'VERIFIED');const e=fixture({values:[r.assertion.value],allowed:[r.assertion.id],predicate:'attributedToProjectIdentity'});const a=e.payload.assertions[0];Object.assign(a,{id:r.assertion.id,subjectType:'association',subjectId:r.assertion.subjectId,value:r.assertion.value,evidenceIds:[r.assertion.evidenceIds[0]],status:'verified'});const v=e.payload.evidence[0];Object.assign(v,{id:r.assertion.evidenceIds[0],subjectType:'association',subjectId:a.subjectId,attribute:a.predicate,observedValue:a.value,sourceType:'repository',sourceRef:'repository:P1-P5',sourceDigest:d.bridgeEvidence[0].sourceDigest,versionScope:'4.13.2'});Object.assign(e.payload.evidenceRelations[0],{evidenceId:v.id,assertionId:a.id,subjectId:a.subjectId,predicate:a.predicate});e.validationContext.eligibleAssertionIds=[a.id];e.validationContext.attributionDossier=d;return refresh(e);}
function prepare(e){let q=qualify(e);e.payload.conflicts=q.conflicts;refresh(e);q=qualify(e);e.qualificationProof=createProof(e,q);e.resolutionResult=run(e);return e;}
test('INT-E01 real verified repository bridge is eligible in documentary policy',()=>{const e=real();assert.equal(policy.evaluate(e,e.payload.assertions[0],true),'ELIGIBLE');});
for(const [id,mutate] of [['INT-E02',e=>e.validationContext.attributionDossier.bridgeEvidence=[]],['INT-E03',e=>e.validationContext.attributionDossier.projectSnapshot=null],['INT-E04',e=>e.validationContext.attributionDossier.bridgeEvidence[0].bridgeEvidenceDigest='0'.repeat(64)],['INT-E05',e=>e.payload.evidence[0].sourceDigest='0'.repeat(64)],['INT-E06',e=>e.payload.assertions[0].value='project:wrong'],['INT-E07',e=>e.validationContext.attributionDossier.packageIdentityId='maven:junit:junit:4.13.1'],['INT-E08',e=>e.validationContext.attributionDossier.authorityRules=[{id:'forged'}]],['INT-E09',e=>e.payload.assertions[0].id='unproved']])test(id+' rejects unproved attribution',()=>{const e=real();mutate(e);refresh(e);assert.equal(policy.evaluate(e,e.payload.assertions[0],true),'NOT_ELIGIBLE');});
test('INT-E10 historic mapsToProject eligibility unchanged',()=>{const e=fixture();assert.equal(policy.evaluate(e,e.payload.assertions[0],true),'ELIGIBLE');});
test('INT-Q01 INT-C01 INT-A01 real JUnit qualification completeness acceptance',()=>{const e=prepare(real());assert.deepEqual(e.qualificationProof.examinedAssertionIds,[e.payload.assertions[0].id]);assert.equal(verify(e,e.payload,{id:RULES_ID,version:RULES_VERSION},e.qualificationProof),true);assert.equal(e.resolutionResult.transmittedIds.length,1);assert.equal(e.resolutionResult.engineResult.decisions.length,1);assert.equal(acceptDocumentarySnapshot(e).acceptanceStatus,'ACCEPTED');});
test('INT-Q06 INT-A01 offline deterministic documentary replay',()=>{const a=prepare(real()),b=prepare(real());assert.deepEqual(a.resolutionResult,b.resolutionResult);assert.deepEqual(a.qualificationProof,b.qualificationProof);assert.deepEqual(acceptDocumentarySnapshot(a),acceptDocumentarySnapshot(b));});
test('INT-C02 INT-C04 INT-C05 tampered completeness rejected',()=>{for(const field of ['examinations','resultDigest','corpusDigest']){const e=prepare(real());e.qualificationProof={...e.qualificationProof,[field]:field==='examinations'?[]:'0'.repeat(64)};assert.equal(acceptDocumentarySnapshot(e).acceptanceStatus,'REJECTED');}});
test('INT-A04 INT-A05 INT-A06 injected or missing decisions rejected',()=>{for(const decisions of [[],[{id:'forged'}],Array(2).fill({id:'forged'})]){const e=prepare(real());e.resolutionResult={...e.resolutionResult,engineResult:{...e.resolutionResult.engineResult,decisions}};assert.equal(acceptDocumentarySnapshot(e).acceptanceStatus,'REJECTED');}});
module.exports={real,prepare};

test('INT-A02 INT-A07 missing or forged V-PY authority cannot be ACCEPTED',()=>{for(const mutate of [e=>e.validationContext.attributionDossier.bridgeEvidence=[],e=>e.validationContext.attributionDossier.bridgeEvidence[0].bridgeEvidenceDigest='0'.repeat(64)]){const e=real();mutate(e);refresh(e);prepare(e);assert.notEqual(acceptDocumentarySnapshot(e).acceptanceStatus,'ACCEPTED');}});
test('INT-A08 missing required documentary conflict rejected',()=>{const e=prepare(real());e.payload.conflicts=[{id:'forged-conflict',subjectId:e.payload.assertions[0].subjectId,predicate:e.payload.assertions[0].predicate,assertionIds:[e.payload.assertions[0].id],conflictType:'contradictory-evidence',status:'conflicted'}];refresh(e);assert.notEqual(acceptDocumentarySnapshot(e).acceptanceStatus,'ACCEPTED');});

test('INT-Q02 missing real assertion cannot preserve positive decision',()=>{const e=prepare(real());e.payload.assertions=[];refresh(e);assert.notEqual(acceptDocumentarySnapshot(e).acceptanceStatus,'ACCEPTED');});
test('INT-Q03 missing bridge Evidence rejects documentary completeness',()=>{const e=prepare(real());e.payload.evidence=[];refresh(e);assert.notEqual(acceptDocumentarySnapshot(e).acceptanceStatus,'ACCEPTED');});
test('INT-C03 omitted examination of admitted assertion is invalid',()=>{const e=prepare(real());e.qualificationProof={...e.qualificationProof,examinedAssertionIds:[]};assert.equal(acceptDocumentarySnapshot(e).acceptanceStatus,'REJECTED');});
test('INT-A03 altered completeness proof is not accepted',()=>{const e=prepare(real());e.qualificationProof={...e.qualificationProof,resultDigest:'0'.repeat(64)};assert.equal(acceptDocumentarySnapshot(e).acceptanceStatus,'REJECTED');});

function conflicting(){
 const e=real(),a=e.payload.assertions[0],v=e.payload.evidence[0],r=e.payload.evidenceRelations[0];
 const other={...a,id:'synthetic:assertion:conflicting-project',value:'project:synthetic-test-only',evidenceIds:['synthetic:evidence:conflicting-project'],status:'candidate'};
 const ev={...v,id:other.evidenceIds[0],sourceType:'fixture',sourceRef:'synthetic-test-fixture-only',sourceDigest:null,observedValue:other.value};
 const rel={...r,id:'synthetic:relation:conflicting-project',assertionId:other.id,evidenceId:ev.id};
 e.payload.assertions.push(other);e.payload.evidence.push(ev);e.payload.evidenceRelations.push(rel);refresh(e);return e;
}
test('F1-01 F1-06 conflicting synthetic candidate retained, qualified, noneligible',()=>{
 const e=prepare(conflicting()),q=qualify(e);
 assert.equal(e.payload.assertions.length,2);assert.equal(e.payload.evidence.length,2);
 assert.equal(q.examinedAssertionIds.length,2);assert.equal(q.conflicts.length,1);
 assert.equal(e.payload.conflicts.length,1);
 assert.equal(policy.evaluate(e,e.payload.assertions[1],true),'NOT_ELIGIBLE');
 assert.equal(verify(e,e.payload,{id:RULES_ID,version:RULES_VERSION},e.qualificationProof),true);
 assert.deepEqual(e.resolutionResult.eligibleIds,[e.payload.assertions[0].id]);
});
test('F1-02 F1-03 F1-08 conflicting permutations and offline replay identical',()=>{
 const a=prepare(conflicting()),b=conflicting();
 b.payload.assertions.reverse();b.payload.evidence.reverse();b.payload.evidenceRelations.reverse();refresh(b);prepare(b);
 assert.deepEqual(a.qualificationProof,b.qualificationProof);
 assert.deepEqual(a.resolutionResult,b.resolutionResult);
 assert.deepEqual(acceptDocumentarySnapshot(a),acceptDocumentarySnapshot(b));
});
test('F1-04 omitted documentary conflict fails completeness',()=>{
 const e=prepare(conflicting());e.payload.conflicts=[];refresh(e);
 assert.notEqual(acceptDocumentarySnapshot(e).acceptanceStatus,'ACCEPTED');
});
test('F1-05 caller selection of synthetic candidate rejected',()=>{
 const e=prepare(conflicting());
 const forged={...e.resolutionResult,engineResult:{...e.resolutionResult.engineResult,decisions:[{id:'synthetic:decision',selectedAssertionId:'synthetic:assertion:conflicting-project'}]}};
 e.resolutionResult=forged;
 assert.equal(acceptDocumentarySnapshot(e).acceptanceStatus,'REJECTED');
});
test('F1-07 unrelated predicate does not infer documentary conflict',()=>{
 const e=conflicting(),a=e.payload.assertions[1],v=e.payload.evidence[1],r=e.payload.evidenceRelations[1];
 a.predicate='unrelatedSyntheticRelationship';v.attribute=a.predicate;r.predicate=a.predicate;refresh(e);
 assert.equal(qualify(e).conflicts.length,0);
});
test('F2 legacy mapsToProject remains legacy only',()=>{
 const e=fixture();assert.equal(policy.evaluate(e,e.payload.assertions[0],true),'ELIGIBLE');
 assert.equal(e.payload.assertions.some(a=>a.predicate==='attributedToProjectIdentity'),false);
});
test('F2 real assertion without any dossier cannot be eligible or accepted',()=>{
 const e=real();delete e.validationContext.attributionDossier;refresh(e);
 assert.equal(policy.evaluate(e,e.payload.assertions[0],true),'NOT_ELIGIBLE');
 prepare(e);assert.notEqual(acceptDocumentarySnapshot(e).acceptanceStatus,'ACCEPTED');
 assert.equal(e.resolutionResult.engineResult.decisions.some(d=>d.selectedAssertionId===e.payload.assertions[0].id),false);
});
for(const [name,mutate] of [
 ['F2-01',d=>{d.archives=[];d.bridgeEvidence=[]}],
 ['F2-02',d=>{d.approvedAuthorityResolution=null;d.bridgeEvidence=[]}],
 ['F2-03',d=>{d.bridgeEvidence=[]}],
 ['F2-04',d=>{d.bridgeEvidence[0].bridgeEvidenceDigest='0'.repeat(64)}],
 ['F2-05',d=>{d.approvedBridgeRule={status:'APPROVED',ruleDigest:'0'.repeat(64)};d.bridgeEvidence=[]}],
 ['F2-06',d=>{d.projectSnapshot=null}],
 ['F2-07',d=>{d.manifestDigest=null;d.bridgeEvidence=[]}],
 ['F2-08',d=>{d.bridgeEvidence=[];d.verificationContext={}}],
 ['F2-09',d=>{d.authorityRules=[{status:'APPROVED'}];d.bridgeEvidence=[]}],
 ['F2-10',d=>{d.bridgeEvidence=[];d.name='JUnit';d.url='https://junit.org'}]
])test(name+' partial or forged context fails closed',()=>{
 const e=real();mutate(e.validationContext.attributionDossier);refresh(e);
 assert.equal(policy.evaluate(e,e.payload.assertions[0],true),'NOT_ELIGIBLE');
 prepare(e);assert.notEqual(acceptDocumentarySnapshot(e).acceptanceStatus,'ACCEPTED');
});

test('F1-01 integrated acceptance retains conflict and selects only repository-verified assertion',()=>{
 const e=prepare(conflicting()),result=acceptDocumentarySnapshot(e);
 assert.equal(result.acceptanceStatus,'ACCEPTED');
 assert.equal(e.payload.conflicts.length,1);
 assert.equal(e.qualificationProof.conflictIds.length,1);
 assert.deepEqual(e.resolutionResult.transmittedIds,[e.payload.assertions[0].id]);
 assert.equal(e.resolutionResult.engineResult.decisions.some(d=>d.selectedAssertionId==='synthetic:assertion:conflicting-project'),false);
});
