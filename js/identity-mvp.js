/* Lot B: Maven observations -> archived Evidence -> Lot A Assertion/Decision. */
(function(root,factory){
 const node=typeof module==='object'&&module.exports;
 const api=factory(node?require('./identity-purl.js'):root.MayaIdentityPurl,node?require('./identity-decision.js'):root.MayaIdentityDecision,node?require('./enrichment-model.js'):root.MayaEnrichmentModel,node?require('./enrichment-canonical.js'):root.MayaEnrichmentCanonical,node?require('./enrichment-resolution.js'):root.MayaEnrichmentResolution);
 if(node)module.exports=api;else root.MayaIdentityMvp=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(purl,engine,lotA,canonical,resolution){
'use strict';
function interpretMaven(acquisition,identity,archiveId){
 if(!acquisition||!identity||typeof archiveId!=='string')throw new Error('invalid Maven interpretation input');
 const scope=acquisition.scope||'Version';
 if(!['Package','Version'].includes(scope))throw new Error('invalid Maven observation scope');
 if(acquisition.query.namespace!==identity.namespace||acquisition.query.name!==identity.name||(scope==='Version'&&acquisition.query.version!==identity.version))throw new Error('acquisition coordinate mismatch');
 let outcome='InvalidResponse';
 const failures={Timeout:'Timeout',NetworkError:'NetworkError',RateLimited:'RateLimited',AuthenticationError:'AuthenticationError',ProviderUnavailable:'ProviderUnavailable',InvalidResponse:'InvalidResponse',Unavailable:'ProviderUnavailable'};
 if(acquisition.transport!=='ok')outcome=failures[acquisition.transport]||'InternalError';
 else if(acquisition.status===404)outcome='NotFoundObserved';
 else if(acquisition.status===200){
  const xml=acquisition.body;
  if(typeof xml==='string'&&xml.length<=1048576&&!/<!DOCTYPE|<!ENTITY/i.test(xml)){
   if(scope==='Package'){
    if(/<metadata(?:\s[^>]*)?>/.test(xml)&&new RegExp('<groupId>\\s*'+identity.namespace.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*<\\/groupId>').test(xml)&&new RegExp('<artifactId>\\s*'+identity.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*<\\/artifactId>').test(xml))outcome='Found';
   }else if(/<project(?:\s[^>]*)?>/.test(xml)){
    // Conservative: inherited or ambiguous coordinates are not positive proof.
    const top=xml.replace(/<parent\b[^>]*>[\s\S]*?<\/parent>/g,'').replace(/<dependencies\b[^>]*>[\s\S]*?<\/dependencies>/g,'').replace(/<dependencyManagement\b[^>]*>[\s\S]*?<\/dependencyManagement>/g,'');
    const value=tag=>{const matches=[...top.matchAll(new RegExp('<'+tag+'\\s*>\\s*([^<]+?)\\s*<\\/'+tag+'>','g'))];return matches.length===1?matches[0][1].trim():null;};
    if(value('groupId')===identity.namespace&&value('artifactId')===identity.name&&value('version')===identity.version)outcome='Found';
   }
  }
 }
 return Object.freeze({scope,packageKey:identity.key,version:scope==='Version'?identity.version:null,outcome,archiveId,observedAt:acquisition.observedAt,providerId:acquisition.providerId});
}
function validateInput(component,componentId,decidedAt){
 if(!component||typeof componentId!=='string'||!componentId||typeof decidedAt!=='string'||Number.isNaN(Date.parse(decidedAt)))throw new Error('canonical component, componentId and explicit decidedAt required');
}
async function resolveArchived({component,componentId,archive,archiveRefs,decidedAt}){
 validateInput(component,componentId,decidedAt);
 if(!archive||typeof archive.load!=='function'||!Array.isArray(archiveRefs))throw new Error('archive and archiveRefs required');
 const identity=purl.extractMavenPurl(component.purl);
 if(!identity)return Object.freeze({identity:null,observation:null,observations:[],evidence:[],assertions:[],evidenceRelations:[],verifications:[],conflicts:[],decisions:[],result:engine.decide({identity:null})});
 const subjectId='identity-component:'+canonical.digest({componentId,packageKey:identity.key});
 const observations=[],evidence=[],assertions=[],evidenceRelations=[],verifications=[];
 const seen=new Set();
 for(const ref of archiveRefs){
  const archived=await archive.load(ref);
  const observation=interpretMaven(archived,identity,ref.id);
  if(seen.has(ref.id))continue;
  seen.add(ref.id);observations.push(observation);
  if(!['Found','NotFoundObserved'].includes(observation.outcome))continue;
  const sourceContent=canonical.canonicalJSON(archived),sourceDigest=canonical.sha256Text(sourceContent);
  const evidenceId='identity-evidence:'+canonical.digest({archiveId:ref.id,subjectId});
  const verificationId='identity-verification:'+canonical.digest({evidenceId,sourceDigest});
  const verification={id:verificationId,evidenceId,verificationMethod:'sha256-content-match',verifierId:'MAYA-local-sha256',verifierVersion:'1.0.0',verifiedAt:decidedAt,result:'passed',sourceContent,sourceDigest,verificationArtifactDigest:canonical.digest({evidenceId,sourceDigest,method:'sha256-content-match',verifierId:'MAYA-local-sha256',verifierVersion:'1.0.0',result:'passed'})};
  const value={packageKey:identity.key,scope:observation.scope,version:observation.version,outcome:observation.outcome};
  const predicate='packagePublicationObservation';
  const claim={id:'identity-assertion:'+canonical.digest({subjectId,value,archiveId:ref.id}),subjectType:'componentEnrichment',subjectId,predicate,value,evidenceIds:[evidenceId],status:'unknown',confidence:0,conflictIds:[],policyVersion:resolution.POLICY_VERSION};
  const proof={id:evidenceId,sourceType:'registry',evidenceKind:'verified',sourceRef:archived.url+'#'+ref.id,subjectType:'component',subjectId:componentId,attribute:predicate,observedValue:value,sourceDigest,sourcePath:null,versionScope:observation.version,independenceGroup:archived.providerId,verificationMethod:'sha256-content-match',verificationId,observedAt:archived.observedAt};
  const link={id:'identity-relation:'+canonical.digest({evidenceId,assertionId:claim.id}),evidenceId,assertionId:claim.id,relation:'supports',subjectId,predicate,valueDigest:canonical.digest(value)};
  lotA.validateEvidence(proof);lotA.validateVerification(verification);lotA.validateRelation(link);lotA.validateEvidenceScope(claim,proof,link,[{id:subjectId,componentId}]);
  evidence.push(proof);verifications.push(verification);assertions.push(claim);evidenceRelations.push(link);
 }
 const classification=engine.decide({identity,observations});
 if(!assertions.length)return Object.freeze({identity,observation:observations[0]||null,observations,evidence,assertions,evidenceRelations,verifications,conflicts:[],decisions:[],result:classification});
 // Confidence and decisions belong to the existing deterministic Lot A policy.
 const computed=resolution.resolve(assertions,evidence,evidenceRelations,{verifications,decidedAt,componentEnrichments:[{id:subjectId,componentId}]});
 const conflicts=computed.conflicts;
 const complete=assertions.map(a=>{
  const confidence=computed.evaluations[a.id].confidence;
  const status=conflicts.length?'conflicted':confidence>=.95?'verified':'unknown';
  return Object.freeze({...a,confidence,status,conflictIds:conflicts.map(x=>x.id)});
 });
 for(const a of complete)lotA.validateAssertion(a);
 for(const d of computed.decisions)lotA.validateDecision(d);
 const hasSelected=computed.decisions.some(d=>d.selectedAssertionId!==null);
 const status=conflicts.length?'Conflicted':classification.status==='Resolved'&&hasSelected?'Resolved':'Unknown';
 const result=Object.freeze({...classification,status,reason:conflicts.length?'CONFLICTING_OBSERVATIONS':classification.reason});
 return Object.freeze({identity,observation:observations[0]||null,observations,evidence,assertions:complete,evidenceRelations,verifications,conflicts,decisions:computed.decisions,result});
}
async function resolveComponent({component,componentId,provider,archive,decidedAt}){
 validateInput(component,componentId,decidedAt);
 const identity=purl.extractMavenPurl(component.purl);
 if(!identity)return resolveArchived({component,componentId,archive,archiveRefs:[],decidedAt});
 if(!provider||typeof provider.acquire!=='function'||!archive||typeof archive.store!=='function')throw new Error('provider and archive required');
 const acquisition=await provider.acquire(identity);
 // Archive failure is fatal; never produce a purportedly verifiable decision.
 const ref=await archive.store(acquisition);
 return resolveArchived({component,componentId,archive,archiveRefs:[ref],decidedAt});
}
return Object.freeze({resolveComponent,resolveArchived,interpretMaven});
});