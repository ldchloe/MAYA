'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {fixture,refresh,clone}=require('./c01-documentary-fixtures.js');
const {qualify,RULES_ID,RULES_VERSION}=require('../js/c01-documentary-qualification.js');
const {createProof}=require('../js/c01-completeness-proof.js');
const {verify}=require('../js/c01-completeness-verifier.js');
function prepare(e){const q=qualify(e);e.payload.conflicts=clone(q.conflicts);refresh(e);const proof=createProof(e,qualify(e));return {q,proof};}
test('T16 complete qualification without conflicts',()=>{const e=fixture({values:['alpha','gamma'],allowed:[]}),{proof}=prepare(e);assert.equal(proof.examinations.length,1);assert.equal(proof.examinations[0].result,'NO_CONFLICT');assert.deepEqual(proof.conflictIds,[]);assert.equal(verify(e,e.payload,{id:RULES_ID,version:RULES_VERSION},proof),true);});
test('T17 explicit incompatible fixture values produce conflict',()=>{const e=fixture({values:['alpha','beta'],allowed:[]}),{proof}=prepare(e);assert.equal(proof.examinations[0].result,'CONFLICT');assert.equal(proof.conflictIds.length,1);assert.equal(e.payload.conflicts.length,1);assert.equal(verify(e,e.payload,{id:RULES_ID,version:RULES_VERSION},proof),true);});
test('T22 noneligible assertions remain in documentary comparison',()=>{const e=fixture({values:['alpha','beta'],allowed:['a1']}),{proof}=prepare(e);assert.deepEqual(proof.examinedAssertionIds,['a1','a2']);assert.deepEqual(proof.comparisonClasses[0].assertionIds,['a1','a2']);assert.equal(verify(e,e.payload,{id:RULES_ID,version:RULES_VERSION},proof),true);});
test('T23 indeterminate examination is recorded, not omitted',()=>{const e=fixture({values:['alpha','pending'],allowed:[]}),{proof}=prepare(e);assert.equal(proof.examinations[0].result,'INDETERMINATE');assert.deepEqual(proof.conflictIds,[]);assert.equal(verify(e,e.payload,{id:RULES_ID,version:RULES_VERSION},proof),true);});
test('T24 permutations preserve classes, examinations and digests',()=>{const e=fixture({values:['alpha','beta','gamma'],allowed:[]}),a=prepare(e).proof;const f=clone(e);for(const k of ['assertions','evidence','evidenceRelations'])f.payload[k].reverse();refresh(f);const b=createProof(f,qualify(f));assert.deepEqual(a,b);assert.equal(verify(f,f.payload,{id:RULES_ID,version:RULES_VERSION},b),true);});
module.exports={prepare};
