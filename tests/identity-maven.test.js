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

// B-01: exercise the actual canonical CycloneDX importer, not guessed component shapes.
const {importCycloneDxJson}=require('../js/cyclonedx-json.js');
const {extractMavenCoordinates,createPackageIdentity}=require('../js/identity-purl.js');
function canonicalComponent(raw){
 const {document,report}=importCycloneDxJson(JSON.stringify({bomFormat:'CycloneDX',specVersion:'1.5',components:[{'bom-ref':'maven-case',type:'library',...raw}]}),'b01.json');
 assert.notEqual(report.status,'failed');
 return document.components[0];
}
test('B-01 canonical Maven PURL extraction retains package and requested version',()=>{
 const component=canonicalComponent({group:'org.springframework',name:'spring-core',version:'6.1.3',purl});
 const extracted=extractMavenCoordinates(component);
 assert.equal(extracted.identity.identityKey,'maven:org.springframework:spring-core');
 assert.equal(extracted.identity.canonicalPurl,'pkg:maven/org.springframework/spring-core');
 assert.equal(extracted.version,'6.1.3');
 assert.equal(extracted.source,'purl');
});
test('B-01 canonical native group/name/version produces identity without PURL',()=>{
 const component=canonicalComponent({group:'org.springframework',name:'spring-core',version:'6.1.3'});
 const extracted=extractMavenCoordinates(component);
 assert.equal(extracted.identity.key,'maven:org.springframework:spring-core');
 assert.equal(extracted.version,'6.1.3');
 assert.equal(extracted.source,'native');
 assert.equal(extracted.purl,null);
});
test('B-01 package identity is stable across versions and missing version',()=>{
 const a=extractMavenCoordinates(canonicalComponent({group:'org.springframework',name:'spring-core',version:'6.1.3'}));
 const b=extractMavenCoordinates(canonicalComponent({group:'org.springframework',name:'spring-core',version:'6.1.4'}));
 const c=extractMavenCoordinates(canonicalComponent({group:'org.springframework',name:'spring-core'}));
 assert.deepEqual(a.identity,b.identity);
 assert.deepEqual(b.identity,c.identity);
 assert.equal(c.version,null);
 assert.equal(createPackageIdentity({namespace:'org.springframework',name:'spring-core'}).key,a.identity.key);
});
test('B-01 canonical incomplete and non-Maven components do not invent coordinates',()=>{
 assert.equal(extractMavenCoordinates(canonicalComponent({name:'unversioned'})),null);
 assert.equal(extractMavenCoordinates(canonicalComponent({group:'org.springframework'})),null);
 assert.equal(extractMavenCoordinates(canonicalComponent({name:'spring-core',purl:'pkg:npm/spring-core@1'})),null);
});
test('B-01 incompatible declarations are not selected or mutated',()=>{
 const component=canonicalComponent({group:'other.group',name:'spring-core',version:'6.1.3',purl});
 const before=JSON.stringify(component);
 assert.equal(extractMavenCoordinates(component),null);
 assert.equal(JSON.stringify(component),before);
});
test('B-01 unversioned Maven PURL extracts identity without changing legacy parser',()=>{
 const unversioned='pkg:maven/org.springframework/spring-core';
 const component=canonicalComponent({purl:unversioned,name:'spring-core'});
 assert.equal(extractMavenPurl(unversioned),null);
 const extracted=extractMavenCoordinates(component);
 assert.equal(extracted.identity.key,'maven:org.springframework:spring-core');
 assert.equal(extracted.version,null);
});
test('B-01 native canonical coordinates resolve without network and preserve SBOM',async()=>{
 const component=canonicalComponent({group:'org.springframework',name:'spring-core',version:'6.1.3'});
 const before=JSON.stringify(component);
 const result=await resolveComponent({component,componentId:component.id,provider:provider(),archive:createObservationArchive(createMemoryBackend()),decidedAt:time});
 assert.equal(result.identity.key,'maven:org.springframework:spring-core');
 assert.equal(result.result.status,'Resolved');
 assert.equal(JSON.stringify(component),before);
});
test('B-01 unversioned native coordinates do not query Maven Central',async()=>{
 const component=canonicalComponent({group:'org.springframework',name:'spring-core'});
 const result=await resolveComponent({component,componentId:component.id,decidedAt:time});
 assert.equal(result.identity.key,'maven:org.springframework:spring-core');
 assert.equal(result.result.status,'Unknown');
 assert.equal(result.observations.length,0);
});


