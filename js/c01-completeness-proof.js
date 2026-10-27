'use strict';
const canonical=require('./enrichment-canonical.js');
const {dispatch,fail,payloadDigest}=require('./c01-contract-dispatch.js');
const {RULES_ID,RULES_VERSION}=require('./c01-documentary-qualification.js');
function createProof(envelope,qualification){
 dispatch(envelope);
 if(!qualification||qualification.corpusDigest!==payloadDigest(envelope.payload)||qualification.qualificationRulesId!==RULES_ID||qualification.qualificationRulesVersion!==RULES_VERSION)fail('QUALIFICATION_PROOF_ERROR');
 const base={contractDomain:envelope.contractDomain,contractVersion:envelope.contractVersion,corpusDigest:qualification.corpusDigest,qualificationRulesId:RULES_ID,qualificationRulesVersion:RULES_VERSION,examinedAssertionIds:[...qualification.examinedAssertionIds].sort(),comparisonClasses:qualification.comparisonClasses.map(x=>({...x,assertionIds:[...x.assertionIds].sort()})).sort((a,b)=>a.id.localeCompare(b.id)),examinations:qualification.examinations.map(x=>({...x,assertionIds:[...x.assertionIds].sort(),conflictIds:[...x.conflictIds].sort()})).sort((a,b)=>a.id.localeCompare(b.id)),conflictIds:qualification.conflicts.map(x=>x.id).sort(),exclusions:[]};
 return {...base,resultDigest:canonical.digest(base)};
}
module.exports={createProof};
