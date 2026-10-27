'use strict';
/* C01-I04: repository-controlled authority candidates; no H2 approval is present.
 * Approval must be separately pinned in this module after explicit human H2 decision.
 * Never derive an approved trust root from caller input or a manifest's own digest.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const {digest}=require('./enrichment-canonical.js');
const MANIFEST_PATH=path.join(__dirname,'../fixtures/c01/junit-h2-authority-candidate.json');
const APPROVED_MANIFEST_DIGESTS=Object.freeze(['a0af0913dd7aedbe02100d93d92ffecdd6edd70e2ad1b2b3f552d56ee12bc3fb']); // exact human-authorized repository root
const EXPECTED_SOURCE_COMMITMENTS=Object.freeze({mavenArchiveSha256:'605703278032b3282a60e2e145b24e1c788aaceb8e60a17a2da145bcab827aef',mavenBodySha256:'569b6977ee4603c965c1c46c3058fa6e969291b0160eb6964dd092cd89eadd94',upstreamPomSha256:'569b6977ee4603c965c1c46c3058fa6e969291b0160eb6964dd092cd89eadd94',projectReadmeSha256:'63feaf908bda828d78adf9989bf404ffd4e4ac4ad76b0d7bed74cf5b4f611723',projectSnapshotDigest:'a61190267f2c520a70ed08ef6183e7d7b1492009c252f3e4dd2677f4f4378fb1'});
const keys=['lot-b-maven-central-observation','upstream-release-pom','independent-project-readme','approved-project-identity-snapshot'];
const exact=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function validateManifest(m){
 if(!m||m.manifestVersion!=='1.0.0'||!Array.isArray(m.rules)||m.rules.length!==1||!/^[a-f0-9]{64}$/.test(m.manifestDigest||''))throw Error('AUTHORITY_MANIFEST_CONTRACT');
 const {manifestDigest,...content}=m;
 if(digest(content)!==manifestDigest)throw Error('AUTHORITY_MANIFEST_INTEGRITY');
 const r=m.rules[0];
 if(!r||typeof r.authorityRuleId!=='string'||r.authorityRuleVersion!=='1.0.0'||r.contractDomain!=='C01-I04'||r.predicate!=='attributedToProjectIdentity'||!r.scope||!Array.isArray(r.allowedEvidenceClasses)||!exact(r.allowedEvidenceClasses,keys)||!exact(r.sourceCommitments,EXPECTED_SOURCE_COMMITMENTS)||!r.validationRequirements||r.validationRequirements.allClassesRequired!==true||r.validationRequirements.exactOpaqueProjectIdentity!==true||r.validationRequirements.explicitBridgeEvidence!==true||r.validationRequirements.offlineReplay!==true||!r.approvalProvenance||!['PENDING_H2','APPROVED_H2'].includes(r.approvalProvenance.status))throw Error('AUTHORITY_MANIFEST_CONTRACT');
 if(r.scope.ecosystem!=='maven'||r.scope.groupId!=='junit'||r.scope.artifactId!=='junit'||r.scope.version!=='4.13.2'||!/^project:[a-f0-9]{64}$/.test(r.scope.projectIdentityId||''))throw Error('AUTHORITY_MANIFEST_SCOPE');
 return true;
}
function loadRepositoryCandidate(){return JSON.parse(fs.readFileSync(MANIFEST_PATH,'utf8'));}
function evaluate(m,ruleId,scope,predicate,evidenceClasses,options={}){
 validateManifest(m);
 const r=m.rules[0];
 if(r.authorityRuleId!==ruleId||r.predicate!==predicate||!exact(r.scope,scope)||!exact(r.allowedEvidenceClasses,evidenceClasses)||options.explicitBridgeEvidence===false)return 'NOT_APPLICABLE';
 if(!APPROVED_MANIFEST_DIGESTS.includes(m.manifestDigest))return 'NOT_APPROVED';
 return 'APPLICABLE';
}
function resolveApprovedAuthority(claim){
 // Never accept a manifest, approval status, scope, digest or authority rule from caller.
 // Only the repository's fixed-path candidate and pinned approval root are consulted.
 if(!claim||typeof claim!=='object'||Array.isArray(claim))return null;
 if(Object.keys(claim).sort().join(',')!=='externalIdentityId,packageIdentityId,predicate,projectIdentityId')return null;
 if(claim.predicate!=='attributedToProjectIdentity'||typeof claim.packageIdentityId!=='string'||typeof claim.externalIdentityId!=='string'||typeof claim.projectIdentityId!=='string')return null;
 const approvedCorpus=APPROVED_CORPORA.find(x=>x.packageIdentityId===claim.packageIdentityId);
 if(approvedCorpus)return resolveApprovedCorpus(claim,approvedCorpus);
 // A claimed identity cannot be inferred from a name, alias, URL or package namespace.
 const manifest=loadRepositoryCandidate();
 validateManifest(manifest);
 const r=manifest.rules[0];
 if(claim.projectIdentityId!==r.scope.projectIdentityId)return null;
 if(claim.packageIdentityId!=='maven:junit:junit:4.13.2'||claim.externalIdentityId!=='maven:junit:junit:4.13.2')return null;
 if(!APPROVED_MANIFEST_DIGESTS.includes(manifest.manifestDigest))return null;
 const binding=resolveRepositoryEvidenceBinding();
 const {status,approvalStatus,resolutionDigest,...evidenceBinding}=binding;
 const approved={...evidenceBinding,status:'APPROVED',approvalStatus:'APPROVED',approvalSource:'js/c01-approved-authorities.js:APPROVED_MANIFEST_DIGESTS',manifestRef:'fixtures/c01/junit-h2-authority-candidate.json'};
 return Object.freeze({...approved,resolutionDigest:digest(approved)});
}
// Read-only, repository-origin evidence binding. No caller-provided evidence, digest,
// approval flag or path is trusted; the four files are fixed by this module.
function resolveRepositoryEvidenceBinding(){
 const manifest=loadRepositoryCandidate();validateManifest(manifest);
 const r=manifest.rules[0],base=path.join(__dirname,'../fixtures/c01');
 const read=p=>fs.readFileSync(path.join(base,p));
 const observation=JSON.parse(read('maven-central/junit-4.13.2.observation.json').toString('utf8'));
 const reference=JSON.parse(read('maven-central/junit-4.13.2.reference.json').toString('utf8'));
 const snapshot=JSON.parse(read('junit4-project-identity.snapshot.json').toString('utf8'));
 const project=require('./project-identity.js');project.validateProjectIdentitySnapshot(snapshot);
 if(snapshot.snapshotDigest!==r.sourceCommitments.projectSnapshotDigest||snapshot.projects.length!==1||snapshot.projects[0].id!==r.scope.projectIdentityId)throw Error('AUTHORITY_Y_BINDING');
 if(reference.sha256!==r.sourceCommitments.mavenArchiveSha256||reference.contentHash!==r.sourceCommitments.mavenBodySha256||reference.id!=='observation:'+reference.sha256)throw Error('AUTHORITY_MAVEN_REFERENCE');
 const pom=read('junit4-r4.13.2-upstream-pom.xml'),readme=read('junit4-r4.13.2-project-readme.md');
 if(sha(pom)!==r.sourceCommitments.upstreamPomSha256||sha(readme)!==r.sourceCommitments.projectReadmeSha256)throw Error('AUTHORITY_SOURCE_INTEGRITY');
 if(!observation.acquisition||sha(observation.acquisition.body)!==r.sourceCommitments.mavenBodySha256||observation.acquisition.status!==200||observation.acquisition.providerId!=='maven-central'||observation.acquisition.query.namespace!=='junit'||observation.acquisition.query.name!=='junit'||observation.acquisition.query.version!=='4.13.2')throw Error('AUTHORITY_OBSERVATION_BINDING');
 const evidence=[
  {evidenceClass:keys[0],evidenceId:reference.id,sha256:reference.sha256,sourceRef:'fixtures/c01/maven-central/junit-4.13.2.observation.json'},
  {evidenceClass:keys[1],evidenceId:'sha256:'+sha(pom),sha256:sha(pom),sourceRef:'fixtures/c01/junit4-r4.13.2-upstream-pom.xml'},
  {evidenceClass:keys[2],evidenceId:'sha256:'+sha(readme),sha256:sha(readme),sourceRef:'fixtures/c01/junit4-r4.13.2-project-readme.md'},
  {evidenceClass:keys[3],evidenceId:'project-snapshot:'+snapshot.snapshotDigest,sha256:snapshot.snapshotDigest,sourceRef:'fixtures/c01/junit4-project-identity.snapshot.json'}
 ];
 const binding={status:'EVIDENCE_BOUND_NOT_APPROVED',manifestDigest:manifest.manifestDigest,ruleId:r.authorityRuleId,ruleVersion:r.authorityRuleVersion,contractDomain:r.contractDomain,predicate:r.predicate,packageIdentityId:'maven:junit:junit:4.13.2',projectIdentityId:r.scope.projectIdentityId,projectSnapshotDigest:snapshot.snapshotDigest,requiredEvidenceClasses:[...keys],evidence,approvalSource:'js/c01-approved-authorities.js:APPROVED_MANIFEST_DIGESTS',approvalStatus:'NOT_APPROVED'};
 return Object.freeze({...binding,resolutionDigest:digest(binding)});
}
// No evidence-bound repository bridge rule has been approved or issued.
// A caller's rules cannot be promoted by the manifest's mere approval.
function isApprovedBridgeRule(){return false;}


const APPROVED_CORPORA=require('./c01-corpus-registry.js').approved;
const gitBlob=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length),Buffer.from([0]),b])).digest('hex');
function resolveApprovedCorpus(claim,descriptor){
 const base=path.join(__dirname,'..');
 const read=p=>fs.readFileSync(path.join(base,p));
 const manifest=JSON.parse(read(descriptor.manifestRef));
 const {manifestDigest,...unsigned}=manifest;
 if(manifestDigest!==descriptor.manifestDigest||digest(unsigned)!==manifestDigest||manifest.manifestVersion!=='1.0.0'||!Array.isArray(manifest.rules)||manifest.rules.length!==1)throw Error('CORPUS_MANIFEST_INTEGRITY');
 const r=manifest.rules[0],c=r.sourceCommitments;
 const expectedClasses=['lot-b-maven-central-observation',...descriptor.sources.map(x=>x.evidenceClass),'approved-project-identity-snapshot'];
 if(r.authorityRuleId!==descriptor.authorityRuleId||r.authorityRuleVersion!=='1.0.0'||r.contractDomain!==descriptor.contractDomain||r.predicate!=='attributedToProjectIdentity'||!exact(r.scope,descriptor.scope)||!exact(r.allowedEvidenceClasses,expectedClasses)||r.approvalProvenance?.status!=='APPROVED_H2'||r.approvalProvenance.decisionRef!==descriptor.approvalDecisionRef||r.validationRequirements?.allClassesRequired!==true||r.validationRequirements.exactOpaqueProjectIdentity!==true||r.validationRequirements.explicitBridgeEvidence!==true||r.validationRequirements.offlineReplay!==true)throw Error('CORPUS_MANIFEST_CONTRACT');
 if(claim.projectIdentityId!==descriptor.projectIdentityId)return null;
 const snapshot=JSON.parse(read(descriptor.sourceBase+'/'+descriptor.snapshot));
 require('./project-identity.js').validateProjectIdentitySnapshot(snapshot);
 if(snapshot.snapshotDigest!==c.projectSnapshotDigest||snapshot.projects.length!==1||snapshot.projects[0].id!==descriptor.projectIdentityId||snapshot.links.length!==0||snapshot.projects[0].attributionContext.scope!=='independent-project-identity-only')throw Error('CORPUS_Y_INTEGRITY');
 const sources=descriptor.sources.map(x=>({definition:x,bytes:read(descriptor.sourceBase+'/'+x.file)}));
 for(const x of sources)if(gitBlob(x.bytes)!==c[x.definition.commitment]||!x.bytes.toString('utf8').includes(x.definition.assertion))throw Error('CORPUS_OFFICIAL_SOURCE_INTEGRITY');
 if(sha(sources[0].bytes)!==c.projectReadmeSha256||snapshot.projects[0].attributionContext.projectSourceSha256!==c.projectReadmeSha256)throw Error('CORPUS_Y_SOURCE_INTEGRITY');
 const observed=JSON.parse(read(descriptor.sourceBase+'/'+descriptor.observation));
 const pom=read(descriptor.sourceBase+'/'+descriptor.pom),acq=observed.acquisition;
 if(acq?.status!==200||acq.providerId!=='maven-central'||acq.query.namespace!==descriptor.maven.groupId||acq.query.name!==descriptor.maven.artifactId||acq.query.version!==descriptor.maven.version||sha(pom)!==c.mavenBodySha256||sha(Buffer.from(acq.body,'utf8'))!==c.mavenBodySha256||observed.bodySha256!==c.mavenBodySha256||observed.reference?.contentHash!==c.mavenBodySha256||observed.reference?.id!=='observation:'+observed.reference.sha256)throw Error('CORPUS_MAVEN_INTEGRITY');
 const xml=pom.toString('utf8');
 if(!xml.includes('<groupId>'+descriptor.maven.groupId+'</groupId>')||!xml.includes('<artifactId>'+descriptor.maven.artifactId+'</artifactId>')||!xml.includes('<version>'+descriptor.maven.version+'</version>'))throw Error('CORPUS_MAVEN_COORDINATES');
 const sourcePaths=[descriptor.observation,...descriptor.sources.map(x=>x.file),descriptor.snapshot];
 const hashes=[c.mavenBodySha256,...sources.map(x=>sha(x.bytes)),snapshot.snapshotDigest];
 const evidence=expectedClasses.map((evidenceClass,i)=>({evidenceClass,evidenceId:'sha256:'+hashes[i],sha256:hashes[i],sourceRef:descriptor.sourceBase+'/'+sourcePaths[i]}));
 const body={status:'APPROVED',approvalStatus:'APPROVED',approvalSource:'js/c01-corpus-registry.js:approved',manifestRef:descriptor.manifestRef,manifestDigest,ruleId:r.authorityRuleId,ruleVersion:r.authorityRuleVersion,contractDomain:r.contractDomain,predicate:r.predicate,packageIdentityId:descriptor.packageIdentityId,projectIdentityId:descriptor.projectIdentityId,projectSnapshotDigest:snapshot.snapshotDigest,requiredEvidenceClasses:expectedClasses,evidence};
 return Object.freeze({...body,resolutionDigest:digest(body)});
}
module.exports={validateManifest,loadRepositoryCandidate,evaluate,resolveApprovedAuthority,resolveRepositoryEvidenceBinding,isApprovedBridgeRule};
