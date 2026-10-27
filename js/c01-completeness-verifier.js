'use strict';
const canonical=require('./enrichment-canonical.js');
const {dispatch,payloadDigest}=require('./c01-contract-dispatch.js');
const RULES_ID='maya.c01.documentary-qualification-fixture',RULES_VERSION='1.0.0';
const sort=xs=>[...xs].sort((a,b)=>a.localeCompare(b));
function reject(){const e=new Error('COMPLETENESS_REJECTED');e.code='COMPLETENESS_REJECTED';throw e;}
function eq(a,b){return canonical.canonicalJSON(a)===canonical.canonicalJSON(b);}
function verify(envelope,corpus,rules,proof){
 try{
  dispatch(envelope);
  if(corpus!==envelope.payload&&!eq(corpus,envelope.payload))reject();
  if(!rules||rules.id!==RULES_ID||rules.version!==RULES_VERSION)reject();
  if(!proof||proof.contractDomain!==envelope.contractDomain||proof.contractVersion!==envelope.contractVersion||proof.corpusDigest!==payloadDigest(corpus)||proof.qualificationRulesId!==RULES_ID||proof.qualificationRulesVersion!==RULES_VERSION)reject();
  if(!Array.isArray(proof.exclusions)||proof.exclusions.length)reject();
  const assertions=corpus.assertions;
  if(!Array.isArray(assertions)||new Set(assertions.map(a=>a.id)).size!==assertions.length)reject();
  const byId=new Map(assertions.map(a=>[a.id,a]));
  const groups=new Map();
  for(const a of assertions){
   const relations=corpus.evidenceRelations.filter(r=>r.assertionId===a.id);
   const evidence=corpus.evidence.filter(e=>relations.some(r=>r.evidenceId===e.id));
   if(!relations.length||!evidence.length)reject();
   const scopes=sort([...new Set(evidence.map(e=>e.versionScope===null||e.versionScope===undefined?'null':canonical.canonicalJSON(e.versionScope)))]);
   if(scopes.length!==1)reject();
   const key=canonical.canonicalJSON([a.subjectType,a.subjectId,a.predicate,scopes[0]]);
   if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push(a.id);
  }
  const requiredClasses=[],requiredExaminations=[],requiredConflicts=[];
  for(const [key,participants] of [...groups].sort((a,b)=>a[0].localeCompare(b[0]))){
   const [subjectType,subjectId,predicate,versionScope]=JSON.parse(key),assertionIds=sort(participants);
   const classId='c01-class:'+canonical.digest({subjectType,subjectId,predicate,versionScope,assertionIds});
   requiredClasses.push({id:classId,subjectType,subjectId,predicate,versionScope,assertionIds});
   const values=new Set(assertionIds.map(id=>canonical.canonicalJSON(byId.get(id).value)));
   const realContradictory=predicate==='attributedToProjectIdentity'&&values.size>1;
   const contradictory=realContradictory||(predicate==='mapsToProject'&&values.has(canonical.canonicalJSON('alpha'))&&values.has(canonical.canonicalJSON('beta')));
   const pending=!contradictory&&values.has(canonical.canonicalJSON('pending'));
   const result=contradictory?'CONFLICT':pending?'INDETERMINATE':'NO_CONFLICT';
   const ruleId=realContradictory?'explicit-project-attribution-incompatible':contradictory?'fixture-alpha-beta-incompatible':pending?'fixture-pending-value':'fixture-no-explicit-incompatibility';
   const conflictIds=[];
   if(contradictory){
    const id='c01-conflict:'+canonical.digest({classId,assertionIds,ruleId,rulesId:RULES_ID,rulesVersion:RULES_VERSION});
    requiredConflicts.push({id,subjectId,predicate,assertionIds,conflictType:'contradictory-values',status:'conflicted',detectedAt:'1970-01-01T00:00:00.000Z'});
    conflictIds.push(id);
   }
   requiredExaminations.push({id:'c01-examination:'+canonical.digest({classId,assertionIds,ruleId}),classId,assertionIds,ruleId,result,conflictIds,reason:contradictory?(realContradictory?'Explicit incompatible project attribution values':'Explicit alpha/beta fixture incompatibility'):pending?'Explicit pending fixture requires further qualification':'No explicit incompatibility rule applies'});
  }
  requiredClasses.sort((a,b)=>a.id.localeCompare(b.id));requiredExaminations.sort((a,b)=>a.id.localeCompare(b.id));
  const expected={contractDomain:envelope.contractDomain,contractVersion:envelope.contractVersion,corpusDigest:payloadDigest(corpus),qualificationRulesId:RULES_ID,qualificationRulesVersion:RULES_VERSION,examinedAssertionIds:sort(assertions.map(a=>a.id)),comparisonClasses:requiredClasses,examinations:requiredExaminations,conflictIds:sort(requiredConflicts.map(c=>c.id)),exclusions:[]};
  if(!eq(proof,{...expected,resultDigest:canonical.digest(expected)}))reject();
  if(!eq([...corpus.conflicts].sort((a,b)=>a.id.localeCompare(b.id)),requiredConflicts.sort((a,b)=>a.id.localeCompare(b.id))))reject();
  return true;
 }catch(error){if(error.code==='COMPLETENESS_REJECTED')throw error;reject();}
}
module.exports={verify};
