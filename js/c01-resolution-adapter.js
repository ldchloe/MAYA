'use strict';
const resolution=require('./enrichment-resolution.js');
const canonical=require('./enrichment-canonical.js');
const {DOMAIN,VERSION,POLICY_ID,POLICY_VERSION,fail}=require('./c01-contract-dispatch.js');
const DECIDED_AT='1970-01-01T00:00:00.000Z';
function resolveEligible(eligible,payload){
 const allowed=new Set(eligible.map(a=>a.id));
 const usedEvidence=new Set(eligible.flatMap(a=>a.evidenceIds));
 const relations=payload.evidenceRelations.filter(r=>allowed.has(r.assertionId)).sort((a,b)=>a.id.localeCompare(b.id));
 const evidence=payload.evidence.filter(e=>usedEvidence.has(e.id)).sort((a,b)=>a.id.localeCompare(b.id));
 const verifications=(payload.verifications||[]).filter(v=>usedEvidence.has(v.evidenceId)).sort((a,b)=>a.id.localeCompare(b.id));
 const computed=resolution.resolve(eligible,evidence,relations,{verifications,policyVersion:resolution.POLICY_VERSION,decidedAt:DECIDED_AT,componentEnrichments:payload.componentEnrichments||[]});
 const decisions=computed.decisions.map(d=>{
  const refs=[d.selectedAssertionId,...d.rejectedAssertionIds].filter(Boolean);
  if(refs.some(id=>!allowed.has(id)))fail('RESOLUTION_RESULT_ERROR');
  const value={subjectId:d.subjectId,predicate:d.predicate,selectedAssertionId:d.selectedAssertionId,rejectedAssertionIds:d.rejectedAssertionIds,evidenceIds:d.evidenceIds,reasonCodes:d.reasonCodes,conflictIds:d.conflictIds,engineVersion:resolution.ENGINE_VERSION};
  return {...value,id:'c01-decision:'+canonical.digest({domain:DOMAIN,version:VERSION,policyId:POLICY_ID,policyVersion:POLICY_VERSION,value})};
 });
 const conflicts=computed.conflicts.map(c=>{if(c.assertionIds.some(id=>!allowed.has(id)))fail('RESOLUTION_RESULT_ERROR');return {...c};});
 return {decisions,conflicts};
}
module.exports={resolveEligible};
