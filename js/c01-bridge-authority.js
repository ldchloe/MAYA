'use strict';
const crypto=require('node:crypto');
const repositoryAuthority=require('./c01-approved-authorities.js');
const repositoryBridge=require('./c01-approved-bridge-rule.js');
const POLICY_ID='maya.c01.bridge-authority',POLICY_VERSION='1.0.0';
const sha=x=>crypto.createHash('sha256').update(Buffer.from(x,'utf8')).digest('hex');
const fields=['sourceType','verificationMethod','verificationId','sourceRef','sourceDigest','predicate','packageIdentityId','externalIdentityId','projectIdentityId','versionScope'];
function provenanceApplicable(provenance, trustedAuthorityDigest, claim, ruleId){
 if(!provenance||typeof provenance.sourceContent!=='string'||typeof trustedAuthorityDigest!=='string'||!/^[a-f0-9]{64}$/.test(trustedAuthorityDigest))return false;
 if(sha(provenance.sourceContent)!==trustedAuthorityDigest||provenance.sourceDigest!==trustedAuthorityDigest)return false;
 let record;try{record=JSON.parse(provenance.sourceContent);}catch{return false;}
 return record&&record.sourceRef===provenance.sourceRef&&record.issuerId===provenance.issuerId&&
  typeof record.issuerId==='string'&&record.issuerId!==claim.externalIdentityId&&
  record.issuerId!==claim.packageIdentityId&&record.issuerId!==claim.projectIdentityId&&
  Array.isArray(record.ruleIds)&&record.ruleIds.includes(ruleId)&&
  Array.isArray(provenance.approvedRuleIds)&&provenance.approvedRuleIds.includes(ruleId);
}
function evaluate(evidence,claim,rules=[],options={}){
 if(!evidence||!claim||!Array.isArray(rules))throw Error('BRIDGE_AUTHORITY_CONTRACT_ERROR');
 if(typeof evidence.content!=='string'||!/^[a-f0-9]{64}$/.test(evidence.sourceDigest)||sha(evidence.content)!==evidence.sourceDigest)throw Error('BRIDGE_AUTHORITY_INTEGRITY_ERROR');
 if(!rules.every(r=>r&&typeof r.id==='string'&&r.version===POLICY_VERSION&&fields.every(k=>typeof r[k]==='string'&&r[k].length>0)))throw Error('BRIDGE_AUTHORITY_RULE_ERROR');
 if(new Set(rules.map(r=>r.id)).size!==rules.length)throw Error('BRIDGE_AUTHORITY_DUPLICATE_RULE');
 const observation=JSON.parse(evidence.content);
 if(observation.predicate!==claim.predicate||observation.packageIdentityId!==claim.packageIdentityId||observation.externalIdentityId!==claim.externalIdentityId||observation.projectIdentityId!==claim.projectIdentityId)throw Error('BRIDGE_AUTHORITY_CLAIM_MISMATCH');
 const issued=repositoryBridge.issue(claim);
 if(issued.status==='APPROVED_BRIDGE_RULE_ISSUED'&&rules.length===0&&evidence.kind==='explicit-attribution'&&evidence.sourceRef==='repository:P1-P5'&&evidence.id===issued.bridgeEvidence.id&&evidence.bridgeEvidenceDigest===issued.bridgeEvidence.bridgeEvidenceDigest&&evidence.packageIdentityId===claim.packageIdentityId&&evidence.externalIdentityId===claim.externalIdentityId&&evidence.projectIdentityId===claim.projectIdentityId&&evidence.versionScope==='4.13.2'&&Object.keys(observation).sort().join(',')==='externalIdentityId,packageIdentityId,predicate,projectIdentityId')return 'APPLICABLE';
 const applicable=rules.some(r=>(!options.requireProvenance||provenanceApplicable(options.provenance,options.trustedAuthorityDigest,claim,r.id))&&r.sourceType===evidence.sourceType&&r.verificationMethod===evidence.verificationMethod&&r.verificationId===evidence.verificationId&&r.sourceRef===evidence.sourceRef&&r.sourceDigest===evidence.sourceDigest&&r.predicate===claim.predicate&&r.packageIdentityId===claim.packageIdentityId&&r.externalIdentityId===claim.externalIdentityId&&r.projectIdentityId===claim.projectIdentityId&&r.versionScope===evidence.versionScope);
 // Raw caller-supplied rules can establish only a syntactic candidate match.
 // Contractual APPLICABLE requires repository-resolved approval; there is no legacy fallback.
 if(!applicable)return 'NOT_APPLICABLE';
 const approved=repositoryAuthority.resolveApprovedAuthority(claim);
 // Approval alone does not authorize caller-authored bridge rules: only a
 // repository-resolved, evidence-bound rule can ever yield APPLICABLE.
 return approved&&approved.status==='APPROVED'&&repositoryAuthority.isApprovedBridgeRule(rules,evidence,claim)?'APPLICABLE':'NOT_APPLICABLE';
}
module.exports={POLICY_ID,POLICY_VERSION,evaluate};
