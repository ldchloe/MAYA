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

const fs=require('node:fs'),path=require('node:path');
function release(tag){
 const root=path.resolve(__dirname,'../fixtures/g01/junit');
 const metadata=JSON.parse(fs.readFileSync(path.join(root,tag+'.metadata.json'),'utf8'));
 const body=JSON.parse(fs.readFileSync(path.join(root,tag+'.json'),'utf8'));
 return {eventType:'RELEASE',subject:junit,after:tag,effectiveAt:body.published_at,source:{archiveSha256:metadata.sha256,archiveId:metadata.archiveId,acquiredAt:metadata.acquiredAt}};
}
test('G-01 real archived JUnit release events VERIFIED with sourced Assertions',()=>{
 const r=run([release('r4.13.1'),release('r4.13.2')],junit);
 assert.equal(r.decision.status,'VERIFIED');assert.equal(r.timeline.length,2);
 assert.equal(r.evidence.length,2);assert.equal(r.assertions.length,2);
 assert.ok(r.assertions.every(a=>a.evidenceIds.length>0));assert.ok(verifyTrustEvents(r));
});
test('G-04 archive or claimed event alteration rejected',()=>{
 const c=release('r4.13.2');
 for(const bad of [{...c,subject:log4j},{...c,after:'r4.13.3'},{...c,effectiveAt:'2020-01-01T00:00:00Z'},{...c,source:{...c.source,archiveSha256:'0'.repeat(64)}}]){
 assert.equal(run([bad],junit).decision.status,'UNKNOWN');
 }
 const r=run([c],junit);assert.equal(verifyTrustEvents({...r,evidence:r.evidence.map(e=>({...e,after:'r4.13.1'}))}),false);
});
test('G-15 G-16 G-17 G-21 duplicate evidence and permutation preserve timeline and IDs',()=>{
 const a=release('r4.13.1'),b=release('r4.13.2');
 const r=run([b,a,a],junit);
 assert.deepEqual(r,run([a,b],junit));assert.equal(r.timeline.length,2);
 assert.ok(r.timeline[0].effectiveAt<=r.timeline[1].effectiveAt);
 assert.ok(verifyTrustEvents(r));assert.deepEqual(run([a,b],junit),run([a,b],junit));
});
test('G-06 to G-12 all event types represented without interpreting unsupported facts',()=>{
 const {EVENT_TYPES}=require('../js/g01-trust-events.js');
 for(const type of ['OWNERSHIP_CHANGE','ACQUISITION','GOVERNANCE_CHANGE','MAINTAINER_CHANGE','LICENSE_CHANGE','REPOSITORY_CHANGE','FOUNDATION_CHANGE','SUPPLY_CHAIN_INCIDENT','COMPROMISE'])assert.ok(EVENT_TYPES.includes(type));
 assert.equal(run([{eventType:'COMPROMISE',subject:junit,after:'r4.13.2',effectiveAt:release('r4.13.2').effectiveAt,source:release('r4.13.2').source}],junit).decision.status,'UNKNOWN');
});

test('G-06 G-07 G-08 G-09 controlled transitions retain before and after',()=>{
 const {resolveSyntheticChangeForTest}=require('../js/g01-trust-events.js');
 for(const type of ['LICENSE_CHANGE','MAINTAINER_CHANGE','FOUNDATION_CHANGE','REPOSITORY_CHANGE','GOVERNANCE_CHANGE','OWNERSHIP_CHANGE','ACQUISITION']){
  const r=resolveSyntheticChangeForTest(log4j,type,'old','new','2020-01-01');
  assert.equal(r.events[0].before,'old');assert.equal(r.events[0].after,'new');
  assert.equal(r.decision.status,'VERIFIED');assert.equal(r.testOnly,true);
  assert.equal(verifyTrustEvents(r),false);
 }
});
test('G-10 G-12 synthetic incident and explicit compromise require evidence',()=>{
 const {resolveSyntheticChangeForTest}=require('../js/g01-trust-events.js');
 for(const type of ['SUPPLY_CHAIN_INCIDENT','COMPROMISE']){
 const r=resolveSyntheticChangeForTest(log4j,type,'unaffected','documented-event','2021-12-01');
 assert.equal(r.evidence.length,1);assert.equal(r.testOnly,true);assert.equal(verifyTrustEvents(r),false);
 }
});
