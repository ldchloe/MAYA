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
 if(claim.packageIdentityId===SPRING_PACKAGE)return springRepositoryBinding(claim);
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

const SPRING_MANIFEST_PATH=path.join(__dirname,'../fixtures/c01/spring/spring-h2-authority-manifest.json');
const SPRING_APPROVED_DIGEST='57bcf8ba76d9c79bc0bb681df2774b28d8777889e881bba71c8c7e2672b83c33';
const SPRING_PACKAGE='maven:org.springframework:spring-core:6.1.3';
function springRepositoryBinding(claim){
 if(claim.packageIdentityId!==SPRING_PACKAGE||claim.externalIdentityId!==SPRING_PACKAGE)return null;
 const manifest=JSON.parse(fs.readFileSync(SPRING_MANIFEST_PATH,'utf8'));
 if(manifest.manifestDigest!==SPRING_APPROVED_DIGEST||digest(Object.fromEntries(Object.entries(manifest).filter(([k])=>k!=='manifestDigest')))!==manifest.manifestDigest)throw Error('SPRING_H2_MANIFEST_INTEGRITY');
 if(manifest.manifestVersion!=='1.0.0'||manifest.rules.length!==1)throw Error('SPRING_H2_MANIFEST_CONTRACT');
 const r=manifest.rules[0];
 if(r.approvalProvenance.status!=='APPROVED_H2'||r.approvalProvenance.decisionRef!=='user-explicit-h2-approval-c01-i05-spring-core-6.1.3'||r.authorityRuleId!=='c01:spring-core-6.1.3:project-attribution'||r.authorityRuleVersion!=='1.0.0'||r.contractDomain!=='C01-I05'||r.predicate!=='attributedToProjectIdentity')throw Error('SPRING_H2_RULE_CONTRACT');
 if(!exact(r.scope,{artifactId:'spring-core',ecosystem:'maven',groupId:'org.springframework',projectIdentityId:'project:389fa659b1d9c46c996fcbef55f8b0c0c3dc7bb9790b9db8e4755c8f82ee79ef',version:'6.1.3'})&&!exact(r.scope,{ecosystem:'maven',groupId:'org.springframework',artifactId:'spring-core',version:'6.1.3',projectIdentityId:'project:389fa659b1d9c46c996fcbef55f8b0c0c3dc7bb9790b9db8e4755c8f82ee79ef'}))throw Error('SPRING_H2_SCOPE');
 if(claim.projectIdentityId!==r.scope.projectIdentityId)return null;
 if(!Array.isArray(r.allowedEvidenceClasses)||r.allowedEvidenceClasses.length!==7||r.validationRequirements.allClassesRequired!==true||r.validationRequirements.explicitBridgeEvidence!==true||r.validationRequirements.offlineReplay!==true||r.validationRequirements.exactOpaqueProjectIdentity!==true)throw Error('SPRING_H2_EVIDENCE_REQUIREMENTS');
 const base=path.join(__dirname,'../fixtures/c01/spring');
 const read=p=>fs.readFileSync(path.join(base,p));
 const snapshot=JSON.parse(read('spring-framework-project-identity.snapshot.json'));
 require('./project-identity.js').validateProjectIdentitySnapshot(snapshot);
 const c=r.sourceCommitments;
 if(snapshot.snapshotDigest!==c.projectSnapshotDigest||snapshot.projects.length!==1||snapshot.projects[0].id!==r.scope.projectIdentityId||snapshot.links.length!==0)throw Error('SPRING_H2_Y_BINDING');
 const sourceFiles=[
  ['spring-framework-v6.1.3-readme.md','officialReadmeGitBlob'],
  ['spring-framework-v6.1.3-gradle.properties','officialVersionGitBlob'],
  ['spring-framework-v6.1.3-settings.gradle','officialSettingsGitBlob'],
  ['spring-framework-v6.1.3-spring-core.gradle','officialModuleGitBlob'],
  ['spring-framework-v6.1.3-build.gradle','officialBuildGitBlob']
 ];
 const blob=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\\0'),b])).digest('hex');
 const sources=sourceFiles.map(([file,key])=>({file,bytes:read(file),expected:c[key]}));
 for(const source of sources)if(blob(source.bytes)!==source.expected)throw Error('SPRING_H2_SOURCE_INTEGRITY');
 if(sha(sources[0].bytes)!==c.projectReadmeSha256||snapshot.projects[0].attributionContext.projectSourceSha256!==c.projectReadmeSha256||snapshot.projects[0].attributionContext.scope!=='independent-project-identity-only')throw Error('SPRING_H2_Y_INDEPENDENCE');
 const [readme,version,settings,module,build]=sources.map(x=>x.bytes.toString('utf8'));
 if(!readme.includes('This is the home of the Spring Framework')||!/^version=6\\.1\\.3$/m.test(version)||!settings.includes('include "spring-core"')||!module.includes('description = "Spring Core"')||!build.includes('group = "org.springframework"'))throw Error('SPRING_H2_OFFICIAL_MODULE_CHAIN');
 const observed=JSON.parse(read('maven-central/spring-core-6.1.3.observation.json'));
 const pom=read('maven-central/spring-core-6.1.3.pom');
 if(observed.acquisition.status!==200||observed.acquisition.providerId!=='maven-central'||observed.acquisition.query.namespace!=='org.springframework'||observed.acquisition.query.name!=='spring-core'||observed.acquisition.query.version!=='6.1.3'||sha(pom)!==c.mavenBodySha256||sha(Buffer.from(observed.acquisition.body,'utf8'))!==c.mavenBodySha256||!pom.toString('utf8').includes('<groupId>org.springframework</groupId>')||!pom.toString('utf8').includes('<artifactId>spring-core</artifactId>')||!pom.toString('utf8').includes('<version>6.1.3</version>'))throw Error('SPRING_H2_MAVEN_BINDING');
 const paths=['maven-central/spring-core-6.1.3.observation.json',...sourceFiles.map(x=>x[0]),'spring-framework-project-identity.snapshot.json'];
 const hashes=[c.mavenBodySha256,...sources.map(x=>sha(x.bytes)),snapshot.snapshotDigest];
 const evidence=r.allowedEvidenceClasses.map((evidenceClass,i)=>({evidenceClass,evidenceId:'sha256:'+hashes[i],sha256:hashes[i],sourceRef:'fixtures/c01/spring/'+paths[i]}));
 const body={status:'APPROVED',approvalStatus:'APPROVED',approvalSource:'js/c01-approved-authorities.js:SPRING_APPROVED_DIGEST',manifestRef:'fixtures/c01/spring/spring-h2-authority-manifest.json',manifestDigest:manifest.manifestDigest,ruleId:r.authorityRuleId,ruleVersion:r.authorityRuleVersion,contractDomain:r.contractDomain,predicate:r.predicate,packageIdentityId:SPRING_PACKAGE,projectIdentityId:r.scope.projectIdentityId,projectSnapshotDigest:snapshot.snapshotDigest,requiredEvidenceClasses:r.allowedEvidenceClasses,evidence};
 return Object.freeze({...body,resolutionDigest:digest(body)});
}

module.exports={validateManifest,loadRepositoryCandidate,evaluate,resolveApprovedAuthority,resolveRepositoryEvidenceBinding,isApprovedBridgeRule};
