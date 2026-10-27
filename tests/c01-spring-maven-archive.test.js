'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {interpretMaven}=require('../js/identity-mvp.js');
const {decide}=require('../js/identity-decision.js');
const base=path.join(__dirname,'../fixtures/c01/spring/maven-central');
const read=name=>fs.readFileSync(path.join(base,name),'utf8');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const identity={ecosystem:'maven',namespace:'org.springframework',name:'spring-core',version:'6.1.3',key:'maven:org.springframework:spring-core'};
function replay(){
 const saved=JSON.parse(read('spring-core-6.1.3.observation.json'));
 const pom=read('spring-core-6.1.3.pom');
 assert.equal(saved.acquisition.providerId,'maven-central');
 assert.equal(saved.acquisition.status,200);
 assert.equal(saved.acquisition.url,'https://repo.maven.apache.org/maven2/org/springframework/spring-core/6.1.3/spring-core-6.1.3.pom');
 assert.equal(saved.acquisition.body,pom);
 assert.equal(sha(pom),'e218e29adafcc0512596aa2e4458e8394521d6131491fce63ac7ecc3ed1bbdab');
 assert.equal(saved.bodySha256,sha(pom));
 assert.equal(saved.reference.contentHash,sha(pom));
 assert.equal(saved.reference.id,'observation:'+saved.reference.sha256);
 const observation=interpretMaven(saved.acquisition,identity,saved.reference.id);
 const decision=decide({identity,observations:[observation]});
 return {observation,decision};
}
test('SPR-01 real archived Maven Central 6.1.3 observation verifies offline',()=>{
 const result=replay();
 assert.equal(result.observation.outcome,'Found');
 assert.equal(result.decision.status,'Resolved');
});
test('SPR-20 offline Maven replay is deterministic without fetch',()=>{
 assert.deepEqual(replay(),replay());
});
test('SPR-05 wrong version cannot reuse archived Maven observation',()=>{
 const saved=JSON.parse(read('spring-core-6.1.3.observation.json'));
 assert.throws(()=>interpretMaven(saved.acquisition,{...identity,version:'6.1.4'},saved.reference.id),/coordinate mismatch/);
});
test('SPR-06 wrong module cannot reuse archived Maven observation',()=>{
 const saved=JSON.parse(read('spring-core-6.1.3.observation.json'));
 assert.throws(()=>interpretMaven(saved.acquisition,{...identity,name:'spring-beans',key:'maven:org.springframework:spring-beans'},saved.reference.id),/coordinate mismatch/);
});
