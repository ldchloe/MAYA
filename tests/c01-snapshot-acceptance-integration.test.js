'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {prepared,clone,refresh}=require('./c01-snapshot-acceptance-fixtures.js');
const {acceptDocumentarySnapshot}=require('../js/c01-snapshot-acceptance.js');
const {qualify}=require('../js/c01-documentary-qualification.js');
const {createProof}=require('../js/c01-completeness-proof.js');
const boundary=require('../js/c01-resolution-boundary.js');
test('T46 permutations preserve verdict and acceptance digest',()=>{const e=prepared({values:['alpha','beta','gamma'],allowed:['a1']}),a=acceptDocumentarySnapshot(e),f=clone(e);for(const k of ['assertions','evidence','evidenceRelations','conflicts'])f.payload[k].reverse();f.validationContext.eligibleAssertionIds.reverse();refresh(f);f.qualificationProof=createProof(f,qualify(f));f.resolutionResult=boundary.run(f);const b=acceptDocumentarySnapshot(f);assert.equal(a.acceptanceStatus,b.acceptanceStatus);assert.deepEqual(a.reasonCodes,b.reasonCodes);assert.equal(a.acceptanceDigest,b.acceptanceDigest);});
test('T50 full integration with eligibility, noneligibility, conflict, no-conflict, indeterminate and supersession',()=>{
 const e=prepared({values:['alpha','beta','gamma','pending','gamma'],allowed:['a1','a3','a5']});
 e.payload.assertions[4].supersedesAssertionIds=['a3'];refresh(e);e.qualificationProof=createProof(e,qualify(e));e.resolutionResult=boundary.run(e);
 const r=acceptDocumentarySnapshot(e);assert.equal(r.acceptanceStatus,'ACCEPTED');
 assert.deepEqual(e.qualificationProof.examinedAssertionIds,['a1','a2','a3','a4','a5']);
 assert.ok(e.qualificationProof.examinations.some(x=>x.result==='CONFLICT'));
 assert.deepEqual(e.resolutionResult.transmittedIds,['a1','a5']);
 assert.equal(e.payload.conflicts.length,1);
});
