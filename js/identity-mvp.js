/* Lot B vertical slice: canonical SBOM -> Maven -> archive -> Lot A evidence/assertion/decision. */
(function(root,factory){
 const node=typeof module==='object'&&module.exports;
 const api=factory(node?require('./identity-purl.js'):root.MayaIdentityPurl,node?require('./identity-decision.js'):root.MayaIdentityDecision,node?require('./enrichment-model.js'):root.MayaEnrichmentModel,node?require('./enrichment-canonical.js'):root.MayaEnrichmentCanonical);
 if(node)module.exports=api;else root.MayaIdentityMvp=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(purl,engine,lotA,canonical){
'use strict';
function interpretMaven(acquisition,identity,archiveId){
 let outcome='Unavailable';
 if(acquisition.transport==='ok'&&acquisition.status===404)outcome='NotFoundObserved';
 if(acquisition.transport==='ok'&&acquisition.status===200){
  const xml=acquisition.body;
  // Deliberately conservative: explicit project coordinates only; inherited/ambiguous POMs stay Unknown.
  if(typeof xml==='string'&&xml.length<1048576&&/<project(?:\s[^>]*)?>/.test(xml)){
   const top=xml.replace(/<parent\b[^>]*>[\s\S]*?<\/parent>/g,'').replace(/<dependencies\b[^>]*>[\s\S]*?<\/dependencies>/g,'').replace(/<dependencyManagement\b[^>]*>[\s\S]*?<\/dependencyManagement>/g,'');
   const value=tag=>{const matches=[...top.matchAll(new RegExp('<'+tag+'\\s*>\\s*([^<]+?)\\s*<\\/'+tag+'>','g'))];return matches.length===1?matches[0][1].trim():null;};
   if(value('groupId')===identity.namespace&&value('artifactId')===identity.name&&value('version')===identity.version)outcome='Found';
  }
 }
 return Object.freeze({scope:'Version',packageKey:identity.key,version:identity.version,outcome,archiveId,observedAt:acquisition.observedAt,providerId:acquisition.providerId});
}
async function resolveComponent({component,componentId,provider,archive,decidedAt}){
 if(!component||typeof componentId!=='string'||!componentId||typeof decidedAt!=='string'||Number.isNaN(Date.parse(decidedAt)))throw new Error('canonical component, componentId and explicit decidedAt required');
 const identity=purl.extractMavenPurl(component.purl);
 if(!identity)return Object.freeze({identity:null,observation:null,evidence:[],assertions:[],decisions:[],result:engine.decide({identity:null})});
 const acquisition=await provider.acquire(identity);
 const ref=await archive.store(acquisition);
 const archived=await archive.load(ref);
 const observation=interpretMaven(archived,identity,ref.id);
 const result=engine.decide({identity,observations:[observation]});
 const subjectId='identity-component:'+canonical.digest({componentId,packageKey:identity.key});
 const evidence={id:'identity-evidence:'+ref.sha256,sourceType:'registry',evidenceKind:'observed',sourceRef:archived.url,subjectType:'component',subjectId:componentId,attribute:'packageVersionObserved',observedValue:{packageKey:identity.key,version:identity.version,outcome:observation.outcome},sourceDigest:ref.sha256,sourcePath:null,versionScope:identity.version,independenceGroup:'maven-central',verificationMethod:'sha256-archive',verificationId:null,observedAt:archived.observedAt};
 lotA.validateEvidence(evidence);
 const assertion={id:'identity-assertion:'+canonical.digest({subjectId,observation}),subjectType:'componentEnrichment',subjectId,predicate:'packageVersionObserved',value:evidence.observedValue,evidenceIds:[evidence.id],status:'candidate',confidence:0,conflictIds:[],policyVersion:engine.POLICY_VERSION};
 lotA.validateAssertion(assertion);
 const relation={id:'identity-relation:'+canonical.digest({evidenceId:evidence.id,assertionId:assertion.id}),evidenceId:evidence.id,assertionId:assertion.id,relation:'supports',subjectId,predicate:assertion.predicate,valueDigest:canonical.digest(assertion.value)};
 lotA.validateRelation(relation);
 lotA.validateEvidenceScope(assertion,evidence,relation,[{id:subjectId,componentId}]);
 const decision={id:'identity-decision:'+result.inputDigest,subjectId,predicate:'packageVersionObserved',selectedAssertionId:result.status==='Resolved'?assertion.id:null,rejectedAssertionIds:result.status==='Resolved'?[]:[assertion.id],reasonCodes:[result.reason],evidenceIds:[evidence.id],conflictIds:[],engineVersion:'identity-mvp-v1',inputDigest:result.inputDigest,policyVersion:engine.POLICY_VERSION,decidedAt};
 lotA.validateDecision(decision);
 return Object.freeze({identity,observation,evidence:[evidence],assertions:[assertion],evidenceRelations:[relation],decisions:[decision],result});
}
return Object.freeze({resolveComponent,interpretMaven});
});
