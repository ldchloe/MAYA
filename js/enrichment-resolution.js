/* Offline, deterministic and auditable enrichment resolution. */
(function(root,factory){const model=typeof module==='object'&&module.exports?require('./enrichment-model.js'):root.MayaEnrichmentModel;const canonical=typeof module==='object'&&module.exports?require('./enrichment-canonical.js'):root.MayaEnrichmentCanonical;const api=factory(model,canonical);if(typeof module==='object'&&module.exports)module.exports=api;else root.MayaEnrichmentResolution=api;})(typeof globalThis!=='undefined'?globalThis:this,function(model,canonical){
'use strict';
const POLICY_VERSION='1.0.0',ENGINE_VERSION='2.0.0';
function level(score){model.check(typeof score==='number'&&Number.isFinite(score)&&score>=0&&score<=1,'invalid confidence');return score>=.95?'verified':score>=.8?'high':score>=.6?'moderate':score>0?'low':'unknown';}
function evaluateEvidence(assertion,evidence,relations,verifications=[]){
 model.validateAssertion(assertion);const byId=new Map(evidence.map(e=>{model.validateEvidence(e);return [e.id,e];}));
 const relevant=relations.filter(r=>r.assertionId===assertion.id);for(const r of relevant){model.validateRelation(r);model.check(byId.has(r.evidenceId),'missing evidence '+r.evidenceId);model.check(r.subjectId===assertion.subjectId&&r.predicate===assertion.predicate,'relation assertion scope mismatch');const e=byId.get(r.evidenceId);model.check(e.attribute===r.predicate,'relation evidence predicate mismatch');}
 model.check(relevant.some(r=>r.relation==='supports'),'assertion without supports relation');
 model.check(canonical.canonicalJSON(relevant.map(r=>r.evidenceId).sort())===canonical.canonicalJSON([...assertion.evidenceIds].sort()),'assertion evidence relation mismatch');
 const groups=new Map();let hasVerified=false;
 for(const relation of relevant.filter(r=>r.relation==='supports')){const e=byId.get(relation.evidenceId);if(e.evidenceKind==='verified'){const record=verifications.find(v=>v.id===e.verificationId&&v.evidenceId===e.id);model.check(record,'verified evidence missing controlled verification');model.validateVerification(record);model.check(record.sourceDigest===e.sourceDigest,'verification evidence digest mismatch');hasVerified=true;}
 const weight={declarative:.6,observed:.8,verified:1,derived:.4}[e.evidenceKind];const key=e.independenceGroup||e.sourceRef;groups.set(key,Math.max(groups.get(key)||0,weight));}
 const values=[...groups.values()].sort((a,b)=>b-a);
 return {confidence:Math.min(hasVerified?1:.94,(values[0]||0)+Math.min(.1,Math.max(0,values.length-1)*.05)),contradicted:relevant.some(r=>r.relation==='contradicts'),evidenceIds:relevant.map(r=>r.evidenceId).sort()};
}
function confidence(assertion,evidence,relations,verifications=[]){model.check(Array.isArray(relations),'evidence relations required');return evaluateEvidence(assertion,evidence,relations,verifications).confidence;}
function resolve(assertions,evidence,relations,{verifications=[],policyVersion=POLICY_VERSION,decidedAt}={}){
 model.check(policyVersion===POLICY_VERSION,'unsupported policy');model.check(typeof decidedAt==='string'&&!Number.isNaN(Date.parse(decidedAt)),'decidedAt required');model.check(Array.isArray(relations),'evidence relations required');
 const ordered=[...assertions].sort((a,b)=>a.id.localeCompare(b.id));const groups=new Map();
 for(const a of ordered){const key=canonical.canonicalJSON([a.subjectId,a.predicate]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(a);}
 const conflicts=[],decisions=[],evaluations={};
 for(const [key,items] of [...groups].sort((a,b)=>a[0].localeCompare(b[0]))){
  const [subjectId,predicate]=JSON.parse(key),values=new Set(items.map(a=>canonical.canonicalJSON(a.value)));
  const scored=items.map(a=>{const evaluation=evaluateEvidence(a,evidence,relations,verifications);evaluations[a.id]=evaluation;return {a,...evaluation};});
  const hasConflict=values.size>1||scored.some(x=>x.contradicted);
  const groupInput={assertions:items.map(a=>({id:a.id,subjectId:a.subjectId,predicate:a.predicate,value:a.value,evidenceIds:[...a.evidenceIds].sort()})),relations:relations.filter(r=>items.some(a=>a.id===r.assertionId)).sort((a,b)=>a.id.localeCompare(b.id)),evidence:evidence.filter(e=>items.some(a=>a.evidenceIds.includes(e.id))).map(e=>{const out=model.copy(e);delete out.observedAt;return out;}).sort((a,b)=>a.id.localeCompare(b.id)),verifications:verifications.filter(v=>items.some(a=>a.evidenceIds.includes(v.evidenceId))).map(v=>{const out=model.copy(v);delete out.verifiedAt;return out;}).sort((a,b)=>a.id.localeCompare(b.id)),policyVersion,engineVersion:ENGINE_VERSION};
  const inputDigest=canonical.digest(groupInput),conflictId='conflict:'+inputDigest,conflictIds=hasConflict?[conflictId]:[];
  if(hasConflict)conflicts.push({id:conflictId,subjectId,predicate,assertionIds:items.map(x=>x.id),conflictType:values.size>1?'contradictory-values':'contradictory-evidence',status:'conflicted',detectedAt:decidedAt});
  const ranked=[...scored].sort((a,b)=>b.confidence-a.confidence||a.a.id.localeCompare(b.a.id));
  const best=ranked[0],selected=!hasConflict&&best.confidence>=.95?best.a.id:null;
  const reasonCodes=[hasConflict?'CONFLICT':selected?'VERIFIED':'INSUFFICIENT_EVIDENCE'];
  decisions.push({id:'decision:'+inputDigest,subjectId,predicate,selectedAssertionId:selected,rejectedAssertionIds:items.filter(a=>a.id!==selected).map(a=>a.id),evidenceIds:[...new Set(scored.flatMap(x=>x.evidenceIds))].sort(),conflictIds,reasonCodes,policyVersion,engineVersion:ENGINE_VERSION,inputDigest,decidedAt});
 }
 return model.freeze({conflicts,decisions,evaluations});
}
return {POLICY_VERSION,ENGINE_VERSION,level,confidence,resolve};
});