const {createMavenCentralProvider: createB03Provider}=require('../js/identity-maven-provider.js');
const b03Identity={ecosystem:'maven',namespace:'org.springframework',name:'spring-core'};
function b03Provider(response){
 return createB03Provider({now:()=> '2026-10-23T00:00:00.000Z',fetchImpl:async()=>response});
}
test('B-03 package Found acquisition and interpretation',async()=>{
 const provider=b03Provider({status:200,text:async()=>'<metadata><groupId>org.springframework</groupId><artifactId>spring-core</artifactId></metadata>'});
 const a=await provider.checkPackage(b03Identity);
 assert.equal(a.scope,'Package');
 assert.equal(a.query.version,null);
 assert.equal(interpretMaven(a,{...b03Identity,key:'maven:org.springframework:spring-core'},'a').outcome,'Found');
});
test('B-03 version Found acquisition and interpretation',async()=>{
 const provider=b03Provider({status:200,text:async()=>'<project><groupId>org.springframework</groupId><artifactId>spring-core</artifactId><version>6.1.3</version></project>'});
 const a=await provider.checkVersion(b03Identity,'6.1.3');
 assert.equal(a.scope,'Version');
 assert.equal(a.query.version,'6.1.3');
 assert.equal(interpretMaven(a,{...b03Identity,version:'6.1.3',key:'maven:org.springframework:spring-core'},'b').outcome,'Found');
});
test('B-03 package and version 404 are separately scoped negative observations',async()=>{
 const provider=b03Provider({status:404,text:async()=>''});
 const p=await provider.checkPackage(b03Identity);
 const v=await provider.checkVersion(b03Identity,'6.1.3');
 const identity={...b03Identity,version:'6.1.3',key:'maven:org.springframework:spring-core'};
 assert.equal(interpretMaven(p,identity,'p').outcome,'NotFoundObserved');
 assert.equal(interpretMaven(v,identity,'v').outcome,'NotFoundObserved');
 assert.equal(p.query.version,null);
 assert.equal(v.query.version,'6.1.3');
});
test('B-03 timeout and network errors never become package absence',async()=>{
 for(const [error,expected] of [[Object.assign(new Error('abort'),{name:'AbortError'}),'Timeout'],[new Error('offline'),'NetworkError']]){
  const provider=createB03Provider({now:()=> '2026-10-23T00:00:00Z',fetchImpl:async()=>{throw error;}});
  const a=await provider.checkPackage(b03Identity);
  assert.equal(a.transport,expected);
  assert.equal(interpretMaven(a,{...b03Identity,key:'maven:org.springframework:spring-core'},'err').outcome,expected);
 }
});
test('B-03 429 and 5xx remain technical failures',async()=>{
 for(const [status,expected] of [[429,'RateLimited'],[500,'ProviderUnavailable'],[503,'ProviderUnavailable']]){
  const a=await b03Provider({status,text:async()=>''}).checkPackage(b03Identity);
  assert.equal(a.transport,expected);
  assert.notEqual(interpretMaven(a,{...b03Identity,key:'maven:org.springframework:spring-core'},'http').outcome,'NotFoundObserved');
 }
});
test('B-03 invalid XML is not Found or NotFoundObserved',async()=>{
 const a=await b03Provider({status:200,text:async()=>'<metadata><groupId>wrong</groupId></metadata>'}).checkPackage(b03Identity);
 assert.equal(interpretMaven(a,{...b03Identity,key:'maven:org.springframework:spring-core'},'xml').outcome,'InvalidResponse');
});
test('B-03 missing version never triggers a version request',async()=>{
 const provider=b03Provider({status:200,text:async()=>''});
 await assert.rejects(()=>provider.checkVersion(b03Identity,undefined),/version required/);
 const a=await provider.checkPackage(b03Identity);
 assert.equal(a.scope,'Package');
});


