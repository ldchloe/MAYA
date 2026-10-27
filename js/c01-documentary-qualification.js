'use strict';
const canonical=require('./enrichment-canonical.js');
const {dispatch,fail,payloadDigest}=require('./c01-contract-dispatch.js');
const RULES_ID='maya.c01.documentary-qualification-fixture',RULES_VERSION='1.0.0';
const FIXTURE_CONFLICT='fixture-alpha-beta-incompatible',FIXTURE_NO_CONFLICT='fixture-no-explicit-incompatibility',FIXTURE_INDETERMINATE='fixture-pending-value';
const cmp=(a,b)=>a.localeCompare(b),ids=xs=>xs.map(x=>x.id).sort(cmp);
function scope(a,p){
 const refs=(p.evidenceRelations||[]).filter(r=>r.assertionId===a.id);
 const ev=(p.evidence||[]).filter(e=>refs.some(r=>r.evidenceId===e.id));
 const scopes=[...new Set(ev.map(e=>e.versionScope===null||e.versionScope===undefined?'null':canonical.canonicalJSON(e.versionScope)))].sort(cmp);
 if(scopes.length!==1)fail('QUALIFICATION_SCOPE_ERROR');
 return scopes[0];
}
function qualify(envelope){
 dispatch(envelope);
 const p=envelope.payload;
 if(!Array.isArray(p.assertions)||!Array.isArray(p.evidence)||!Array.isArray(p.evidenceRelations)||!Array.isArray(p.conflicts))fail('QUALIFICATION_CORPUS_ERROR');
 for(const key of ['assertions','evidence','evidenceRelations','conflicts'])if(new Set(p[key].map(x=>x.id)).size!==p[key].length)fail('QUALIFICATION_CORPUS_ERROR');
 const groups=new Map();
 for(const a of p.assertions){
  if(!a||typeof a.id!=='string'||!a.id||typeof a.subjectType!=='string'||typeof a.subjectId!=='string'||typeof a.predicate!=='string')fail('QUALIFICATION_CORPUS_ERROR');
  const s=scope(a,p),key=canonical.canonicalJSON([a.subjectType,a.subjectId,a.predicate,s]);
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(a);
 }
 const comparisonClasses=[],examinations=[],conflicts=[];
 for(const [key,members] of [...groups].sort((a,b)=>cmp(a[0],b[0]))){
  const [subjectType,subjectId,predicate,versionScope]=JSON.parse(key),assertionIds=ids(members);
  const classId='c01-class:'+canonical.digest({subjectType,subjectId,predicate,versionScope,assertionIds});
  comparisonClasses.push({id:classId,subjectType,subjectId,predicate,versionScope,assertionIds});
  const values=new Set(members.map(a=>canonical.canonicalJSON(a.value)));
  const incompatible=values.has(canonical.canonicalJSON('alpha'))&&values.has(canonical.canonicalJSON('beta'))&&predicate==='mapsToProject';
  const indeterminate=!incompatible&&values.has(canonical.canonicalJSON('pending'));
  const result=incompatible?'CONFLICT':indeterminate?'INDETERMINATE':'NO_CONFLICT';
  const ruleId=incompatible?FIXTURE_CONFLICT:indeterminate?FIXTURE_INDETERMINATE:FIXTURE_NO_CONFLICT;
  let conflictIds=[];
  if(incompatible){
   const conflict={id:'c01-conflict:'+canonical.digest({classId,assertionIds,ruleId,rulesId:RULES_ID,rulesVersion:RULES_VERSION}),subjectId,predicate,assertionIds,conflictType:'contradictory-values',status:'conflicted',detectedAt:'1970-01-01T00:00:00.000Z'};
   conflicts.push(conflict);conflictIds=[conflict.id];
  }
  examinations.push({id:'c01-examination:'+canonical.digest({classId,assertionIds,ruleId}),classId,assertionIds,ruleId,result,conflictIds,reason:incompatible?'Explicit alpha/beta fixture incompatibility':indeterminate?'Explicit pending fixture requires further qualification':'No explicit incompatibility rule applies'});
 }
 return {contractDomain:envelope.contractDomain,contractVersion:envelope.contractVersion,corpusDigest:payloadDigest(p),qualificationRulesId:RULES_ID,qualificationRulesVersion:RULES_VERSION,examinedAssertionIds:ids(p.assertions),comparisonClasses,examinations,conflicts};
}
module.exports={RULES_ID,RULES_VERSION,qualify};
