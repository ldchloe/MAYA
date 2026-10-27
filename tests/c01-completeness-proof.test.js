'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {fixture,refresh,clone}=require('./c01-documentary-fixtures.js');
const {qualify,RULES_ID,RULES_VERSION}=require('../js/c01-documentary-qualification.js');
const {createProof}=require('../js/c01-completeness-proof.js');
const {verify}=require('../js/c01-completeness-verifier.js');
const rules={id:RULES_ID,version:RULES_VERSION};
function valid(e){const q=qualify(e);e.payload.conflicts=clone(q.conflicts);refresh(e);return createProof(e,qualify(e));}
function reject(e,p){assert.throws(()=>verify(e,e.payload,rules,p),/COMPLETENESS_REJECTED/);}
test('T18 missing admitted assertion coverage',()=>{const e=fixture({values:['alpha','gamma']}),p=valid(e);p.examinedAssertionIds.pop();reject(e,p);});
test('T19 missing required comparison class',()=>{const e=fixture({values:['alpha','gamma']}),p=valid(e);p.comparisonClasses.pop();reject(e,p);});
test('T20 missing required documentary conflict',()=>{const e=fixture({values:['alpha','beta']}),p=valid(e);e.payload.conflicts=[];refresh(e);reject(e,p);});
test('T21 artificial conflict not justified by fixture rule',()=>{const e=fixture({values:['alpha','gamma']}),p=valid(e);e.payload.conflicts=[{id:'artificial',subjectId:'ce1',predicate:'mapsToProject',assertionIds:['a1','a2'],conflictType:'contradictory-values',status:'conflicted',detectedAt:'2026-01-01T00:00:00Z'}];refresh(e);reject(e,p);});
test('T25 corpus digest mismatch',()=>{const e=fixture(),p=valid(e);p.corpusDigest='bad';reject(e,p);});
test('T26 proof result digest mismatch',()=>{const e=fixture(),p=valid(e);p.resultDigest='bad';reject(e,p);});
test('T27 duplicate examination',()=>{const e=fixture(),p=valid(e);p.examinations.push(clone(p.examinations[0]));reject(e,p);});
test('unknown rules and unauthorized exclusions are rejected',()=>{const e=fixture(),p=valid(e);assert.throws(()=>verify(e,e.payload,{id:'other',version:RULES_VERSION},p),/COMPLETENESS_REJECTED/);p.exclusions=['a1'];reject(e,p);});
test('missing or duplicate conflict reference rejected',()=>{const e=fixture({values:['alpha','beta']}),p=valid(e);p.conflictIds=[];reject(e,p);});
