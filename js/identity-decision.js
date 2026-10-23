/* Pure Lot B observation decision: no I/O, clock, Maven XML or risk score. */
(function(root,factory){const canonical=typeof module==='object'&&module.exports?require('./enrichment-canonical.js'):root.MayaEnrichmentCanonical;const api=factory(canonical);if(typeof module==='object'&&module.exports)module.exports=api;else root.MayaIdentityDecision=api;})(typeof globalThis!=='undefined'?globalThis:this,function(canonical){
'use strict';
const POLICY_VERSION='identity-maven-v2';
const OUTCOMES=['Found','NotFoundObserved','NetworkError','Timeout','RateLimited','AuthenticationError','ProviderUnavailable','InvalidResponse','ArchiveFailure','InternalError'];
function decide({identity,observations=[],policyVersion=POLICY_VERSION}){
 if(policyVersion!==POLICY_VERSION)throw new Error('unsupported identity policy');
 if(!Array.isArray(observations))throw new Error('observations must be an array');
 const unique=new Map();
 for(const x of observations){
  if(!x||!['Package','Version'].includes(x.scope)||!OUTCOMES.includes(x.outcome)||typeof x.packageKey!=='string'||typeof x.archiveId!=='string'||!x.archiveId)throw new Error('invalid provider observation');
  if(x.scope==='Version'&&(typeof x.version!=='string'||!x.version))throw new Error('version observation requires version');
  if(!identity||x.packageKey!==identity.key||(x.scope==='Version'&&x.version!==identity.version))continue;
  const key=canonical.canonicalJSON(x);
  unique.set(key,x);
 }
 const ordered=[...unique.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(x=>x[1]);
 const facts=ordered.filter(x=>x.outcome==='Found'||x.outcome==='NotFoundObserved');
 const version=facts.filter(x=>x.scope==='Version');
 const packageFacts=facts.filter(x=>x.scope==='Package');
 const found=version.some(x=>x.outcome==='Found');
 const absent=version.some(x=>x.outcome==='NotFoundObserved');
 const packageAbsent=packageFacts.some(x=>x.outcome==='NotFoundObserved');
 const packageFound=packageFacts.some(x=>x.outcome==='Found');
 const conflict=(found&&absent)||(packageFound&&packageAbsent);
 const status=conflict?'Conflicted':found?'Resolved':'Unknown';
 const reason=conflict?'CONFLICTING_OBSERVATIONS':found?'VERSION_OBSERVED':absent?'VERSION_NOT_FOUND_OBSERVED':packageAbsent?'PACKAGE_NOT_FOUND_OBSERVED':'INSUFFICIENT_OBSERVATIONS';
 const inputDigest=canonical.digest({identity:identity?{key:identity.key,version:identity.version}:null,observations:ordered,policyVersion});
 return Object.freeze({status,reason,policyVersion,inputDigest,observationIds:[...new Set(ordered.map(x=>x.archiveId))].sort()});
}
return Object.freeze({POLICY_VERSION,OUTCOMES,decide});
});