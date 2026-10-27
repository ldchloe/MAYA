'use strict';
// Canonical, repository-origin P1-P5 observations. No caller evidence is authoritative.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {digest}=require('./enrichment-canonical.js');
const {verifyTaggedSourceChain}=require('./c01-official-bridge-sources.js');
const {validateProjectIdentitySnapshot}=require('./project-identity.js');
const base=path.join(__dirname,'../fixtures/c01');
const read=p=>fs.readFileSync(path.join(base,p));
const json=p=>JSON.parse(read(p).toString('utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length),Buffer.from([0]),b])).digest('hex');
const freeze=o=>Object.freeze(o);
function evidence(propositionId,fields){
 const body={propositionId,evidenceKind:'official-project-bridge-proposition',scope:'C01-I04',...fields};
 const canonicalDigest=digest(body);
 return freeze({...body,id:'evidence:'+canonicalDigest,canonicalDigest});
}
function materialize(){
 const manifest=json('junit-h2-authority-candidate.json'),rule=manifest.rules[0];
 const coord=rule.scope.groupId+':'+rule.scope.artifactId+':'+rule.scope.version;
 const pkg='maven:'+coord,project=rule.scope.projectIdentityId;
 const acq=json('official-p1/acquisition.json'),html=read('official-p1/dependency-info.html');
 if(acq.httpStatus!==200||acq.sourceUrl!=='https://junit.org/junit4/dependency-info.html'||acq.finalUrl!==acq.sourceUrl||acq.bodyBytes!==html.length||acq.bodySha256!==sha(html)||acq.archiveId!=='sha256:'+sha(html))throw Error('P1_ARCHIVE_INTEGRITY');
 const page=html.toString('utf8');
 const xml=page.match(/&lt;groupId&gt;([^<]+)&lt;\/groupId&gt;\s*&lt;artifactId&gt;([^<]+)&lt;\/artifactId&gt;\s*&lt;version&gt;([^<]+)&lt;\/version&gt;/);
 if(!page.includes('<title>JUnit &#x2013; Dependency Information</title>')||!xml||xml[1]!==rule.scope.groupId||xml[2]!==rule.scope.artifactId||xml[3]!==rule.scope.version)throw Error('P1_EXPLICIT_COORDINATES');
 const p1=evidence('P1',{evidenceClass:'official-maven-documentation',sourceType:'official-http-archive',sourceRef:acq.finalUrl,archiveId:acq.archiveId,sourceDigest:sha(html),contentDigest:sha(html),proposition:'official-documentation-declares-maven-coordinates',subjectType:'official-project-documentation',subjectId:acq.sourceUrl,predicate:'declaresMavenCoordinates',observedValue:coord,verificationMethod:'sha256-and-structured-maven-dependency-xml',verificationId:'P1-v1',acquiredAt:acq.acquiredAt});
 const releaseBytes=read('junit4-r4.13.2-official-release-api.json'),release=JSON.parse(releaseBytes.toString('utf8'));
 const provenance=json('junit4-r4.13.2-tag-provenance.json');
 if(release.tag_name!==provenance.tag||release.html_url!==provenance.releaseUrl||release.url!=='https://api.github.com/repos/junit-team/junit4/releases/38014424'||release.id!==38014424||release.draft===true||release.prerelease===true||!release.name?.includes('4.13.2'))throw Error('P2_OFFICIAL_RELEASE');
 const p2=evidence('P2',{evidenceClass:'official-release',sourceType:'official-github-release-api',sourceRef:release.url,archiveId:'sha256:'+sha(releaseBytes),sourceDigest:sha(releaseBytes),contentDigest:sha(releaseBytes),proposition:'official-project-release-tag',subjectType:'official-github-repository',subjectId:'junit-team/junit4',predicate:'publishesReleaseTag',observedValue:release.tag_name,verificationMethod:'official-api-release-tag-and-repository-binding',verificationId:'P2-v1',observedAt:release.published_at});
 const pom=read('junit4-r4.13.2-upstream-pom.xml'),readme=read('junit4-r4.13.2-project-readme.md');
 const verified=verifyTaggedSourceChain({provenance,pom,readme,expectedCoordinate:coord});
 if(verified.status!=='TAGGED_POM_VERIFIED_NOT_BRIDGE')throw Error('P3_TAGGED_POM');
 const p3=evidence('P3',{evidenceClass:'official-tagged-pom',sourceType:'official-git-blob',sourceRef:provenance.pom.officialSource,archiveId:'git-blob:'+blob(pom),sourceDigest:sha(pom),contentDigest:sha(pom),proposition:'official-tagged-pom-declares-coordinate',subjectType:'git-tag',subjectId:'junit-team/junit4@'+provenance.tag,predicate:'declaresMavenCoordinate',observedValue:coord,verificationMethod:'git-blob-sha1-and-sha256-and-pom-xml',verificationId:'P3-v1',observedAt:provenance.releasePublishedAt});
 const observation=json('maven-central/junit-4.13.2.observation.json'),reference=json('maven-central/junit-4.13.2.reference.json');
 if(observation.acquisition.status!==200||observation.acquisition.providerId!=='maven-central'||observation.acquisition.query.namespace!==rule.scope.groupId||observation.acquisition.query.name!==rule.scope.artifactId||observation.acquisition.query.version!==rule.scope.version||sha(observation.acquisition.body)!==reference.contentHash||reference.contentHash!==sha(pom)||reference.sha256!==rule.sourceCommitments.mavenArchiveSha256)throw Error('P4_PUBLISHED_POM_MISMATCH');
 const p4=evidence('P4',{evidenceClass:'published-pom-byte-equality',sourceType:'derived-verified-observation',sourceRef:'fixtures/c01/maven-central/junit-4.13.2.observation.json',archiveId:reference.id,sourceDigest:reference.contentHash,contentDigest:sha(pom),proposition:'tagged-pom-identical-to-published-maven-pom',subjectType:'package-identity',subjectId:pkg,predicate:'sameBytesAsTaggedPom',observedValue:sha(pom),verificationMethod:'exact-utf8-byte-sha256-equality',verificationId:'P4-v1',sourceEvidenceId:p3.id,observedAt:observation.acquisition.observedAt||null});
 const snapshot=json('junit4-project-identity.snapshot.json');
 validateProjectIdentitySnapshot(snapshot);
 if(snapshot.projects.length!==1||snapshot.projects[0].id!==project||snapshot.snapshotDigest!==rule.sourceCommitments.projectSnapshotDigest||snapshot.projects[0].attributionContext.scope!=='independent-project-identity-only'||snapshot.projects[0].attributionContext.projectSourceSha256!==sha(readme)||JSON.stringify(snapshot.projects[0].attributionContext).includes('maven:junit'))throw Error('P5_H1_INDEPENDENCE');
 const p5=evidence('P5',{evidenceClass:'independent-project-identity',sourceType:'h1-approved-project-snapshot',sourceRef:'fixtures/c01/junit4-project-identity.snapshot.json',archiveId:'project-snapshot:'+snapshot.snapshotDigest,sourceDigest:snapshot.snapshotDigest,contentDigest:sha(readme),proposition:'independently-allocated-project-identity',subjectType:'project-identity',subjectId:project,predicate:'independentH1ProjectAllocation',observedValue:snapshot.snapshotDigest,verificationMethod:'project-snapshot-integrity-and-readme-sha256',verificationId:'P5-v1',observedAt:snapshot.projects[0].createdAt,attributionId:snapshot.projects[0].attributionId});
 return freeze([p1,p2,p3,p4,p5]);
}
function verify(corpus,expected){
 const fail=status=>freeze({status,verificationDigest:null});
 if(!Array.isArray(corpus)||!expected||typeof expected!=='object')return fail('BRIDGE_EVIDENCE_INVALID');
 const ids=['P1','P2','P3','P4','P5'];
 const relevant=corpus.filter(x=>ids.includes(x?.propositionId));
 if(new Set(relevant.map(x=>x.propositionId)).size!==relevant.length)return fail('BRIDGE_EVIDENCE_INVALID');
 if(relevant.length!==5)return fail('BRIDGE_EVIDENCE_INCOMPLETE');
 let canonical;try{canonical=materialize();}catch{return fail('BRIDGE_EVIDENCE_INVALID');}
 if(expected.packageIdentityId!==canonical[3].subjectId||expected.projectIdentityId!==canonical[4].subjectId||expected.snapshotDigest!==canonical[4].observedValue)return fail('BRIDGE_EVIDENCE_INVALID');
 const sorted=[...relevant].sort((a,b)=>a.propositionId.localeCompare(b.propositionId));
 if(sorted.some((x,i)=>digest(x)!==digest(canonical[i])))return fail('BRIDGE_EVIDENCE_INVALID');
 const basis={packageIdentityId:expected.packageIdentityId,projectIdentityId:expected.projectIdentityId,snapshotDigest:expected.snapshotDigest,evidenceIds:sorted.map(x=>x.id),evidenceDigests:sorted.map(x=>x.canonicalDigest)};
 return freeze({status:'BRIDGE_EVIDENCE_COMPLETE',...basis,verificationDigest:digest(basis)});
}

function materializeApproved(binding){
 if(!binding||binding.status!=='APPROVED'||!Array.isArray(binding.evidence)||!Array.isArray(binding.requiredEvidenceClasses)||binding.evidence.length!==binding.requiredEvidenceClasses.length)throw Error('APPROVED_CORPUS_REQUIRED');
 return freeze(binding.evidence.map((entry,index)=>{
  if(entry.evidenceClass!==binding.requiredEvidenceClasses[index]||!/^sha256:[a-f0-9]{64}$/.test(entry.evidenceId)||entry.evidenceId!=='sha256:'+entry.sha256)throw Error('APPROVED_CORPUS_EVIDENCE_INVALID');
  const body={propositionId:'S'+(index+1),evidenceClass:entry.evidenceClass,evidenceKind:'official-project-bridge-proposition',scope:binding.contractDomain,sourceType:'repository-verified-archive',sourceRef:entry.sourceRef,archiveId:entry.evidenceId,sourceDigest:entry.sha256,contentDigest:entry.sha256,packageIdentityId:binding.packageIdentityId,projectIdentityId:binding.projectIdentityId,projectSnapshotDigest:binding.projectSnapshotDigest,manifestDigest:binding.manifestDigest};
  const canonicalDigest=digest(body);
  return freeze({...body,id:'evidence:'+canonicalDigest,canonicalDigest});
 }));
}
function verifyApproved(corpus,expected,binding){
 const fail=status=>freeze({status,verificationDigest:null});
 if(!binding||binding.status!=='APPROVED'||!expected||expected.packageIdentityId!==binding.packageIdentityId||expected.projectIdentityId!==binding.projectIdentityId||expected.snapshotDigest!==binding.projectSnapshotDigest)return fail('BRIDGE_EVIDENCE_INVALID');
 let canonical;try{canonical=materializeApproved(binding);}catch{return fail('BRIDGE_EVIDENCE_INVALID');}
 if(!Array.isArray(corpus)||corpus.length!==canonical.length)return fail('BRIDGE_EVIDENCE_INCOMPLETE');
 const sorted=[...corpus].sort((a,b)=>String(a?.propositionId).localeCompare(String(b?.propositionId)));
 if(sorted.some((x,i)=>digest(x)!==digest(canonical[i])))return fail('BRIDGE_EVIDENCE_INVALID');
 const basis={packageIdentityId:expected.packageIdentityId,projectIdentityId:expected.projectIdentityId,snapshotDigest:expected.snapshotDigest,evidenceIds:sorted.map(x=>x.id),evidenceDigests:sorted.map(x=>x.canonicalDigest)};
 return freeze({status:'BRIDGE_EVIDENCE_COMPLETE',...basis,verificationDigest:digest(basis)});
}

module.exports={materialize,verify,materializeApproved,verifyApproved};