// B-04: archived acquisition -> observation -> Lot A Evidence.
test('B-04 valid archive carries hash, sourceRef and provenance into Evidence',async()=>{
 const archive=createObservationArchive(createMemoryBackend());
 const acquisition=await provider().acquire(identity);
 const ref=await archive.store(acquisition);
 const result=await resolveArchived({component:{purl},componentId:'component:b04',archive,archiveRefs:[ref],decidedAt:time});
 assert.equal(result.observation.contentHash,ref.contentHash);
 assert.equal(result.observation.sourceRef,acquisition.url+'#'+ref.id);
 assert.equal(result.observation.archiveId,ref.id);
 assert.equal(result.observation.providerId,'maven-central');
 assert.equal(result.observation.observedAt,time);
 assert.equal(result.evidence[0].sourceRef,result.observation.sourceRef);
 assert.equal(result.evidence[0].observedAt,result.observation.observedAt);
 assert.equal(result.evidence[0].sourceType,'registry');
 assert.equal(result.assertions.length,1);
 assert.equal(result.decisions.length,1);
});
test('B-04 corrupted archive blocks observation and Evidence',async()=>{
 const records=new Map();
 const archive=createObservationArchive({put:async(k,v)=>records.set(k,v),get:async k=>records.get(k)});
 const ref=await archive.store(await provider().acquire(identity));
 records.set(ref.id,records.get(ref.id).replace('spring-core','different-core'));
 await assert.rejects(()=>resolveArchived({component:{purl},componentId:'component:b04',archive,archiveRefs:[ref],decidedAt:time}),/integrity/);
});
test('B-04 unreadable archive fails explicitly',async()=>{
 const archive=createObservationArchive({put:async()=>{},get:async()=>{throw Error('read-failed');}});
 await assert.rejects(()=>resolveArchived({component:{purl},componentId:'component:b04',archive,archiveRefs:[{id:'observation:'+'a'.repeat(64)}],decidedAt:time}),/read-failed/);
});
test('B-04 failed write cannot produce a decision',async()=>{
 const archive=createObservationArchive({put:async()=>{throw Error('write-failed');},get:async()=>null});
 await assert.rejects(()=>resolveComponent({component:{purl},componentId:'component:b04',provider:provider(),archive,decidedAt:time}),/write-failed/);
});
test('B-04 absent optional metadata remains absent',async()=>{
 const x=await runWith(async()=>({status:200,text:async()=>pom}));
 for(const field of ['homepageUrl','scmUrl','sourceRepositoryUrl','issueTrackerUrl'])assert.equal(Object.hasOwn(x.observation,field),false);
});
test('B-04 present POM URLs are observed only, never endorsed',async()=>{
 const body='<project><groupId>org.springframework</groupId><artifactId>spring-core</artifactId><version>6.1.3</version><url>https://example.org/home</url><scm><url>https://example.org/scm</url></scm><issueManagement><url>https://example.org/issues</url></issueManagement></project>';
 const archive=createObservationArchive(createMemoryBackend());
 const acquired=await provider(200,body).acquire(identity);
 const ref=await archive.store(acquired);
 const result=await resolveArchived({component:{purl},componentId:'component:b04',archive,archiveRefs:[ref],decidedAt:time});
 const o=result.observation;
 assert.equal(o.homepageUrl,'https://example.org/home');
 assert.equal(o.scmUrl,'https://example.org/scm');
 assert.equal(o.sourceRepositoryUrl,'https://example.org/scm');
 assert.equal(o.issueTrackerUrl,'https://example.org/issues');
 assert.equal(o.outcome,'Found');
 assert.equal(o.contentHash,canonical.sha256Text(body));
 assert.equal(Object.hasOwn(o,'official'),false);
 assert.equal(Object.hasOwn(o,'validated'),false);
 assert.equal(Object.hasOwn(o,'approved'),false);
 assert.equal(result.evidence[0].sourceRef,o.sourceRef);
 assert.equal(result.assertions[0].predicate,'packageVersionObserved');
});
test('B-04 URLs are not invented from invalid or negative POM responses',async()=>{
 const body='<html><url>https://example.org/untrusted</url></html>';
 const x=await runWith(async()=>({status:200,text:async()=>body}));
 assert.equal(x.observation.outcome,'InvalidResponse');
 assert.equal(Object.hasOwn(x.observation,'homepageUrl'),false);
 const y=await runWith(async()=>({status:404,text:async()=>''}));
 assert.equal(Object.hasOwn(y.observation,'scmUrl'),false);
});
test('B-04 archive reference hash mismatch is rejected even when archive bytes are intact',async()=>{
 const archive=createObservationArchive(createMemoryBackend());
 const ref=await archive.store(await provider().acquire(identity));
 await assert.rejects(()=>resolveArchived({component:{purl},componentId:'component:b04',archive,archiveRefs:[{...ref,contentHash:'0'.repeat(64)}],decidedAt:time}),/content hash mismatch/);
});

