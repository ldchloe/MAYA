'use strict';
const {dispatch}=require('./c01-contract-dispatch.js');
const canonical=require('./enrichment-canonical.js');
const attribution=require('./c01-project-attribution.js');
const issuer=require('./c01-approved-bridge-rule.js');
const ELIGIBLE='ELIGIBLE',NOT_ELIGIBLE='NOT_ELIGIBLE';
function realAttribution(envelope,assertion){
 try{
  const d=envelope.validationContext.attributionDossier;
  if(!d||assertion.subjectType!=='association'||assertion.predicate!=='attributedToProjectIdentity')return false;
  const claim={externalIdentityId:d.externalIdentityId,packageIdentityId:d.packageIdentityId,predicate:assertion.predicate,projectIdentityId:d.projectIdentityId};
  const issued=issuer.issue(claim);
  if(issued.status!=='APPROVED_BRIDGE_RULE_ISSUED')return false;
  const result=attribution.evaluate(d);
  if(result.status!=='VERIFIED'||result.eligibility!=='ELIGIBLE'||result.validation.VX!=='PASS'||result.validation.VY!=='PASS'||result.validation.VXY!=='PASS'||result.validation.bridgeAuthority!=='APPLICABLE')return false;
  if(assertion.id!==result.assertion.id||assertion.subjectId!==result.assertion.subjectId||assertion.value!==result.assertion.value||canonical.canonicalJSON(assertion.evidenceIds)!==canonical.canonicalJSON(result.assertion.evidenceIds))return false;
  if(d.bridgeEvidence.length!==1||d.bridgeEvidence[0].id!==issued.bridgeEvidence.id||d.bridgeEvidence[0].bridgeEvidenceDigest!==issued.bridgeEvidence.bridgeEvidenceDigest)return false;
  const p=envelope.payload;
  return assertion.evidenceIds.every(id=>{
   const evidence=p.evidence.find(x=>x.id===id);
   const relation=p.evidenceRelations.find(x=>x.evidenceId===id&&x.assertionId===assertion.id&&x.relation==='supports');
   const bridge=d.bridgeEvidence.find(x=>x.id===id);
   return evidence&&relation&&bridge&&evidence.sourceDigest===bridge.sourceDigest&&evidence.subjectId===assertion.subjectId&&evidence.attribute===assertion.predicate&&evidence.observedValue===assertion.value;
  });
 }catch{return false;}
}
function evaluate(envelope,assertion,active){
 dispatch(envelope);
 if(!assertion||typeof assertion.id!=='string')throw new Error('CONTRACT_ERROR');
 if(active!==true||!envelope.validationContext.eligibleAssertionIds.includes(assertion.id))return NOT_ELIGIBLE;
 if(assertion.subjectType==='componentEnrichment'&&assertion.predicate==='mapsToProject')return ELIGIBLE;
 return realAttribution(envelope,assertion)?ELIGIBLE:NOT_ELIGIBLE;
}
module.exports={ELIGIBLE,NOT_ELIGIBLE,evaluate};
