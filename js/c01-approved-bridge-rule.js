'use strict';
const {digest}=require('./enrichment-canonical.js');
const authority=require('./c01-approved-authorities.js');
const propositions=require('./c01-p1-p5-evidence.js');
const freeze=x=>Object.freeze(x);
function issue(claim){
 const reject=()=>freeze({status:'REJECTED',bridgeEvidence:null,rule:null});
 if(!claim||Object.keys(claim).sort().join(',')!=='externalIdentityId,packageIdentityId,predicate,projectIdentityId')return reject();
 let resolution,corpus,verification;
 try{
  resolution=authority.resolveApprovedAuthority(claim);
  if(!resolution||resolution.status!=='APPROVED')return reject();
  const expected={packageIdentityId:claim.packageIdentityId,projectIdentityId:claim.projectIdentityId,snapshotDigest:resolution.projectSnapshotDigest};
  if(resolution.requiredEvidenceClasses.length===7){
   corpus=propositions.materializeApproved(resolution);
   verification=propositions.verifyApproved(corpus,expected,resolution);
  }else{
   corpus=propositions.materialize();
   verification=propositions.verify(corpus,expected);
  }
  if(verification.status!=='BRIDGE_EVIDENCE_COMPLETE')return reject();
 }catch{return reject();}
 const bridgeBody={kind:'repository-verified-explicit-attribution',predicate:claim.predicate,packageIdentityId:claim.packageIdentityId,externalIdentityId:claim.externalIdentityId,projectIdentityId:claim.projectIdentityId,projectSnapshotDigest:resolution.projectSnapshotDigest,manifestDigest:resolution.manifestDigest,authorityResolutionDigest:resolution.resolutionDigest,verificationDigest:verification.verificationDigest,evidenceIds:verification.evidenceIds,evidenceDigests:verification.evidenceDigests,archiveIds:corpus.map(x=>x.archiveId),tag:corpus[2].subjectId||'spring-framework@v6.1.3',taggedPomBlobId:corpus[2].archiveId,scope:resolution.contractDomain};
 const bridgeEvidence=freeze({...bridgeBody,id:'bridge-evidence:'+digest(bridgeBody),bridgeEvidenceDigest:digest(bridgeBody)});
 const ruleBody={ruleId:resolution.ruleId,ruleVersion:resolution.ruleVersion,manifestDigest:resolution.manifestDigest,authorityResolutionDigest:resolution.resolutionDigest,bridgeEvidenceDigest:bridgeEvidence.bridgeEvidenceDigest,packageIdentityId:claim.packageIdentityId,projectIdentityId:claim.projectIdentityId,projectSnapshotDigest:resolution.projectSnapshotDigest,predicate:claim.predicate,evidenceIds:verification.evidenceIds,evidenceDigests:verification.evidenceDigests,scope:resolution.contractDomain};
 const rule=freeze({...ruleBody,ruleDigest:digest(ruleBody)});
 return freeze({status:'APPROVED_BRIDGE_RULE_ISSUED',verification,bridgeEvidence,rule});
}
module.exports={issue};
