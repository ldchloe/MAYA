'use strict';
const model=require('./enrichment-model.js'),canonical=require('./enrichment-canonical.js');
const {dispatch,fail}=require('./c01-contract-dispatch.js');
const policy=require('./c01-eligibility-policy.js'),adapter=require('./c01-resolution-adapter.js');
const sorted=xs=>[...xs].sort((a,b)=>a.localeCompare(b));
const ids=xs=>sorted(xs.map(x=>x.id));
function unique(xs,label){if(!Array.isArray(xs)||xs.some(x=>!x||typeof x.id!=='string'||!x.id)||new Set(xs.map(x=>x.id)).size!==xs.length)fail('CORPUS_VALIDATION_ERROR:'+label);}
function validateCorpus(p){
 for(const key of ['assertions','evidence','evidenceRelations','conflicts','componentEnrichments','verifications'])unique(p[key],key);
 const assertions=new Map(p.assertions.map(a=>[a.id,a])),evidence=new Map(p.evidence.map(e=>[e.id,e]));
 for(const a of p.assertions){
  model.validateAssertion(a,{computedConfidenceRequired:false});
  if(!Array.isArray(a.supersedesAssertionIds))continue;
  if(new Set(a.supersedesAssertionIds).size!==a.supersedesAssertionIds.length||a.supersedesAssertionIds.includes(a.id))fail('SUPERSESSION_ERROR');
  for(const id of a.supersedesAssertionIds)if(!assertions.has(id))fail('SUPERSESSION_ERROR');
 }
 for(const e of p.evidence)model.validateEvidence(e);
 for(const r of p.evidenceRelations){model.validateRelation(r);const a=assertions.get(r.assertionId),e=evidence.get(r.evidenceId);if(!a||!e||r.subjectId!==a.subjectId||r.predicate!==a.predicate)fail('CORPUS_VALIDATION_ERROR');model.validateEvidenceScope(a,e,r,p.componentEnrichments);}
 for(const a of p.assertions){const links=p.evidenceRelations.filter(r=>r.assertionId===a.id);if(!links.some(r=>r.relation==='supports')||canonical.canonicalJSON(sorted(links.map(r=>r.evidenceId)))!==canonical.canonicalJSON(sorted(a.evidenceIds)))fail('CORPUS_VALIDATION_ERROR');}
 for(const c of p.conflicts){if(!Array.isArray(c.assertionIds)||c.assertionIds.some(id=>!assertions.has(id)))fail('CORPUS_VALIDATION_ERROR');for(const id of c.assertionIds){const a=assertions.get(id);if(a.subjectId!==c.subjectId||a.predicate!==c.predicate)fail('CORPUS_VALIDATION_ERROR');}}
 const graph=new Map(p.assertions.map(a=>[a.id,a.supersedesAssertionIds||[]]));
 const seen=new Set(),visiting=new Set();function visit(id){if(visiting.has(id))fail('SUPERSESSION_ERROR');if(seen.has(id))return;visiting.add(id);for(const next of graph.get(id))visit(next);visiting.delete(id);seen.add(id);}for(const id of graph.keys())visit(id);
}
function run(envelope){
 const contract=dispatch(envelope),p=envelope.payload;validateCorpus(p);
 const admittedIds=ids(p.assertions);
 const superseded=new Set(p.assertions.flatMap(a=>a.supersedesAssertionIds||[]));
 const active=sorted(p.assertions.filter(a=>!superseded.has(a.id)).map(a=>a.id)).map(id=>p.assertions.find(a=>a.id===id));
 const activeIds=ids(active),eligible=active.filter(a=>policy.evaluate(envelope,a,true)===policy.ELIGIBLE);
 const eligibleIds=ids(eligible),nonEligibleIds=activeIds.filter(id=>!eligibleIds.includes(id)),transmittedIds=ids(eligible);
 if(canonical.canonicalJSON(transmittedIds)!==canonical.canonicalJSON(eligibleIds))fail('ELIGIBILITY_BOUNDARY_ERROR');
 const expectedGroups=sorted([...new Set(eligible.map(a=>canonical.canonicalJSON([a.subjectId,a.predicate])))]);
 const engineResult=adapter.resolveEligible(eligible,p);
 const base={...contract,payloadDigest:envelope.payloadDigest,validationContextDigest:envelope.validationContextDigest,admittedIds,activeIds,eligibleIds,nonEligibleIds,transmittedIds,expectedGroups,engineResult};
 const result={...base,resultDigest:canonical.digest(base)};
 verifyResult(envelope,result);
 return model.freeze(result);
}
function verifyResult(envelope,result){
 if(!result||!result.engineResult||!Array.isArray(result.engineResult.decisions))fail('RESOLUTION_RESULT_ERROR');
 const expected=runExpected(envelope);
 if(canonical.canonicalJSON(result)!==canonical.canonicalJSON(expected))fail('RESOLUTION_RESULT_ERROR');
 return true;
}
function runExpected(envelope){
 const contract=dispatch(envelope),p=envelope.payload;validateCorpus(p);
 const admittedIds=ids(p.assertions),superseded=new Set(p.assertions.flatMap(a=>a.supersedesAssertionIds||[]));
 const active=p.assertions.filter(a=>!superseded.has(a.id)).sort((a,b)=>a.id.localeCompare(b.id));
 const activeIds=ids(active),eligible=active.filter(a=>policy.evaluate(envelope,a,true)===policy.ELIGIBLE),eligibleIds=ids(eligible),nonEligibleIds=activeIds.filter(id=>!eligibleIds.includes(id));
 const transmittedIds=ids(eligible),expectedGroups=sorted([...new Set(eligible.map(a=>canonical.canonicalJSON([a.subjectId,a.predicate])))]);
 const engineResult=adapter.resolveEligible(eligible,p);
 const base={...contract,payloadDigest:envelope.payloadDigest,validationContextDigest:envelope.validationContextDigest,admittedIds,activeIds,eligibleIds,nonEligibleIds,transmittedIds,expectedGroups,engineResult};
 return {...base,resultDigest:canonical.digest(base)};
}
module.exports={run,verifyResult};
