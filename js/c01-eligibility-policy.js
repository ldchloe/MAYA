'use strict';
const {dispatch}=require('./c01-contract-dispatch.js');
const ELIGIBLE='ELIGIBLE',NOT_ELIGIBLE='NOT_ELIGIBLE';
function evaluate(envelope,assertion,active){
 dispatch(envelope);
 if(!assertion||typeof assertion.id!=='string')throw new Error('CONTRACT_ERROR');
 return active===true&&assertion.subjectType==='componentEnrichment'&&assertion.predicate==='mapsToProject'&&envelope.validationContext.eligibleAssertionIds.includes(assertion.id)?ELIGIBLE:NOT_ELIGIBLE;
}
module.exports={ELIGIBLE,NOT_ELIGIBLE,evaluate};