// B-02: declared, normalized and reconstructed PURLs remain distinguishable.
const {validateMavenPurl,normalizeMavenPurl,normalizeMavenComponent}=require('../js/identity-purl.js');
test('B-02 complete Maven PURL validates and normalizes',()=>{
 const x=validateMavenPurl(purl);
 assert.equal(x.status,'valid');
 assert.equal(x.normalizedPurl,purl);
 assert.equal(x.coordinates.version,'6.1.3');
});
test('B-02 unversioned Maven PURL is valid',()=>{
 const x=validateMavenPurl('pkg:maven/org.springframework/spring-core');
 assert.equal(x.status,'valid');
 assert.equal(x.coordinates.version,null);
 assert.equal(x.normalizedPurl,'pkg:maven/org.springframework/spring-core');
});
test('B-02 malformed, wrong-type and empty segments are invalid',()=>{
 for(const input of ['pkg:maven/a/','pkg:maven//b@1','pkg:maven/a/b@','pkg:maven/a/b@1?type=jar','pkg:maven/a/%ZZ@1','pkg:npm/a@1']){
  assert.equal(validateMavenPurl(input).status,'invalid');
  assert.equal(normalizeMavenComponent({purl:input,group:'a',name:'b'}).identity,null);
 }
});
test('B-02 native complete coordinates reconstruct versioned PURL',()=>{
 const x=normalizeMavenComponent(canonicalComponent({group:'org.springframework',name:'spring-core',version:'6.1.3'}));
 assert.equal(x.status,'reconstructed');
 assert.equal(x.origin,'native');
 assert.equal(x.declaredPurl,null);
 assert.equal(x.normalizedPurl,null);
 assert.equal(x.reconstructedPurl,purl);
 assert.equal(x.identity.identityKey,'maven:org.springframework:spring-core');
});
test('B-02 native versionless coordinates reconstruct package PURL',()=>{
 const x=normalizeMavenComponent(canonicalComponent({group:'org.springframework',name:'spring-core'}));
 assert.equal(x.status,'reconstructed');
 assert.equal(x.version,null);
 assert.equal(x.reconstructedPurl,'pkg:maven/org.springframework/spring-core');
});
test('B-02 insufficient native coordinates never invent identity',()=>{
 for(const component of [{name:'spring-core'},{group:'org.springframework'},{name:'spring-core',version:'6.1.3'}]){
  const x=normalizeMavenComponent(canonicalComponent(component));
  assert.equal(x.status,'insufficient');
  assert.equal(x.identity,null);
  assert.equal(x.reconstructedPurl,null);
 }
});
test('B-02 coherent declared PURL preserves origin and declared bytes',()=>{
 const declared='pkg:maven/org.springframework/spring%2Dcore@6.1.3';
 const component=canonicalComponent({purl:declared,group:'org.springframework',name:'spring-core',version:'6.1.3'});
 const before=JSON.stringify(component);
 const x=normalizeMavenComponent(component);
 assert.equal(x.status,'valid');
 assert.equal(x.origin,'declared');
 assert.equal(x.declaredPurl,declared);
 assert.equal(x.normalizedPurl,purl);
 assert.equal(x.reconstructedPurl,null);
 assert.equal(JSON.stringify(component),before);
});
test('B-02 incompatible declarations never select or mutate',()=>{
 const component=canonicalComponent({purl,group:'other.group',name:'spring-core',version:'6.1.3'});
 const before=JSON.stringify(component);
 const x=normalizeMavenComponent(component);
 assert.equal(x.status,'conflicted');
 assert.equal(x.identity,null);
 assert.equal(x.declaredPurl,purl);
 assert.equal(x.normalizedPurl,null);
 assert.equal(JSON.stringify(component),before);
});
test('B-02 non-Maven declared PURL is not interpreted as Maven',()=>{
 const x=normalizeMavenComponent(canonicalComponent({purl:'pkg:npm/react@18.2.0',name:'react',version:'18.2.0'}));
 assert.equal(x.identity,null);
 assert.equal(x.status,'invalid');
});
test('B-02 normalization is deterministic and idempotent',()=>{
 const a=validateMavenPurl('pkg:maven/org.springframework/spring%2Dcore@6.1.3');
 const b=validateMavenPurl(a.normalizedPurl);
 assert.equal(a.normalizedPurl,b.normalizedPurl);
 assert.equal(normalizeMavenPurl(a.coordinates),a.normalizedPurl);
 assert.deepEqual(normalizeMavenComponent({group:'org.springframework',name:'spring-core',version:'6.1.3'}),normalizeMavenComponent({group:'org.springframework',name:'spring-core',version:'6.1.3'}));
});
