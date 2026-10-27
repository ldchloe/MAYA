'use strict';
const crypto=require('node:crypto');
const POLICY_ID='maya.c01.bridge-authority',POLICY_VERSION='1.0.0';
const sha=x=>crypto.createHash('sha256').update(Buffer.from(x,'utf8')).digest('hex');
const fields=['sourceType','verificationMethod','verificationId','sourceRef','sourceDigest','predicate','packageIdentityId','externalIdentityId','projectIdentityId','versionScope'];
function evaluate(evidence,claim,rules=[]){
 if(!evidence||!claim||!Array.isArray(rules))throw Error('BRIDGE_AUTHORITY_CONTRACT_ERROR');
 if(typeof evidence.content!=='string'||!/^[a-f0-9]{64}$/.test(evidence.sourceDigest)||sha(evidence.content)!==evidence.sourceDigest)throw Error('BRIDGE_AUTHORITY_INTEGRITY_ERROR');
 if(!rules.every(r=>r&&typeof r.id==='string'&&r.version===POLICY_VERSION&&fields.every(k=>typeof r[k]==='string'&&r[k].length>0)))throw Error('BRIDGE_AUTHORITY_RULE_ERROR');
 if(new Set(rules.map(r=>r.id)).size!==rules.length)throw Error('BRIDGE_AUTHORITY_DUPLICATE_RULE');
 const observation=JSON.parse(evidence.content);
 if(observation.predicate!==claim.predicate||observation.packageIdentityId!==claim.packageIdentityId||observation.externalIdentityId!==claim.externalIdentityId||observation.projectIdentityId!==claim.projectIdentityId)throw Error('BRIDGE_AUTHORITY_CLAIM_MISMATCH');
 const applicable=rules.some(r=>r.sourceType===evidence.sourceType&&r.verificationMethod===evidence.verificationMethod&&r.verificationId===evidence.verificationId&&r.sourceRef===evidence.sourceRef&&r.sourceDigest===evidence.sourceDigest&&r.predicate===claim.predicate&&r.packageIdentityId===claim.packageIdentityId&&r.externalIdentityId===claim.externalIdentityId&&r.projectIdentityId===claim.projectIdentityId&&r.versionScope===evidence.versionScope);
 return applicable?'APPLICABLE':'NOT_APPLICABLE';
}
module.exports={POLICY_ID,POLICY_VERSION,evaluate};
