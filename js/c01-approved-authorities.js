'use strict';
/* C01-I04: repository-controlled authority candidates; no H2 approval is present.
 * Approval must be separately pinned in this module after explicit human H2 decision.
 * Never derive an approved trust root from caller input or a manifest's own digest.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const {digest}=require('./enrichment-canonical.js');
const MANIFEST_PATH=path.join(__dirname,'../fixtures/c01/junit-h2-authority-candidate.json');
const APPROVED_MANIFEST_DIGESTS=Object.freeze([]); // H2 not yet approved; never auto-populate
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
 if(r.approvalProvenance.status!=='APPROVED_H2'||!APPROVED_MANIFEST_DIGESTS.includes(m.manifestDigest))return 'NOT_APPROVED';
 return 'APPLICABLE';
}
function resolveApprovedAuthority(claim){
 // Never accept a manifest, approval status, scope, digest or authority rule from caller.
 // Only the repository's fixed-path candidate and pinned approval root are consulted.
 if(!claim||typeof claim!=='object'||Array.isArray(claim))return null;
 if(Object.keys(claim).sort().join(',')!=='externalIdentityId,packageIdentityId,predicate,projectIdentityId')return null;
 if(claim.predicate!=='attributedToProjectIdentity'||typeof claim.packageIdentityId!=='string'||typeof claim.externalIdentityId!=='string'||typeof claim.projectIdentityId!=='string')return null;
 // A claimed identity cannot be inferred from a name, alias, URL or package namespace.
 const manifest=loadRepositoryCandidate();
 validateManifest(manifest);
 const r=manifest.rules[0];
 if(claim.projectIdentityId!==r.scope.projectIdentityId)return null;
 if(claim.packageIdentityId!=='maven:junit:junit:4.13.2'||claim.externalIdentityId!=='maven:junit:junit:4.13.2')return null;
 if(r.approvalProvenance.status!=='APPROVED_H2'||!APPROVED_MANIFEST_DIGESTS.includes(manifest.manifestDigest))return null;
 return Object.freeze({status:'APPROVED',manifestDigest:manifest.manifestDigest,ruleId:r.authorityRuleId,ruleVersion:r.authorityRuleVersion,domain:r.contractDomain,predicate:r.predicate,scope:Object.freeze({...r.scope}),manifestRef:'fixtures/c01/junit-h2-authority-candidate.json'});
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
module.exports={validateManifest,loadRepositoryCandidate,evaluate,resolveApprovedAuthority,resolveRepositoryEvidenceBinding,isApprovedBridgeRule};
