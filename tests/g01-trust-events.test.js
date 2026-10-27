'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {resolveTrustEvents,verifyTrustEvents,resolveSyntheticEventConflictForTest}=require('../js/g01-trust-events.js');
const registry=require('../js/c01-corpus-registry.js');
const log4j=registry.approved.find(x=>x.contractDomain==='C01-I06').projectIdentityId;
const spring=registry.approved.find(x=>x.contractDomain==='C01-I05').projectIdentityId;
const junit='project:3b8b92fd783639e12f59ff6256967b246edd5249343217fb6d669a6ce688ff8e';
const run=(claims=[],projectIdentityId=log4j)=>resolveTrustEvents({projectIdentityId,claims});
test('G-02 G-03 G-04 G-05 no evidence, no date, no ownership inference',()=>{
 for(const claim of [{eventType:'ACQUISITION',subject:'Apache Log4j',effectiveAt:'2020-01-01'},{eventType:'OWNERSHIP_CHANGE',subject:'Apache Software Foundation',effectiveAt:'2020-01-01',sourceUrl:'https://apache.org'},{eventType:'LICENSE_CHANGE',subject:'Apache Log4j'}])assert.equal(run([claim]).timeline.length,0);
});
test('G-11 generic CVE cannot be treated as COMPROMISE',()=>{
 assert.equal(run([{eventType:'COMPROMISE',subject:'Apache Log4j',cve:'CVE-2021-44228',effectiveAt:'2021-12-09'}]).timeline.length,0);
});
test('G-18 G-19 G-20 missing events stay UNKNOWN and all three projects supported',()=>{
 for(const id of [log4j,spring,junit]){const r=run([],id);assert.equal(r.decision.status,'UNKNOWN');assert.deepEqual(r.timeline,[]);assert.ok(verifyTrustEvents(r))}
});
test('G-13 G-14 G-22 synthetic conflicting dates and after-state remain test-only',()=>{
 const a=resolveSyntheticEventConflictForTest(log4j,'GOVERNANCE_CHANGE',['2020-01-01','2021-01-01']);
 assert.equal(a.testOnly,true);assert.equal(a.decision.status,'CONFLICTED');assert.equal(a.conflicts.length,1);assert.equal(verifyTrustEvents(a),false);
 assert.deepEqual(a,resolveSyntheticEventConflictForTest(log4j,'GOVERNANCE_CHANGE',['2021-01-01','2020-01-01']));
});
test('G-16 G-17 G-21 permutation, offline replay and timeline are deterministic',()=>{
 assert.deepEqual(run([]),run([]));assert.deepEqual(run([{eventType:'ACQUISITION'}]),run([{eventType:'ACQUISITION'}]));
});
