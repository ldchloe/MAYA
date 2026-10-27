'use strict';
// H01 consumes verified A-G decisions. No network, no mutation, no legacy scoring changes.
const {digest,deterministicId}=require('./enrichment-canonical.js');
const defaultPolicy=require('../config/h01-risk-policy.json');
const geographicPolicy=require('../config/h01-geopolitical-policy.json');
const TYPES=Object.freeze([...defaultPolicy.dimensions]);
const {verifyTechnicalMetadata}=require('./d01-technical-metadata.js');
const {verifyGovernance}=require('./e01-governance.js');
const {verifyGeographicFacts}=require('./f01-geographic-facts.js');
const {verifyTrustEvents}=require('./g01-trust-events.js');
const isObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const round=x=>Math.round((x+Number.EPSILON)*100)/100;
const sortUnique=x=>[...new Set(x.filter(v=>typeof v==='string'&&v))].sort();
function regionForCountry(countryCode,geo=geographicPolicy){
 if(typeof countryCode!=='string'||!(/^[A-Z]{2}$/).test(countryCode))return 'UNKNOWN';
 for(const region of ['EU','EEA','EUROPE_NON_EU','NON_EU'])if(geo.regions[region].includes(countryCode))return region;
 return 'UNKNOWN';
}
function validatePolicy(policy){
 if(!isObj(policy)||typeof policy.version!=='string'||!policy.version||!Array.isArray(policy.dimensions)||JSON.stringify(policy.dimensions)!==JSON.stringify(TYPES)||!isObj(policy.weights)||!isObj(policy.riskRules)||!isObj(policy.confidenceThresholds))throw Error('INVALID_H01_POLICY');
 if(TYPES.some(t=>!Number.isFinite(policy.weights[t])||policy.weights[t]<=0)||Math.abs(TYPES.reduce((s,t)=>s+policy.weights[t],0)-100)>0.00001)throw Error('INVALID_H01_WEIGHTS');
 if(!(policy.confidenceThresholds.high>policy.confidenceThresholds.medium&&policy.confidenceThresholds.high<=100&&policy.confidenceThresholds.medium>=0))throw Error('INVALID_H01_CONFIDENCE');
}
function normalizeInput(x){
 if(x==null)return {status:'UNKNOWN'};
 if(!isObj(x))throw Error('INVALID_H01_FACT');
 const status=x.status||'UNKNOWN';
 if(!['VERIFIED','CONFLICTED','UNKNOWN','NOT_APPLICABLE'].includes(status))throw Error('INVALID_H01_STATUS');
 return {...x,status};
}
function evaluateFact(type,x,policy){
 const f=normalizeInput(x);
 const refs=sortUnique([f.decisionId,...(Array.isArray(f.decisionIds)?f.decisionIds:[])]);
 const evidenceIds=sortUnique([f.evidenceId,...(Array.isArray(f.evidenceIds)?f.evidenceIds:[])]);
 const reasons=[],factsUsed=[],rules=[];
 let status=f.status,riskScore=null;
 if(status==='VERIFIED'){
  if(f.riskScore!==undefined){if(!refs.length&&!evidenceIds.length)throw Error('UNSOURCED_H01_RISK');if(!Number.isInteger(f.riskScore)||f.riskScore<0||f.riskScore>5)throw Error('INVALID_H01_RISK_SCORE');riskScore=f.riskScore;reasons.push('EXPLICIT_VERIFIED_RISK_INPUT');rules.push('explicit-risk-input')}
  else if(type==='TECHNICAL_RISK'){
   if(f.licenseStatus==='CONFLICTED'){status='CONFLICTED';reasons.push('LICENSE_CONFLICT');rules.push('technical.licenseConflict')}
   else if(f.licenseStatus==='RESOLVED'){riskScore=policy.riskRules.technical.licenseResolved;reasons.push('DECLARED_LICENSE_RESOLVED');rules.push('technical.licenseResolved')}
  }else if(type==='GOVERNANCE_RISK'){
   if(f.governanceConflict){status='CONFLICTED';reasons.push('GOVERNANCE_CONFLICT')}
   else if(f.verifiedGovernance===true){riskScore=policy.riskRules.governance.verifiedGovernance;reasons.push('VERIFIED_GOVERNANCE_RELATION')}
  }else if(type==='SUPPLY_CHAIN_RISK'){
   const events=Array.isArray(f.events)?f.events:[];
   const admissible=events.filter(e=>isObj(e)&&e.status==='VERIFIED'&&!e.testOnly&&Array.isArray(e.evidenceIds)&&e.evidenceIds.length>0);
   if(admissible.length===events.length&&admissible.length){
    const scores=admissible.map(e=>policy.riskRules.supplyChain[e.eventType]).filter(Number.isFinite);
    if(scores.length===events.length){riskScore=Math.max(...scores);reasons.push(...sortUnique(admissible.map(e=>'EVENT_'+e.eventType)));rules.push('supplyChain.eventType');factsUsed.push(...admissible.map(e=>e.eventId).filter(Boolean))}
   }
  }else if(type==='CONCENTRATION_RISK'){
   if(Number.isInteger(f.denominator)&&f.denominator>0&&Number.isInteger(f.numerator)&&f.numerator>=0&&f.numerator<=f.denominator){
    const pct=100*f.numerator/f.denominator;
    if(f.percentage!==undefined&&Math.abs(f.percentage-pct)>0.00001)throw Error('INVALID_CONCENTRATION_PERCENTAGE');
    riskScore=policy.riskRules.concentration.thresholds.find(t=>pct>=t.min)?.risk??policy.riskRules.concentration.otherwise;
    reasons.push('VERIFIED_CONCENTRATION');rules.push('concentration.thresholds');factsUsed.push({numerator:f.numerator,denominator:f.denominator,percentage:round(pct)});
   }
  }else if(type==='GEOPOLITICAL_RISK'){
   if(f.relationship==='LEGAL_JURISDICTION'&&f.countryCode){
    const region=regionForCountry(f.countryCode);
    if(region!=='UNKNOWN'){riskScore=policy.riskRules.geopolitical[region];reasons.push('VERIFIED_LEGAL_JURISDICTION_'+region);rules.push('geopolitical.'+region);factsUsed.push({relationship:f.relationship,countryCode:f.countryCode,region})}
   }
  }else if(type==='CRITICALITY_RISK'){
   if(evidenceIds.length&&Object.hasOwn(policy.riskRules.criticality,f.level)){riskScore=policy.riskRules.criticality[f.level];reasons.push('EXPLICIT_CRITICALITY_'+f.level);rules.push('criticality.'+f.level)}
  }
  if(riskScore===null){status='UNKNOWN';reasons.push('INSUFFICIENT_VERIFIED_FACTS')}
 }else reasons.push(status==='CONFLICTED'?'CONFLICTING_FACTS':status==='NOT_APPLICABLE'?'NOT_APPLICABLE':'MISSING_VERIFIED_FACTS');
 return {type,status,riskScore,coverage:status==='VERIFIED'?100:status==='NOT_APPLICABLE'?null:0,factsUsed,decisionIds:refs,evidenceIds,policyRules:rules,reasonCodes:sortUnique(reasons)};
}
function fromVerifiedLots({subjectId,technical,governance,geographic,events,criticality}={}){
 if(typeof subjectId!=='string'||!subjectId)throw Error('INVALID_H01_SUBJECT');
 const out={subjectId,technical:{status:'UNKNOWN'},governance:{status:'UNKNOWN'},geographic:{status:'UNKNOWN'},events:{status:'UNKNOWN'},criticality:'UNKNOWN'};
 if(technical){
  if(!verifyTechnicalMetadata(technical))throw Error('UNVERIFIED_TECHNICAL_INPUT');
  const d=technical.decisions.license;
  out.technical={status:d.status==='CONFLICTED'?'CONFLICTED':d.status==='RESOLVED'?'VERIFIED':'UNKNOWN',licenseStatus:d.status,decisionId:d.id,evidenceIds:technical.evidence.map(e=>e.id)};
 }
 if(governance){
  if(!verifyGovernance(governance)||governance.projectIdentityId!==subjectId)throw Error('UNVERIFIED_GOVERNANCE_INPUT');
  const decisions=Object.values(governance.decisions),known=decisions.filter(d=>d.status==='VERIFIED'),conflict=decisions.some(d=>d.status==='CONFLICTED');
  out.governance={status:conflict?'CONFLICTED':known.length?'VERIFIED':'UNKNOWN',verifiedGovernance:known.length>0,governanceConflict:conflict,decisionIds:decisions.map(d=>d.id),evidenceIds:governance.evidence.map(e=>e.id)};
 }
 if(geographic){
  if(!verifyGeographicFacts(geographic)||geographic.projectIdentityId!==subjectId)throw Error('UNVERIFIED_GEOGRAPHIC_INPUT');
  const d=geographic.decisions.LEGAL_JURISDICTION;
  out.geographic={status:d.status,relationship:'LEGAL_JURISDICTION',countryCode:d.status==='VERIFIED'?d.countryCodes[0]:null,jurisdictionSubdivision:d.jurisdictionSubdivision,decisionId:d.id,evidenceIds:d.evidenceIds};
 }
 if(events){
  if(!verifyTrustEvents(events)||events.projectIdentityId!==subjectId)throw Error('UNVERIFIED_EVENT_INPUT');
  out.events={status:events.decision.status,events:events.events,decisionId:events.decision.id,evidenceIds:events.evidence.map(e=>e.id)};
 }
 if(criticality!=null){
  if(!isObj(criticality)||!['LOW','MEDIUM','HIGH','CRITICAL'].includes(criticality.level)||!criticality.evidenceId)throw Error('UNVERIFIED_CRITICALITY_INPUT');
  out.criticality={status:'VERIFIED',level:criticality.level,evidenceId:criticality.evidenceId};
 }
 return out;
}
function assessVerifiedProject(lots,policy=defaultPolicy){return assessTrust(fromVerifiedLots(lots),policy)}
function assessTrust(input,policy=defaultPolicy){
 validatePolicy(policy);
 if(!isObj(input)||typeof input.subjectId!=='string'||!input.subjectId)throw Error('INVALID_H01_SUBJECT');
 const source={
 TECHNICAL_RISK:input.technical,
 GOVERNANCE_RISK:input.governance,
 SUPPLY_CHAIN_RISK:input.events,
 CONCENTRATION_RISK:input.concentration,
 GEOPOLITICAL_RISK:input.geographic,
 CRITICALITY_RISK:input.criticality==='UNKNOWN'||input.criticality==null?{status:'UNKNOWN'}:typeof input.criticality==='string'?{status:'VERIFIED',level:input.criticality,evidenceId:input.criticalityEvidenceId}:input.criticality
 };
 const dimensions=TYPES.map(t=>evaluateFact(t,source[t],policy));
 const applicable=dimensions.filter(d=>d.status!=='NOT_APPLICABLE');
 const coverageDenominator=applicable.reduce((s,d)=>s+policy.weights[d.type],0);
 const covered=dimensions.filter(d=>d.status==='VERIFIED');
 const coverageNumerator=covered.reduce((s,d)=>s+policy.weights[d.type],0);
 const evidenceCoverage=coverageDenominator?round(100*coverageNumerator/coverageDenominator):null;
 const confidence=evidenceCoverage===null?'UNKNOWN':evidenceCoverage>=policy.confidenceThresholds.high?'HIGH':evidenceCoverage>=policy.confidenceThresholds.medium?'MEDIUM':'LOW';
 const penalties=covered.map(d=>({type:d.type,weight:policy.weights[d.type],riskScore:d.riskScore,penalty:round(policy.weights[d.type]*d.riskScore/5),ruleIds:d.policyRules}));
 const trustScore=covered.length?round(Math.max(0,Math.min(100,100-penalties.reduce((s,p)=>s+p.penalty,0)))):null;
 const inputDecisionIds=sortUnique(dimensions.flatMap(d=>d.decisionIds));
 const evidenceIds=sortUnique(dimensions.flatMap(d=>d.evidenceIds));
 const inputDigest=digest(input);
 const reasonCodes=sortUnique(dimensions.flatMap(d=>d.reasonCodes).concat(covered.length?[]:['NO_SCORABLE_VERIFIED_FACTS']));
 const core={subjectId:input.subjectId,dimensions:dimensions.map(d=>({...d,scoreContribution:penalties.find(p=>p.type===d.type)?.penalty??null})),trustScore,evidenceCoverage,confidence,reasonCodes,inputDecisionIds,evidenceIds,policyVersion:policy.version,engineVersion:policy.engineVersion,inputDigest,policyDigest:digest(policy),geoPolicyVersion:geographicPolicy.version,geoPolicyDigest:digest(geographicPolicy),scoreBreakdown:{base:100,penalties,formula:policy.scoreFormula},coverageBreakdown:{coveredWeight:coverageNumerator,applicableWeight:coverageDenominator,formula:policy.coverageFormula}};
 return {assessmentId:deterministicId('trust-assessment',core),...core,resultDigest:digest(core)};
}
function metric(count,total,unknownCount=0){return {count,total,percentage:total?round(count*100/total):null,unknownCount}}
function assessSbom(inputs,policy=defaultPolicy){
 if(!Array.isArray(inputs)||inputs.some(x=>!isObj(x)||!x.subjectId))throw Error('INVALID_SBOM_ASSESSMENTS');
 const ordered=[...inputs].sort((a,b)=>a.subjectId.localeCompare(b.subjectId));
 if(new Set(ordered.map(x=>x.subjectId)).size!==ordered.length)throw Error('DUPLICATE_SUBJECT');
 const componentAssessments=ordered.map(x=>assessTrust(x,policy));
 const scored=componentAssessments.filter(x=>x.trustScore!==null);
 const covered=componentAssessments.filter(x=>x.evidenceCoverage!==null);
 const overallTrustScore=scored.length?round(scored.reduce((s,x)=>s+x.trustScore,0)/scored.length):null;
 const overallCoverage=covered.length?round(covered.reduce((s,x)=>s+x.evidenceCoverage,0)/covered.length):null;
 const dimensions=TYPES.map(type=>({type,knownCount:componentAssessments.filter(a=>a.dimensions.find(d=>d.type===type)?.status==='VERIFIED').length,unknownCount:componentAssessments.filter(a=>a.dimensions.find(d=>d.type===type)?.status==='UNKNOWN').length}));
 const concentration={};
 for(const [name,key] of [['sameOrganization','organization'],['sameFoundation','foundation'],['sameMaintainer','maintainer'],['sameNamespace','namespace'],['sameLegalJurisdiction','legalJurisdiction']]){
  const values=ordered.map(x=>typeof x[key]==='string'&&x[key]?x[key]:null);
  const counts=new Map();for(const v of values)if(v)counts.set(v,(counts.get(v)||0)+1);
  const ranked=[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  concentration[name]={...metric(ranked[0]?.[1]||0,ordered.length,values.filter(v=>!v).length),value:ranked[0]?.[0]||null,population:'all input components'};
 }
 concentration.unknownGovernance=metric(ordered.filter(x=>!x.organization&&!x.foundation&&!x.maintainer).length,ordered.length);
 concentration.unknownJurisdiction=metric(ordered.filter(x=>!x.legalJurisdiction).length,ordered.length);
 const regionCounts={EU:0,EEA:0,EUROPE_NON_EU:0,NON_EU:0,UNKNOWN:0};
 for(const x of ordered){
  const geo=normalizeInput(x.geographic);
  const region=geo.status==='VERIFIED'&&geo.relationship==='LEGAL_JURISDICTION'?regionForCountry(geo.countryCode):'UNKNOWN';
  regionCounts[region]++;
 }
 const geopoliticalExposure=Object.fromEntries(Object.entries(regionCounts).map(([k,v])=>[k,metric(v,ordered.length)]));
 const criticalDependencies=ordered.filter(x=>['HIGH','CRITICAL'].includes(typeof x.criticality==='string'?x.criticality:x.criticality?.level)&&x.criticalityEvidenceId).map(x=>({subjectId:x.subjectId,criticality:typeof x.criticality==='string'?x.criticality:x.criticality.level,evidenceId:x.criticalityEvidenceId}));
 const recentTrustEvents=ordered.flatMap(x=>Array.isArray(x.events?.events)?x.events.events.filter(e=>e.status==='VERIFIED'&&!e.testOnly).map(e=>({subjectId:x.subjectId,eventId:e.eventId,eventType:e.eventType,effectiveAt:e.effectiveAt})):[]).sort((a,b)=>String(b.effectiveAt).localeCompare(String(a.effectiveAt))||String(a.eventId).localeCompare(String(b.eventId)));
 const topRiskDrivers=componentAssessments.flatMap(a=>a.scoreBreakdown.penalties.filter(p=>p.penalty>0).map(p=>({subjectId:a.subjectId,...p}))).sort((a,b)=>b.penalty-a.penalty||a.subjectId.localeCompare(b.subjectId)||a.type.localeCompare(b.type));
 const unknownDataWarnings=componentAssessments.filter(a=>a.evidenceCoverage===null||a.evidenceCoverage<100).map(a=>({subjectId:a.subjectId,coverage:a.evidenceCoverage,unknownDimensions:a.dimensions.filter(d=>d.status==='UNKNOWN'||d.status==='CONFLICTED').map(d=>d.type)}));
 const supplyChainAlerts=recentTrustEvents.filter(e=>['COMPROMISE','SUPPLY_CHAIN_INCIDENT'].includes(e.eventType));
 const executiveSummary={overallTrustScore,overallCoverage,assessedComponents:ordered.length,scoredComponents:scored.length,unknownComponents:componentAssessments.length-scored.length,topRisks:topRiskDrivers.slice(0,10),topUnknowns:unknownDataWarnings.slice(0,10),criticalDependencies,governanceConcentration:concentration,geopoliticalExposure,supplyChainAlerts,componentBreakdown:componentAssessments.map(a=>({subjectId:a.subjectId,trustScore:a.trustScore,evidenceCoverage:a.evidenceCoverage,confidence:a.confidence}))};
 const core={overallTrustScore,overallCoverage,componentAssessments,dimensions,topRiskDrivers,governanceConcentration:concentration,geopoliticalExposure,criticalDependencies,recentTrustEvents,unknownDataWarnings,executiveSummary,policyVersion:policy.version};
 return {...core,resultDigest:digest(core)};
}
module.exports={assessTrust,assessSbom,assessVerifiedProject,fromVerifiedLots,regionForCountry,TYPES};
