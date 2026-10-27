'use strict';
// Offline product coordinator: imported source -> verified Lot B/C/D/E/F/G -> H01. No risk math.
const fs=require('node:fs'),path=require('node:path');
const {importCycloneDxJson}=require('./cyclonedx-json.js');
const {normalizeMavenComponent}=require('./identity-purl.js');
const {resolveTechnicalMetadata}=require('./d01-technical-metadata.js');
const {resolveGovernance}=require('./e01-governance.js');
const {resolveGeographicFacts}=require('./f01-geographic-facts.js');
const {resolveTrustEvents}=require('./g01-trust-events.js');
const {issue}=require('./c01-approved-bridge-rule.js');
const {assessSbom,fromVerifiedLots}=require('./h01-trust-analysis.js');
const registry=require('./c01-corpus-registry.js');
const {digest}=require('./enrichment-canonical.js');
const junit='project:3b8b92fd783639e12f59ff6256967b246edd5249343217fb6d669a6ce688ff8e';
const approved=[{packageIdentityId:'maven:junit:junit:4.13.2',projectIdentityId:junit},...registry.approved.map(x=>({packageIdentityId:x.packageIdentityId,projectIdentityId:x.projectIdentityId}))];
const log4j=registry.approved.find(x=>x.contractDomain==='C01-I06').projectIdentityId;
function governanceClaims(id){
 if(id!==log4j)return [];
 return [
 {projectIdentityId:id,predicate:'governedByFoundation',object:'Apache Software Foundation',source:{archivePath:'fixtures/e01/apache/apache-logging-guidelines.html',sourceUrl:'https://logging.apache.org/guidelines.html',selector:'Logging Services is a <em>project</em> of the <a href="https://apache.org">Apache Software Foundation</a> (ASF) and composed of several <em>subprojects</em>; Log4cxx, Log4j',observedAt:'2026-10-27T13:49:41.385Z'}},
 {projectIdentityId:id,predicate:'maintainedBy',object:'Apache Logging Project Management Committee',source:{archivePath:'fixtures/e01/apache/apache-log4j-guidelines.html',sourceUrl:'https://logging.apache.org/log4j/2.3.x/guidelines.html',selector:'Apache Logging Project Management Committee</b></dt>\n        \n<dd>The group of volunteers who are responsible for managing the Apache',observedAt:'2026-10-27T13:49:41.505Z'}}
 ];
}
function geographicClaims(id){
 if(id!==log4j)return [];
 const meta=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../fixtures/f01/asf/corporation.metadata.json'),'utf8'));
 return [{subject:'Apache Software Foundation',relationship:'LEGAL_JURISDICTION',countryCode:'US',countryObserved:'United States',jurisdictionSubdivision:'Delaware',source:{archivePath:'fixtures/f01/asf/corporation.html',sourceUrl:meta.finalUrl,selector:'The ASF is a Delaware membership corporation',acquiredAt:meta.acquiredAt,archiveSha256:meta.sha256}}];
}
function eventClaims(id){
 if(id!==junit)return [];
 return ['r4.13.1','r4.13.2'].map(tag=>{
  const base=path.resolve(__dirname,'../fixtures/g01/junit');
  const meta=JSON.parse(fs.readFileSync(path.join(base,tag+'.metadata.json'),'utf8'));
  const body=JSON.parse(fs.readFileSync(path.join(base,tag+'.json'),'utf8'));
  return {eventType:'RELEASE',subject:id,after:tag,effectiveAt:body.published_at,source:{archiveSha256:meta.sha256,archiveId:meta.archiveId,acquiredAt:meta.acquiredAt}};
 });
}
function detectFormat(text,fileName){
 const s=String(text).replace(/^\uFEFF/,'').trimStart();
 if(s.startsWith('<'))throw Error('UNSUPPORTED_SBOM_FORMAT: XML ingestion adapter is not present in this repository');
 if(!s.startsWith('{'))throw Error('INVALID_SBOM: expected JSON document');
 let raw;try{raw=JSON.parse(s)}catch(e){throw Error('INVALID_SBOM: '+e.message)}
 if(raw.bomFormat==='CycloneDX')return 'cyclonedx-json';
 if(raw.spdxVersion)throw Error('UNSUPPORTED_SBOM_FORMAT: SPDX JSON ingestion adapter is not present');
 throw Error('UNSUPPORTED_SBOM_FORMAT: no supported CycloneDX JSON root');
}
function analyzeSbom(input,{fileName='input.json',mode='offline'}={}){
 if(!['offline','online'].includes(mode))throw Error('INVALID_ANALYSIS_MODE');
 const text=Buffer.isBuffer(input)?input.toString('utf8'):input;
 if(typeof text!=='string')throw Error('INVALID_SBOM: expected UTF-8 text');
 const format=detectFormat(text,fileName);
 const imported=importCycloneDxJson(text,fileName);
 if(!imported.document||imported.report.status==='failed')throw Error('INVALID_SBOM: '+JSON.stringify(imported.report.errors));
 const canonical=imported.document,components=canonical.components.filter(c=>!c.isRoot).sort((a,b)=>a.id.localeCompare(b.id));
 const inputs=[],enrichments=[],diagnostics={componentsTotal:components.length,componentsResolved:0,componentsUnknown:0,componentsConflicted:0,packagesResolved:0,projectsResolved:0,governanceCoverage:0,geographicCoverage:0,assessmentCoverage:0,errors:[],warnings:[...imported.report.warnings]};
 for(const component of components){
  const normalized=normalizeMavenComponent(component);
  const packageId=normalized.identity&&normalized.version?'maven:'+normalized.identity.namespace+':'+normalized.identity.name+':'+normalized.version:null;
  if(packageId&&['valid','reconstructed'].includes(normalized.status))diagnostics.packagesResolved++;
  const entry=approved.find(x=>x.packageIdentityId===packageId);
  const claim=entry?{packageIdentityId:packageId,externalIdentityId:packageId,projectIdentityId:entry.projectIdentityId,predicate:'attributedToProjectIdentity'}:null;
  const bridge=claim?issue(claim):null;
  const projectId=bridge?.status==='APPROVED_BRIDGE_RULE_ISSUED'?entry.projectIdentityId:null;
  if(projectId)diagnostics.projectsResolved++;
  const technical=resolveTechnicalMetadata(canonical,component.id);
  const governance=projectId?resolveGovernance({projectIdentityId:projectId,claims:governanceClaims(projectId)}):null;
  const geographic=projectId?resolveGeographicFacts({projectIdentityId:projectId,claims:geographicClaims(projectId)}):null;
  const events=projectId?resolveTrustEvents({projectIdentityId:projectId,claims:eventClaims(projectId)}):null;
  const subjectId=component.id;
  const mapped=fromVerifiedLots({subjectId:projectId||subjectId,technical,governance,geographic,events});
  // The component occurrence remains the unique portfolio subject; project identity is a verified relation, not a replacement.
  mapped.subjectId=subjectId;
  const relation=governance?.decisions||{};
  const organization=relation.attributedToOrganization?.status==='VERIFIED'?relation.attributedToOrganization.objects[0]:null;
  const foundation=relation.governedByFoundation?.status==='VERIFIED'?relation.governedByFoundation.objects[0]:null;
  const maintainer=relation.maintainedBy?.status==='VERIFIED'?relation.maintainedBy.objects[0]:null;
  const jurisdiction=geographic?.decisions.LEGAL_JURISDICTION;
  const legalJurisdiction=jurisdiction?.status==='VERIFIED'?jurisdiction.countryCodes[0]:null;
  // Namespace is structural only and NEVER interpreted as governance.
  const namespace=normalized.identity?.namespace||null;
  inputs.push({...mapped,organization,foundation,maintainer,legalJurisdiction,namespace});
  const conflictCount=technical.conflicts.length+(governance?.conflicts.length||0)+(geographic?.conflicts.length||0)+(events?.conflicts.length||0);
  const evidenceIds=[...new Set([...technical.evidence.map(e=>e.id),...(governance?.evidence||[]).map(e=>e.id),...(geographic?.evidence||[]).map(e=>e.id),...(events?.evidence||[]).map(e=>e.id),...(bridge?.verification?.evidenceIds||[])])].sort();
  const decisionIds=[...new Set([technical.decisions.license.id,...Object.values(relation).map(d=>d.id),...Object.values(geographic?.decisions||{}).map(d=>d.id),events?.decision.id].filter(Boolean))].sort();
  enrichments.push({componentId:subjectId,packageIdentity:packageId,projectIdentity:projectId,project:projectId,packageStatus:normalized.status,projectStatus:projectId?'VERIFIED':'UNKNOWN',bridgeEvidenceId:bridge?.bridgeEvidence?.id||null,componentName:component.raw.name||'UNKNOWN',version:component.raw.version||'UNKNOWN',organization,foundation,maintainer,namespace,language:technical.languages.join(', ')||null,declaredLicense:technical.licenses.declared,concludedLicense:technical.licenses.concluded,licenseDecision:technical.decisions.license.status,geographic:geographic?.decisions||{},legalJurisdiction,events:events?.events||[],criticality:null,conflictCount,conflictSummary:[...technical.conflicts,...(governance?.conflicts||[]),...(geographic?.conflicts||[]),...(events?.conflicts||[])].map(x=>x.reason||x.id).sort(),evidenceIds,decisionIds});
 }
 const portfolio=assessSbom(inputs);
 const assessments=components.map(c=>portfolio.componentAssessments.find(a=>a.subjectId===c.id));
 for(let i=0;i<assessments.length;i++){
  const a=assessments[i];if(enrichments[i].conflictCount)diagnostics.componentsConflicted++;
  if(a.trustScore!==null)diagnostics.componentsResolved++;else diagnostics.componentsUnknown++;
 }
 diagnostics.governanceCoverage=components.length?Math.round(100*inputs.filter(x=>x.governance.status==='VERIFIED').length/components.length*100)/100:0;
 diagnostics.geographicCoverage=components.length?Math.round(100*inputs.filter(x=>x.geographic.status==='VERIFIED').length/components.length*100)/100:0;
 diagnostics.assessmentCoverage=portfolio.overallCoverage;
 if(mode==='online')diagnostics.warnings.push({code:'ONLINE_NO_PROVIDER_CONFIGURED',message:'No authorized acquisition provider is configured; reused offline evidence only.'});
 const executiveSummary=portfolio.executiveSummary;
 return {analysisMode:mode.toUpperCase(),fileName,format,canonical,components,enrichments,assessments,portfolio,executiveSummary,diagnostics,sourceDigest:digest(text)};
}
module.exports={analyzeSbom,detectFormat};
