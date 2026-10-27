'use strict';
const canonical=require('./enrichment-canonical.js');
const {dispatch,payloadDigest,contextDigest}=require('./c01-contract-dispatch.js');
const {qualify,RULES_ID,RULES_VERSION}=require('./c01-documentary-qualification.js');
const {verify}=require('./c01-completeness-verifier.js');
const boundary=require('./c01-resolution-boundary.js');
const eligibility=require('./c01-eligibility-policy.js');
const STATUS=Object.freeze({ACCEPTED:'ACCEPTED',REJECTED:'REJECTED',INDETERMINATE:'INDETERMINATE'});
const CODES=Object.freeze(['DOMAIN_INVALID','ENVELOPE_INVALID','PAYLOAD_INTEGRITY_INVALID','CONTEXT_INTEGRITY_INVALID','CORPUS_INVALID','QUALIFICATION_INVALID','COMPLETENESS_INVALID','COMPLETENESS_INDETERMINATE','ELIGIBILITY_INVALID','RESOLUTION_MISMATCH','UNEXPECTED_DECISION','MISSING_DECISION','NON_ELIGIBLE_ASSERTION_TRANSMITTED','SUPERSESSION_INVALID']);
const has=(xs,x)=>Array.isArray(xs)&&xs.includes(x);
function safeDigest(x){try{return x===undefined?null:canonical.digest(x);}catch{return null;}}
function baseFields(e){
 return {contractDomain:typeof e?.contractDomain==='string'?e.contractDomain:null,contractVersion:typeof e?.contractVersion==='string'?e.contractVersion:null,snapshotId:typeof e?.snapshotId==='string'?e.snapshotId:null,payloadDigest:typeof e?.payloadDigest==='string'?e.payloadDigest:null,validationContextDigest:typeof e?.validationContextDigest==='string'?e.validationContextDigest:null};
}
function errorCode(err){
 const code=err?.code||err?.message||'';
 if(code==='UNKNOWN_CONTRACT_DOMAIN'||code==='MISSING_CONTRACT_DOMAIN')return 'DOMAIN_INVALID';
 if(code==='UNSUPPORTED_CONTRACT_VERSION')return 'DOMAIN_INVALID';
 if(code==='INTEGRITY_ERROR')return 'ENVELOPE_INVALID';
 if(code==='SUPERSESSION_ERROR')return 'SUPERSESSION_INVALID';
 if(code.startsWith('CORPUS_VALIDATION_ERROR')||code==='QUALIFICATION_CORPUS_ERROR'||code==='QUALIFICATION_SCOPE_ERROR'||code==='Assertion invalid'||code.includes('invalid'))return 'CORPUS_INVALID';
 if(code==='COMPLETENESS_REJECTED')return 'COMPLETENESS_INVALID';
 if(code==='RESOLUTION_RESULT_ERROR')return 'RESOLUTION_MISMATCH';
 if(code==='ELIGIBILITY_BOUNDARY_ERROR')return 'ELIGIBILITY_INVALID';
 return 'ENVELOPE_INVALID';
}
function acceptance(e){
 const fields=baseFields(e),reasons=new Set(),p=e?.qualificationProof,r=e?.resolutionResult;
 let qualificationResultDigest=null,eligibilityResultDigest=null,resolutionResultDigest=null;
 const add=x=>reasons.add(x);
 let validEnvelope=true;
 try{dispatch(e);}catch(err){validEnvelope=false;const code=err?.code||err?.message;
  if(code==='INTEGRITY_ERROR'){
   try{if(e.payloadDigest!==payloadDigest(e.payload))add('PAYLOAD_INTEGRITY_INVALID');}catch{add('PAYLOAD_INTEGRITY_INVALID');}
   try{if(e.validationContextDigest!==contextDigest(e.validationContext))add('CONTEXT_INTEGRITY_INVALID');}catch{add('CONTEXT_INTEGRITY_INVALID');}
  }else add(errorCode(err));
 }
 let boundaryResult=null;
 if(validEnvelope){
  try{boundaryResult=boundary.run(e);}catch(err){add(errorCode(err));}
 }
 if(validEnvelope&&boundaryResult){
  for(const a of e.payload.assertions||[]){
   if(a.predicate==='attributedToProjectIdentity'&&eligibility.evaluate(e,a,true)!==eligibility.ELIGIBLE)add('ELIGIBILITY_INVALID');
  }
  try{
   const q=qualify(e);
   qualificationResultDigest=safeDigest(q);
   if(!p){
    if(e.qualificationVerificationStatus==='UNAVAILABLE')add('COMPLETENESS_INDETERMINATE');
    else add('COMPLETENESS_INVALID');
   }else{
    try{verify(e,e.payload,{id:RULES_ID,version:RULES_VERSION},p);}catch{add('COMPLETENESS_INVALID');}
   }
  }catch(err){add(errorCode(err)==='CORPUS_INVALID'?'CORPUS_INVALID':'QUALIFICATION_INVALID');}
  eligibilityResultDigest=safeDigest({admittedIds:boundaryResult.admittedIds,activeIds:boundaryResult.activeIds,eligibleIds:boundaryResult.eligibleIds,nonEligibleIds:boundaryResult.nonEligibleIds,transmittedIds:boundaryResult.transmittedIds,expectedGroups:boundaryResult.expectedGroups});
  resolutionResultDigest=safeDigest(boundaryResult);
  if(!r)add('RESOLUTION_MISMATCH');
  else{
   if(Array.isArray(r.transmittedIds)&&r.transmittedIds.some(id=>!has(boundaryResult.eligibleIds,id)))add('NON_ELIGIBLE_ASSERTION_TRANSMITTED');
   if(Array.isArray(r.engineResult?.decisions)){
    if(r.engineResult.decisions.length<boundaryResult.engineResult.decisions.length)add('MISSING_DECISION');
    if(r.engineResult.decisions.length>boundaryResult.engineResult.decisions.length)add('UNEXPECTED_DECISION');
   }
   try{boundary.verifyResult(e,r);}catch{add('RESOLUTION_MISMATCH');}
  }
 }
 const reasonCodes=[...reasons].sort(),acceptanceStatus=reasonCodes.some(x=>x!=='COMPLETENESS_INDETERMINATE')?STATUS.REJECTED:reasonCodes.length?STATUS.INDETERMINATE:STATUS.ACCEPTED;
 const b={...fields,qualificationResultDigest,eligibilityResultDigest,resolutionResultDigest,acceptanceStatus,reasonCodes};
 return Object.freeze({...b,acceptanceDigest:canonical.digest(b)});
}
function acceptDocumentarySnapshot(envelope){return acceptance(envelope);}
function verifyAcceptanceResult(envelope,result){if(!result||typeof result!=='object'||!Object.values(STATUS).includes(result.acceptanceStatus))return false;try{return canonical.canonicalJSON(acceptance(envelope))===canonical.canonicalJSON(result);}catch{return false;}}
module.exports={acceptDocumentarySnapshot,verifyAcceptanceResult,STATUS,CODES};
