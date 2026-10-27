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

const fs=require('node:fs'),path=require('node:path');
const metadata=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../fixtures/f01/asf/corporation.metadata.json'),'utf8'));
const positive={subject:'Apache Software Foundation',relationship:'LEGAL_JURISDICTION',countryCode:'US',countryObserved:'United States',jurisdictionSubdivision:'Delaware',source:{archivePath:'fixtures/f01/asf/corporation.html',sourceUrl:metadata.finalUrl,selector:'The ASF is a Delaware membership corporation',acquiredAt:metadata.acquiredAt,archiveSha256:metadata.sha256}};
test('F-P01 archived official ASF Delaware / United States is VERIFIED',()=>{
 const r=run([positive]);
 assert.equal(r.decisions.LEGAL_JURISDICTION.status,'VERIFIED');
 assert.equal(r.decisions.LEGAL_JURISDICTION.jurisdictionSubdivision,'Delaware');
 assert.equal(r.countryRelationships[0].countryCode,'US');
 assert.equal(r.evidence.length,1);assert.equal(r.assertions.length,1);
 assert.equal(r.assertions[0].evidenceIds[0],r.evidence[0].id);
 assert.ok(verifyGeographicFacts(r));
});
test('F-P02 P03 P04 archive metadata, subject and country tampering rejected',()=>{
 for(const c of [{...positive,subject:'Apache Log4j'},{...positive,countryCode:'DE'},{...positive,source:{...positive.source,archiveSha256:'0'.repeat(64)}},{...positive,source:{...positive.source,acquiredAt:'2020-01-01T00:00:00Z'}}]){
 assert.equal(run([c]).decisions.LEGAL_JURISDICTION.status,'UNKNOWN');
 }
 const r=run([positive]);assert.equal(verifyGeographicFacts({...r,evidence:r.evidence.map(e=>({...e,countryCode:'DE'}))}),false);
});
test('F-N01 N02 N03 N04 no cross-dimension propagation',()=>{
 const r=run([positive]);
 for(const relationship of ['REGISTERED_LOCATION','MAINTAINER_LOCATION','HOSTING_LOCATION','DEVELOPMENT_LOCATION','FOUNDATION_LOCATION'])assert.equal(r.decisions[relationship].status,'UNKNOWN');
 assert.equal(r.conflicts.length,0);
});
test('F-T01 O01 R01 scope, permutation and offline replay',()=>{
 const timed={...positive,source:{...positive.source,validFrom:'1999-03-25',validTo:null}};
 const a=run([positive,timed]),b=run([timed,positive]);
 assert.deepEqual(a,b);assert.ok(verifyGeographicFacts(a));
 assert.equal(a.evidence.find(e=>e.validFrom==='1999-03-25').validFrom,'1999-03-25');
 assert.deepEqual(run([positive]),run([positive]));
});
test('F-20 three projects with only explicitly evidenced ASF jurisdiction',()=>{
 for(const id of [junit,spring])assert.equal(run([positive],id).decisions.LEGAL_JURISDICTION.status,'UNKNOWN');
 assert.equal(run([positive],log4j).decisions.LEGAL_JURISDICTION.status,'VERIFIED');
});
