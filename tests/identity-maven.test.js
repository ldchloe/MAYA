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
 assert.equal(result.observation.outcome,'Timeout');
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

const {resolveArchived,interpretMaven}=require('../js/identity-mvp.js');
const canonical=require('../js/enrichment-canonical.js');
const metadata='<metadata><groupId>org.springframework</groupId><artifactId>spring-core</artifactId><versioning><versions><version>6.1.3</version></versions></versioning></metadata>';
async function runWith(fetchImpl,scope='Version'){
 const p=createMavenCentralProvider({now:()=>time,fetchImpl});
 const archive=createObservationArchive(createMemoryBackend());
 const acquisition=await p.acquire(identity,{scope});
 const ref=await archive.store(acquisition);
 return {acquisition,ref,archive,observation:interpretMaven(await archive.load(ref),identity,ref.id)};
}
test('package found and version found are separate scopes',async()=>{
 const x=await runWith(async()=>({status:200,text:async()=>metadata}),'Package');
 assert.equal(x.observation.scope,'Package');assert.equal(x.observation.outcome,'Found');
 assert.equal(decide({identity,observations:[x.observation]}).status,'Unknown');
 const y=await runWith(async()=>({status:200,text:async()=>pom}));
 assert.equal(y.observation.outcome,'Found');
 assert.equal(decide({identity,observations:[x.observation,y.observation]}).status,'Resolved');
});
test('package absent and version absent remain scoped negative observations',async()=>{
 const x=await runWith(async()=>({status:404,text:async()=>''}),'Package');
 const y=await runWith(async()=>({status:404,text:async()=>''}));
 assert.equal(x.observation.outcome,'NotFoundObserved');assert.equal(y.observation.outcome,'NotFoundObserved');
 assert.equal(decide({identity,observations:[x.observation]}).reason,'PACKAGE_NOT_FOUND_OBSERVED');
 assert.equal(decide({identity,observations:[y.observation]}).reason,'VERSION_NOT_FOUND_OBSERVED');
});
test('version absent with package found remains Unknown',async()=>{
 const x=await runWith(async()=>({status:200,text:async()=>metadata}),'Package');
 const y=await runWith(async()=>({status:404,text:async()=>''}));
 assert.equal(decide({identity,observations:[x.observation,y.observation]}).status,'Unknown');
});
test('network timeout rate limit authentication and unavailable are not absences',async()=>{
 const cases=[
  [async()=>{throw Object.assign(new Error('timeout'),{name:'AbortError'});},'Timeout'],
  [async()=>{throw Error('network');},'NetworkError'],
  [async()=>({status:429}),'RateLimited'],
  [async()=>({status:401}),'AuthenticationError'],
  [async()=>({status:503}),'ProviderUnavailable']
 ];
 for(const [fetchImpl,outcome] of cases){
  const x=await runWith(fetchImpl);
  assert.equal(x.observation.outcome,outcome);
  assert.equal(decide({identity,observations:[x.observation]}).status,'Unknown');
 }
});
test('invalid Maven body and invalid acquisition remain Unknown or rejected',async()=>{
 const x=await runWith(async()=>({status:200,text:async()=>'<html>not a pom</html>'}));
 assert.equal(x.observation.outcome,'InvalidResponse');
 assert.equal(decide({identity,observations:[x.observation]}).status,'Unknown');
 assert.throws(()=>interpretMaven({...x.acquisition,query:{...x.acquisition.query,name:'wrong'}},identity,x.ref.id),/coordinate mismatch/);
});
test('Found and NotFound conflict, technical errors never conflict',()=>{
 const base={scope:'Version',packageKey:identity.key,version:identity.version,providerId:'maven-central',observedAt:time,archiveId:'a'};
 const found={...base,outcome:'Found'},absent={...base,outcome:'NotFoundObserved',archiveId:'b'},timeout={...base,outcome:'Timeout',archiveId:'c'};
 assert.equal(decide({identity,observations:[found,absent]}).status,'Conflicted');
 assert.equal(decide({identity,observations:[found,timeout]}).status,'Resolved');
 const one=decide({identity,observations:[found,absent,timeout]});
 const two=decide({identity,observations:[timeout,absent,found]});
 assert.deepEqual(one,two);
 assert.deepEqual(decide({identity,observations:[found,found]}),decide({identity,observations:[found]}));
 const foreign={...found,packageKey:'maven:elsewhere:artifact'};
 assert.deepEqual(decide({identity,observations:[foreign,found]}),decide({identity,observations:[found]}));
 assert.equal(one.policyVersion,'identity-maven-v2');
 assert.equal(one.inputDigest.length,64);
});
test('archive detects mutation and never stores credentials',async()=>{
 const records=new Map();
 const backend={put:async(k,v)=>records.set(k,v),get:async k=>records.get(k)||null};
 const archive=createObservationArchive(backend);
 const ref=await archive.store({...await provider().acquire(identity),authorization:'secret-token',headers:{Authorization:'secret-token'}});
 assert.ok(!records.get(ref.id).includes('secret-token'));
 assert.equal(ref.archiveFormatVersion,'2');
 assert.equal(ref.contentHash,canonical.sha256Text(pom));
 records.set(ref.id,records.get(ref.id).replace('spring-core','other-core'));
 await assert.rejects(()=>archive.load(ref),/integrity/);
});
test('archive write failure prevents any decision',async()=>{
 const archive=createObservationArchive({put:async()=>{throw Error('disk-full');},get:async()=>null});
 await assert.rejects(()=>resolveComponent({component:{purl},componentId:'component:1',provider:provider(),archive,decidedAt:time}),/disk-full/);
});
test('replay offline reproduces Lot A decisions and computed confidence',async()=>{
 const archive=createObservationArchive(createMemoryBackend());
 const acquired=await provider().acquire(identity);
 const ref=await archive.store(acquired);
 const args={component:{purl},componentId:'component:1',archive,archiveRefs:[ref],decidedAt:time};
 const first=await resolveArchived(args),second=await resolveArchived(args);
 assert.deepEqual(first,second);
 assert.equal(first.result.status,'Resolved');
 assert.equal(first.assertions[0].confidence,1);
 assert.equal(first.assertions[0].policyVersion,'1.0.0');
 assert.equal(first.decisions[0].policyVersion,'1.0.0');
 assert.equal(first.decisions[0].selectedAssertionId,first.assertions[0].id);
 assert.equal(first.verifications.length,1);
});
test('Unknown is not confidence zero and has no invented Lot A assertion',async()=>{
 const x=await resolveComponent({component:{purl},componentId:'component:1',provider:createMavenCentralProvider({now:()=>time,fetchImpl:async()=>{throw Error('network');}}),archive:createObservationArchive(createMemoryBackend()),decidedAt:time});
 assert.equal(x.result.status,'Unknown');
 assert.equal(x.assertions.length,0);
 assert.equal(x.decisions.length,0);
});
test('negative observation produces Lot A assertion but identity Unknown',async()=>{
 const x=await resolveComponent({component:{purl},componentId:'component:1',provider:provider(404,''),archive:createObservationArchive(createMemoryBackend()),decidedAt:time});
 assert.equal(x.result.status,'Unknown');
 assert.equal(x.assertions[0].confidence,1);
 assert.equal(x.decisions.length,1);
});
test('canonical component remains unchanged',async()=>{
 const component={purl,name:'spring-core',version:'6.1.3'};
 const before=JSON.stringify(component);
 await resolveComponent({component,componentId:'component:1',provider:provider(),archive:createObservationArchive(createMemoryBackend()),decidedAt:time});
 assert.equal(JSON.stringify(component),before);
});
test('unscored policy input is permitted but persisted assertion still requires computed confidence',()=>{
 const model=require('../js/enrichment-model.js');
 assert.throws(()=>model.validateAssertion({id:'a',subjectType:'componentEnrichment',subjectId:'x',predicate:'p',value:'v',evidenceIds:['e'],status:'unknown',conflictIds:[],policyVersion:'1.0.0'}),/confidence/);
});
