'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {verifyTaggedSourceChain}=require('../js/c01-official-bridge-sources.js');
const root=path.join(__dirname,'../fixtures/c01');
const load=()=>({provenance:JSON.parse(fs.readFileSync(path.join(root,'junit4-r4.13.2-tag-provenance.json'),'utf8')),pom:fs.readFileSync(path.join(root,'junit4-r4.13.2-upstream-pom.xml')),readme:fs.readFileSync(path.join(root,'junit4-r4.13.2-project-readme.md'))});
test('BR-03/07/08 official provenance and exact coordinates, not names or URL alone',()=>{const x=load();assert.equal(verifyTaggedSourceChain(x).status,'TAGGED_POM_VERIFIED_NOT_BRIDGE');assert.equal(verifyTaggedSourceChain({...x,pom:Buffer.from('<project><name>JUnit</name></project>')}).status,'REJECTED');});
test('BR-09 wrong version rejected',()=>{const x=load();assert.equal(verifyTaggedSourceChain({...x,expectedCoordinate:'junit:junit:4.13.1'}).status,'REJECTED');});
test('BR-12 altered tagged POM rejected',()=>{const x=load();assert.equal(verifyTaggedSourceChain({...x,pom:Buffer.concat([x.pom,Buffer.from(' ')])}).status,'REJECTED');});
test('BR-19 missing official publication evidence never issues bridge',()=>{const x=load();assert.equal(verifyTaggedSourceChain(x).bridgeRule,null);});
test('BR-20 offline tagged source replay deterministic',()=>{assert.deepEqual(verifyTaggedSourceChain(load()),verifyTaggedSourceChain(load()));});

test('BR-02/03 P1 or P2 absent: tagged provenance cannot be promoted to complete bridge',()=>{const x=load();assert.equal(verifyTaggedSourceChain(x).bridgeRule,null);assert.notEqual(verifyTaggedSourceChain(x).status,'BRIDGE_EVIDENCE_COMPLETE');});
test('BR-10/11 caller-declared Y or H1 snapshot cannot promote tagged source to approved bridge',()=>{const x=load();for(const injected of [{projectIdentityId:'project:'+'f'.repeat(64)},{snapshotDigest:'0'.repeat(64)},{approved:true},{bridgeRule:{status:'APPROVED'}}]){const result=verifyTaggedSourceChain({...x,...injected});assert.equal(result.bridgeRule,null);}});
test('BR-13 altered Maven POM is not accepted as evidence of a published-POM match',()=>{const x=load();assert.equal(verifyTaggedSourceChain({...x,mavenPom:Buffer.from('altered')}).bridgeRule,null);});
