'use strict';
const canonical=require('./enrichment-canonical.js');
const DOMAIN='maya.lot-c.documentary',VERSION='1.0.0',KIND='documentary-snapshot',POLICY_ID='maya.c01.eligibility-fixture',POLICY_VERSION='1.0.0';
function fail(code){const e=new Error(code);e.code=code;throw e;}
function dispatch(e){
 if(!e||!e.contractDomain)fail('MISSING_CONTRACT_DOMAIN');
 if(e.contractDomain!==DOMAIN)fail('UNKNOWN_CONTRACT_DOMAIN');
 if(e.contractVersion!==VERSION)fail('UNSUPPORTED_CONTRACT_VERSION');
 if(e.artifactKind!==KIND||typeof e.snapshotId!=='string'||!e.snapshotId)fail('CONTRACT_ERROR');
 if(e.policyId!==POLICY_ID)fail('POLICY_DOMAIN_MISMATCH');
 if(e.policyVersion!==POLICY_VERSION)fail('UNSUPPORTED_POLICY_VERSION');
 if(!e.validationContext||typeof e.validationContext!=='object'||Array.isArray(e.validationContext))fail('CONTRACT_ERROR');
 const c=e.validationContext;
 if(c.contractDomain!==DOMAIN)fail('CONTRACT_DOMAIN_MISMATCH');
 if(c.policyId!==POLICY_ID)fail('POLICY_DOMAIN_MISMATCH');
 if(c.policyVersion!==POLICY_VERSION)fail('UNSUPPORTED_POLICY_VERSION');
 if(!Array.isArray(c.eligibleAssertionIds)||c.eligibleAssertionIds.some(x=>typeof x!=='string'||!x)||new Set(c.eligibleAssertionIds).size!==c.eligibleAssertionIds.length)fail('CONTRACT_ERROR');
 if(!e.payload||typeof e.payload!=='object')fail('CONTRACT_ERROR');
 if(e.payloadDigest!==canonical.digest(e.payload)||e.validationContextDigest!==canonical.digest(c))fail('INTEGRITY_ERROR');
 return Object.freeze({contractDomain:DOMAIN,contractVersion:VERSION,policyId:POLICY_ID,policyVersion:POLICY_VERSION});
}
module.exports={DOMAIN,VERSION,KIND,POLICY_ID,POLICY_VERSION,dispatch,fail};
