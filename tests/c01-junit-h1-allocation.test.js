'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const P=require('../js/project-identity.js');
const f=path.join(__dirname,'../fixtures/c01/junit4-project-identity.snapshot.json');
test('H1-01 approved independent JUnit allocation has valid opaque IDs and source-only context',()=>{
 const s=JSON.parse(fs.readFileSync(f,'utf8'));assert.equal(P.validateProjectIdentitySnapshot(s),true);
 assert.equal(s.projects.length,1);assert.equal(s.links.length,0);
 const y=s.projects[0];assert.match(y.id,/^project:[a-f0-9]{32,64}$/);assert.match(y.attributionId,/^attribution:[a-f0-9]{32,64}$/);
 assert.notEqual(y.id.slice(8),y.attributionId.slice(12));
 assert.equal(y.name,'JUnit 4');assert.equal(y.attributionContext.humanDecision,'H1 APPROVED');
 assert.equal(y.attributionContext.projectSource,'fixtures/c01/junit4-r4.13.2-project-readme.md');
 assert.equal(y.attributionContext.scope,'independent-project-identity-only');
});
test('H1-02 Maven candidate alone or bridge candidate is not an approved independent project attribution',()=>{
 const s=JSON.parse(fs.readFileSync(f,'utf8'));const c=s.projects[0].attributionContext;
 assert.equal(JSON.stringify(c).includes('junit:junit'),false);
 assert.equal(JSON.stringify(c).includes('attributedToProjectIdentity'),false);
 assert.equal(JSON.stringify(c).includes('bridgeEvidence'),false);
 assert.equal(s.links.length,0);
});
test('H1-03 offline project snapshot replay is byte-canonical and deterministic',()=>{
 const raw=fs.readFileSync(f,'utf8').trim();const s=P.importProjectIdentitySnapshot(raw);
 assert.equal(P.validateProjectIdentitySnapshot(s),true);
 assert.equal(P.exportProjectIdentitySnapshot(s),raw);
 assert.equal(P.importProjectIdentitySnapshot(raw).snapshotDigest,s.snapshotDigest);
 const corrupted=JSON.parse(raw);corrupted.projects[0].name='changed';
 assert.throws(()=>P.validateProjectIdentitySnapshot(corrupted),/integrity/);
});
