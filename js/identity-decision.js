/* Pure Lot B decision engine. No I/O, clock, Maven XML or confidence score. */
(function(root,factory){const canonical=typeof module==='object'&&module.exports?require('./enrichment-canonical.js'):root.MayaEnrichmentCanonical;const api=factory(canonical);if(typeof module==='object'&&module.exports)module.exports=api;else root.MayaIdentityDecision=api;})(typeof globalThis!=='undefined'?globalThis:this,function(canonical){
'use strict';
const POLICY_VERSION='identity-maven-v1';
function decide({identity,observations=[],policyVersion=POLICY_VERSION}){
 if(policyVersion!==POLICY_VERSION)throw new Error('unsupported identity policy');
 const applicable=observations.filter(x=>identity&&x.packageKey===identity.key&&x.version===identity.version);
 const ordered=[...applicable].sort((a,b)=>canonical.canonicalJSON(a).localeCompare(canonical.canonicalJSON(b)));
 const found=ordered.some(x=>x.scope==='Version'&&x.outcome==='Found');
 const absent=ordered.some(x=>x.scope==='Version'&&x.outcome==='NotFoundObserved');
 const conflict=found&&absent&&new Set(ordered.filter(x=>x.scope==='Version'&&(x.outcome==='Found'||x.outcome==='NotFoundObserved')).map(x=>x.observedAt)).size===1;
 const status=conflict?'Conflicted':found?'Resolved':'Unknown';
 const reason=conflict?'CONFLICTING_VERSION_OBSERVATIONS':found?'VERSION_OBSERVED':absent?'VERSION_NOT_FOUND_OBSERVED':'INSUFFICIENT_OBSERVATIONS';
 const digest=canonical.digest({identity:identity?{key:identity.key,version:identity.version}:null,observations:ordered,policyVersion});
 return Object.freeze({status,reason,policyVersion,inputDigest:digest,observationIds:[...new Set(ordered.map(x=>x.archiveId))].sort()});
}
return Object.freeze({POLICY_VERSION,decide});
});
