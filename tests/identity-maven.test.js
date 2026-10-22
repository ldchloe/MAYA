const test=require('node:test');
const assert=require('node:assert/strict');
const {extractMavenPurl}=require('../js/identity-purl.js');
const {createMavenCentralProvider}=require('../js/identity-maven-provider.js');
const {createMemoryBackend,createObservationArchive}=require('../js/identity-archive.js');
const {decide}=require('../js/identity-decision.js');
const {resolveComponent}=require('../js/identity-mvp.js');
const purl='pkg:maven/org.springframework/spring-core@6.1.3';
const identity=extractMavenPurl(purl);
const pom='<project><modelVersion>4.0.0</modelVersion><groupId>org.springframework</groupId><artifactId>spring-core</artifactId><version>6.1.3</version></project>';
const time='2026-10-22T10:00:00.000Z';
function provider(status=200,body=pom){return createMavenCentralProvider({now:()=>time,fetchImpl:async()=>({status,text:async()=>body})});}
test('Maven PURL extracts a coordinate but never a publication',()=>{
 assert.equal(identity.key,'maven:org.springframework:spring-core');
 assert.equal(identity.version,'6.1.3');
 for(const invalid of ['pkg:maven/org.springframework/spring-core','pkg:npm/foo@1','pkg:maven/a/../b@1','pkg:maven/a/b@1?type=jar'])assert.equal(extractMavenPurl(invalid),null);
});
test('Maven provider returns acquisition only',async()=>{
 const acquired=await provider().acquire(identity);
 assert.match(acquired.url,/spring-core-6\.1\.3\.pom$/);
 assert.equal(acquired.status,200);
 assert.equal(acquired.body,pom);
});
test('archive stores and verifies SHA-256 and detects corruption',async()=>{
 const backend=createMemoryBackend(),archive=createObservationArchive(backend);
 const ref=await archive.store(await provider().acquire(identity));
 assert.equal((await archive.load(ref)).body,pom);
 await assert.rejects(()=>archive.load({id:'observation:'+'0'.repeat(64)}),/integrity/);
});
test('Maven success produces Lot A evidence, assertion and decision',async()=>{
 const result=await resolveComponent({component:{purl},componentId:'component:1',provider:provider(),archive:createObservationArchive(createMemoryBackend()),decidedAt:time});
 assert.equal(result.result.status,'Resolved');
 assert.equal(result.evidence.length,1);
 assert.equal(result.assertions.length,1);
 assert.equal(result.decisions.length,1);
 assert.equal(result.decisions[0].selectedAssertionId,result.assertions[0].id);
});
test('Maven 404 is an observed absence, not universal nonexistence',async()=>{
 const result=await resolveComponent({component:{purl},componentId:'component:1',provider:provider(404,''),archive:createObservationArchive(createMemoryBackend()),decidedAt:time});
 assert.equal(result.observation.outcome,'NotFoundObserved');
 assert.equal(result.result.status,'Unknown');
});
test('timeout never becomes NotFound',async()=>{
 const failed=createMavenCentralProvider({now:()=>time,fetchImpl:async()=>{throw Object.assign(new Error('timeout'),{name:'AbortError'});}});
 const result=await resolveComponent({component:{purl},componentId:'component:1',provider:failed,archive:createObservationArchive(createMemoryBackend()),decidedAt:time});
 assert.equal(result.observation.outcome,'Unavailable');
 assert.equal(result.result.status,'Unknown');
});
test('decision independent of observation order and reports same-time conflict',()=>{
 const a={scope:'Version',packageKey:identity.key,version:identity.version,outcome:'Found',archiveId:'one',observedAt:time};
 const b={...a,outcome:'NotFoundObserved',archiveId:'two'};
 const x=decide({identity,observations:[a,b]}),y=decide({identity,observations:[b,a]});
 assert.equal(x.status,'Conflicted');
 assert.equal(x.inputDigest,y.inputDigest);
});
test('invalid or ambiguous POM remains Unknown',async()=>{
 const result=await resolveComponent({component:{purl},componentId:'component:1',provider:provider(200,'<html>ok</html>'),archive:createObservationArchive(createMemoryBackend()),decidedAt:time});
 assert.equal(result.result.status,'Unknown');
});
