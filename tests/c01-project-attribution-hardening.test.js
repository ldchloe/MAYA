'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const api=require('../js/c01-project-attribution.js'),projects=require('../js/project-identity.js');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const Y='project:'+'a'.repeat(32),P='maven:junit:junit',X='external:junit';
function dossier(){
 const registry=projects.allocateProjectIdentity(projects.createProjectIdentityRegistry(),{projectId:Y,attributionId:'attribution:'+'b'.repeat(32),createdAt:'2025-01-01T00:00:00Z',attributionContext:{source:'independent'},name:'JUnit',url:null});
 const a={id:'archive:1',packageIdentityId:P,externalIdentityId:X,sourceRef:'archived-pom',versionScope:'4.13.2',content:'archived junit POM',sha256:sha('archived junit POM')};
 const b={id:'evidence:bridge',kind:'explicit-attribution',packageIdentityId:P,externalIdentityId:X,projectIdentityId:Y,sourceRef:'archived-independent-record',versionScope:'4.13.2',content:'explicit signed attribution record',sourceDigest:sha('explicit signed attribution record')};
 return {packageIdentityId:P,externalIdentityId:X,projectIdentityId:Y,projectSnapshot:registry,archives:[a],bridgeEvidence:[b]};
}
test('T31 package reference absent: V-P fails',()=>{const d=dossier();d.archives=[];assert.equal(api.evaluate(d).validation.VX,'FAIL');});
test('T32 forged archive digest fails V-P',()=>{const d=dossier();d.archives[0].content+='tamper';assert.equal(api.evaluate(d).validation.VX,'FAIL');});
test('T35 forged bridge digest fails V-PY',()=>{const d=dossier();d.bridgeEvidence[0].content+='tamper';assert.equal(api.evaluate(d).validation.VXY,'FAIL');});
test('T36 valid endpoints without bridge cannot be verified',()=>{const d=dossier();d.bridgeEvidence=[];assert.equal(api.evaluate(d).status,'INDETERMINATE');});
test('T39 bridge evidence and result immutable',()=>{const d=dossier();const r=api.evaluate(d);assert.equal(Object.isFrozen(r),true);assert.equal(Object.isFrozen(r.assertion),true);assert.throws(()=>{r.assertion.value='forged';},TypeError);});
test('T38 incompatible bridge retained as separate assertion',()=>{const d=dossier();d.bridgeEvidence.push({...d.bridgeEvidence[0],id:'evidence:bridge2',projectIdentityId:'project:'+'c'.repeat(32)});const r=api.evaluate(d);assert.equal(r.status,'CONFLICTED');assert.equal(r.assertions.length,2);assert.deepEqual(r.conflicts[0].assertionIds,r.assertions.map(x=>x.id).sort());});
test('T46 duplicate archive IDs rejected, never silently dropped',()=>{const d=dossier();d.archives.push({...d.archives[0]});assert.equal(api.evaluate(d).validation.VX,'FAIL');});
test('T46 duplicate bridge IDs rejected, never silently dropped',()=>{const d=dossier();d.bridgeEvidence.push({...d.bridgeEvidence[0]});assert.equal(api.evaluate(d).validation.VXY,'FAIL');});

test('T35 arbitrary archived text is not explicit bridge evidence',()=>{const d=dossier();assert.equal(api.evaluate(d).validation.VXY,'FAIL');});
test('T35 mismatched structured bridge cannot establish another project',()=>{
 const d=dossier(),b=d.bridgeEvidence[0];
 b.content=JSON.stringify({predicate:'attributedToProjectIdentity',packageIdentityId:P,externalIdentityId:X,projectIdentityId:'project:'+'f'.repeat(32)});
 b.sourceDigest=sha(b.content);
 assert.equal(api.evaluate(d).validation.VXY,'FAIL');
});
