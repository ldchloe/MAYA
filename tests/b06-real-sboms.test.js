/* B-06 real, pinned CycloneDX SBOM acceptance. Requires Maven Central network. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {importCycloneDxJson}=require('../js/cyclonedx-json.js');
const {normalizeMavenComponent}=require('../js/identity-purl.js');
const {createMavenCentralProvider}=require('../js/identity-maven-provider.js');
const {createMemoryBackend,createObservationArchive}=require('../js/identity-archive.js');
const {resolveComponent,resolveArchived}=require('../js/identity-mvp.js');
const canonical=require('../js/enrichment-canonical.js');
const lotA=require('../js/enrichment-model.js');
const samples=[
 {name:'Apache Camel Kamelets',file:'b06-apache-camel-kamelets.json',purl:'pkg:maven/com.amazon.redshift/redshift-jdbc42@2.3.0'},
 {name:'SCANOSS Java',file:'b06-scanoss-java.json',purl:'pkg:maven/junit/junit',version:'4.13.1'},
 {name:'Europeana Corelib',file:'b06-europeana-corelib.json',purl:'pkg:maven/junit/junit@4.13.2'}
];
for(const sample of samples)test('B-06 real SBOM: '+sample.name, {timeout:60000},async t=>{
 const file=path.join(__dirname,'fixtures',sample.file);
 const bytes=fs.readFileSync(file);
 const original=bytes.toString('utf8');
 const digest=crypto.createHash('sha256').update(bytes).digest('hex');
 const {document,report}=importCycloneDxJson(original,sample.file);
 assert.notEqual(report.status,'failed','CycloneDX import failed');
 const component=document.components.find(c=>c.purl===sample.purl);
 assert.ok(component,'required Maven component missing from upstream SBOM');
 const before=JSON.stringify(component);
 const normalized=normalizeMavenComponent(component);
 assert.ok(['valid','reconstructed'].includes(normalized.status),'PURL invalid: '+normalized.reason);
 assert.ok(normalized.identity);
 const now=()=>new Date().toISOString();
 const provider=createMavenCentralProvider({now,fetchImpl:async(url,opts)=>fetch(url,{...opts,signal:AbortSignal.timeout(20000)})});
 const archive=createObservationArchive(createMemoryBackend());
 const result=await resolveComponent({component,componentId:component.id,provider,archive,decidedAt:now()});
 assert.equal(result.observation.outcome,'Found','Maven Central did not yield a matching POM: '+JSON.stringify(result.observation));
 assert.equal(result.result.status,'Resolved');
 assert.equal(result.evidence.length,1);
 assert.equal(result.assertions.length,1);
 assert.equal(result.decisions.length,1);
 assert.equal(result.evidence[0].sourceRef,result.observation.sourceRef);
 assert.equal(result.observation.contentHash,canonical.sha256Text((await archive.load({id:result.observation.archiveId})).body));
 assert.equal(JSON.stringify(component),before,'canonical component mutated');
 const replay=await resolveArchived({component,componentId:component.id,archive,archiveRefs:[{id:result.observation.archiveId}],decidedAt:result.decisions[0].decidedAt});
 assert.equal(replay.result.status,'Resolved');
 assert.equal(replay.evidence[0].sourceRef,result.evidence[0].sourceRef);
 assert.equal(replay.decisions[0].selectedAssertionId,result.decisions[0].selectedAssertionId);
 const ceId=result.assertions[0].subjectId;
 const dataset={schemaVersion:'1.0.0',datasetId:'b06-'+sample.file,sourceDocument:{id:sample.file,sha256:digest},createdAt:result.decisions[0].decidedAt,producer:{name:'MAYA',version:'1.0.0'},policyVersion:'1.0.0',enrichmentVersion:'1.0.0',componentEnrichments:[{id:ceId,componentId:component.id,selectedProjectId:null,selectedRepositoryId:null,projectCandidateIds:[],repositoryCandidateIds:[],assertionIds:result.assertions.map(x=>x.id),conflictIds:[],status:'verified',confidence:1,createdAt:result.decisions[0].decidedAt,updatedAt:result.decisions[0].decidedAt}],projects:[],repositories:[],evidence:result.evidence,evidenceRelations:result.evidenceRelations,verifications:result.verifications,assertions:result.assertions,conflicts:result.conflicts,decisions:result.decisions,activeDecisionIds:result.decisions.map(x=>x.id),revisionId:'b06-r1',previousRevisionId:null,previousRevisionDigest:null};
 dataset.revisionDigest=canonical.datasetDigest(dataset);
 assert.equal(lotA.validateDataset(dataset),true);
 console.log('B06_JOURNAL',JSON.stringify({sample:sample.name,file:sample.file,sbomSha256:digest,componentId:component.id,identity:result.identity.key,purl:normalized.normalizedPurl||normalized.reconstructedPurl,mavenUrl:result.observation.sourceRef,archiveId:result.observation.archiveId,contentHash:result.observation.contentHash,observation:result.observation.outcome,evidenceId:result.evidence[0].id,assertionId:result.assertions[0].id,decisionId:result.decisions[0].id,decision:result.result.status,replay:'Resolved',sbomUnchanged:true}));
});
