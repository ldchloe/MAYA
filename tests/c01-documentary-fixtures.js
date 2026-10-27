'use strict';
const canonical=require('../js/enrichment-canonical.js');
const {payloadDigest,contextDigest,POLICY_ID}=require('../js/c01-contract-dispatch.js');
const now='2026-01-01T00:00:00Z';
function fixture({values=['alpha'],allowed=['a1'],scopes=[],predicate='mapsToProject'}={}){
 const assertions=values.map((value,i)=>({id:'a'+(i+1),subjectType:'componentEnrichment',subjectId:'ce1',predicate,value,evidenceIds:['e'+(i+1)],status:'unknown',confidence:.6,conflictIds:[],policyVersion:'1.0.0',...(scopes[i]?{versionScope:scopes[i]}:{})}));
 const evidence=values.map((value,i)=>({id:'e'+(i+1),sourceType:'fixture',evidenceKind:'declarative',sourceRef:'fixture.json',sourceDigest:null,subjectType:'component',subjectId:'component:1',attribute:predicate,observedValue:value,sourcePath:'$.components[0]',observedAt:now,versionScope:scopes[i]||null,verificationMethod:'fixture',independenceGroup:null}));
 const evidenceRelations=values.map((value,i)=>({id:'r'+(i+1),evidenceId:'e'+(i+1),assertionId:'a'+(i+1),relation:'supports',subjectId:'ce1',predicate,valueDigest:null}));
 const payload={assertions,evidence,evidenceRelations,verifications:[],conflicts:[],componentEnrichments:[{id:'ce1',componentId:'component:1'}]};
 const validationContext={contractDomain:'maya.lot-c.documentary',policyId:POLICY_ID,policyVersion:'1.0.0',eligibleAssertionIds:allowed};
 const envelope={contractDomain:'maya.lot-c.documentary',contractVersion:'1.0.0',artifactKind:'documentary-snapshot',snapshotId:'c01:i02',policyId:POLICY_ID,policyVersion:'1.0.0',payload,validationContext};
 return refresh(envelope);
}
function refresh(e){e.payloadDigest=payloadDigest(e.payload);e.validationContextDigest=contextDigest(e.validationContext);return e;}
function clone(x){return JSON.parse(canonical.canonicalJSON(x));}
module.exports={fixture,refresh,clone};
