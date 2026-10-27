'use strict';
/* C01-I04: repository-controlled authority candidates; no H2 approval is present.
 * Approval must be separately pinned in this module after explicit human H2 decision.
 * Never derive an approved trust root from caller input or a manifest's own digest.
 */
const fs=require('node:fs'),path=require('node:path');
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
// No evidence-bound repository bridge rule has been approved or issued.
// A caller's rules cannot be promoted by the manifest's mere approval.
function isApprovedBridgeRule(){return false;}
module.exports={validateManifest,loadRepositoryCandidate,evaluate,resolveApprovedAuthority,isApprovedBridgeRule};
