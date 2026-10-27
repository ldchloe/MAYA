'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {resolveGeographicFacts,verifyGeographicFacts,resolveSyntheticGeographicConflictForTest}=require('../js/f01-geographic-facts.js');
const registry=require('../js/c01-corpus-registry.js');
const log4j=registry.approved.find(x=>x.contractDomain==='C01-I06').projectIdentityId;
const spring=registry.approved.find(x=>x.contractDomain==='C01-I05').projectIdentityId;
const junit='project:3b8b92fd783639e12f59ff6256967b246edd5249343217fb6d669a6ce688ff8e';
const run=(claims=[],projectIdentityId=log4j)=>resolveGeographicFacts({projectIdentityId,claims});
test('F-07 F-20 three existing projects are UNKNOWN without geographic evidence',()=>{
 for(const id of [log4j,spring,junit]){const r=run([],id);assert.equal(r.decisions.LEGAL_JURISDICTION.status,'UNKNOWN');assert.ok(verifyGeographicFacts(r))}
});
test('F-03 F-04 F-05 F-06 name, namespace, GitHub, TLD never imply country',()=>{
 for(const source of [null,{sourceUrl:'https://github.com/apache'},{sourceUrl:'https://apache.us'},{namespace:'org.apache'}]){
 const r=run([{subject:'Apache Software Foundation',relationship:'LEGAL_JURISDICTION',countryCode:'US',source}]);
 assert.equal(r.decisions.LEGAL_JURISDICTION.status,'UNKNOWN');
 }
});
test('F-14 F-15 distinct geographic semantics',()=>{
 const r=run([]);assert.notEqual(r.decisions.LEGAL_JURISDICTION.id,r.decisions.MAINTAINER_LOCATION.id);
 assert.notEqual(r.decisions.LEGAL_JURISDICTION.id,r.decisions.HOSTING_LOCATION.id);
});
test('F-16 F-17 deterministic permutation and offline replay',()=>{
 assert.deepEqual(run([]),run([]));assert.deepEqual(run([{countryCode:'US'}]),run([{countryCode:'US'}]));
});
test('F-09 controlled conflict is synthetic only',()=>{
 const r=resolveSyntheticGeographicConflictForTest(log4j,'LEGAL_JURISDICTION',['US','DE']);
 assert.equal(r.testOnly,true);assert.equal(r.conflicts.length,1);
 assert.equal(r.decisions.LEGAL_JURISDICTION.status,'CONFLICTED');
 assert.equal(verifyGeographicFacts(r),false);
 assert.deepEqual(r,resolveSyntheticGeographicConflictForTest(log4j,'LEGAL_JURISDICTION',['DE','US']));
});
