'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {assessTrust,assessSbom,regionForCountry}=require('../js/h01-trust-analysis.js');
const policy=require('../config/h01-risk-policy.json');
const base={subjectId:'project:test',technical:{status:'UNKNOWN'},governance:{status:'UNKNOWN'},geographic:{status:'UNKNOWN'},events:{status:'UNKNOWN'},criticality:'UNKNOWN'};
const fact=(status,extra={})=>({status,...extra});
const assess=(x={})=>assessTrust({...base,...x});
test('H-03 H-04 H-10 H-11 H-15 H-28 unknown is not zero risk or perfect confidence',()=>{const r=assess();assert.equal(r.evidenceCoverage,0);assert.equal(r.confidence,'LOW');assert.equal(r.trustScore,null);assert.ok(r.dimensions.every(d=>d.riskScore===null&&d.status==='UNKNOWN'));assert.equal(assess({geographic:{status:'UNKNOWN',domain:'apache.org',namespace:'org.apache'}}).dimensions[4].status,'UNKNOWN')});
test('H-06 H-09 region classifications are descriptive',()=>{for(const [c,v] of [['FR','EU'],['DE','EU'],['NO','EEA'],['GB','EUROPE_NON_EU'],['US','NON_EU'],[null,'UNKNOWN']])assert.equal(regionForCountry(c),v)});
test('H-01 H-02 H-26 H-27 verified favourable and high explicit risk are bounded',()=>{const a=assess({technical:fact('VERIFIED',{riskScore:0,decisionId:'d1'}),governance:fact('VERIFIED',{riskScore:0,decisionId:'d2'})});const b=assess({technical:fact('VERIFIED',{riskScore:5,decisionId:'d1'}),governance:fact('VERIFIED',{riskScore:0,decisionId:'d2'})});assert.ok(a.trustScore>b.trustScore);assert.ok(a.trustScore<=100);assert.ok(b.trustScore>=0);assert.throws(()=>assess({technical:fact('VERIFIED',{riskScore:6})}))});
test('H-05 H-12 H-13 H-14 conflicts, releases and incidents are distinct',()=>{const r=assess({events:{status:'VERIFIED',events:[{eventType:'RELEASE',status:'VERIFIED',eventId:'e1',evidenceIds:['ev1']}],decisionId:'d1'}});assert.equal(r.dimensions[2].riskScore,0);const c=assess({governance:fact('CONFLICTED',{decisionId:'d2'})});assert.equal(c.dimensions[1].status,'CONFLICTED');assert.equal(c.dimensions[1].riskScore,null);assert.ok(c.evidenceCoverage<100)});
test('H-16 criticality and H-17 concentration explicit policy',()=>{const r=assess({criticality:'CRITICAL',criticalityEvidenceId:'e1',concentration:fact('VERIFIED',{percentage:60,denominator:5,numerator:3,decisionId:'d1'})});assert.ok(r.dimensions[5].riskScore>0);assert.ok(r.dimensions[3].riskScore>0)});
test('H-18 H-19 H-20 offline determinism, policy version',()=>{assert.deepEqual(assess(),assess());const p=structuredClone(policy);p.version='H01-test-v2';assert.notEqual(assessTrust(base,p).resultDigest,assess().resultDigest)});
test('H-23 H-25 portfolio aggregation, no fabricated critical dependencies',()=>{const r=assessSbom([base,{...base,subjectId:'project:other'}]);assert.equal(r.componentAssessments.length,2);assert.equal(r.overallTrustScore,null);assert.deepEqual(r.criticalDependencies,[]);assert.ok(r.executiveSummary)});

test('H-23 H-24 H-25 three real project identities from verified E/F/G offline decisions',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const {assessVerifiedProject}=require('../js/h01-trust-analysis.js');
 const {resolveGovernance}=require('../js/e01-governance.js');
 const {resolveGeographicFacts}=require('../js/f01-geographic-facts.js');
 const {resolveTrustEvents}=require('../js/g01-trust-events.js');
 const registry=require('../js/c01-corpus-registry.js');
 const ids=[registry.approved[0].projectIdentityId,registry.approved[1].projectIdentityId,'project:3b8b92fd783639e12f59ff6256967b246edd5249343217fb6d669a6ce688ff8e'];
 const meta=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../fixtures/f01/asf/corporation.metadata.json'),'utf8'));
 const claim={subject:'Apache Software Foundation',relationship:'LEGAL_JURISDICTION',countryCode:'US',countryObserved:'United States',jurisdictionSubdivision:'Delaware',source:{archivePath:'fixtures/f01/asf/corporation.html',sourceUrl:meta.finalUrl,selector:'The ASF is a Delaware membership corporation',acquiredAt:meta.acquiredAt,archiveSha256:meta.sha256}};
 const assessments=ids.map(subjectId=>{
  const geographic=resolveGeographicFacts({projectIdentityId:subjectId,claims:subjectId===ids[1]?[claim]:[]});
  const governance=resolveGovernance({projectIdentityId:subjectId,claims:[]});
  const releaseClaims=subjectId===ids[2]?['r4.13.1','r4.13.2'].map(tag=>{
   const root=path.resolve(__dirname,'../fixtures/g01/junit');
   const m=JSON.parse(fs.readFileSync(path.join(root,tag+'.metadata.json'),'utf8'));
   const raw=JSON.parse(fs.readFileSync(path.join(root,tag+'.json'),'utf8'));
   return {eventType:'RELEASE',subject:subjectId,after:tag,effectiveAt:raw.published_at,source:{archiveSha256:m.sha256,archiveId:m.archiveId,acquiredAt:m.acquiredAt}};
  }):[];
  const events=resolveTrustEvents({projectIdentityId:subjectId,claims:releaseClaims});
  const a=assessVerifiedProject({subjectId,governance,geographic,events});
  assert.deepEqual(a,assessVerifiedProject({subjectId,governance,geographic,events}));
  return a;
 });
 assert.equal(assessments.length,3);
 assert.equal(assessments[1].dimensions.find(x=>x.type==='GEOPOLITICAL_RISK').riskScore,policy.riskRules.geopolitical.NON_EU);
 assert.equal(assessments[2].dimensions.find(x=>x.type==='SUPPLY_CHAIN_RISK').riskScore,0);
 assert.equal(assessments[0].trustScore,null);
});
test('H-10 H-11 forged verified Lot F input fails closed',()=>{
 const {assessVerifiedProject}=require('../js/h01-trust-analysis.js');
 assert.throws(()=>assessVerifiedProject({subjectId:'project:test',geographic:{projectIdentityId:'project:test',decisions:{LEGAL_JURISDICTION:{status:'VERIFIED',countryCodes:['US']}}}}));
});

test('H-13 controlled compromise policy mapping and synthetic fixture exclusion',()=>{
 const verified={status:'VERIFIED',decisionId:'d1',events:[{eventType:'COMPROMISE',status:'VERIFIED',eventId:'e1',evidenceIds:['ev1']}]};
 const a=assess({events:verified});
 assert.equal(a.dimensions[2].riskScore,policy.riskRules.supplyChain.COMPROMISE);
 const b=assess({events:{...verified,events:[{...verified.events[0],testOnly:true}]}});
 assert.equal(b.dimensions[2].status,'UNKNOWN');
 assert.equal(b.dimensions[2].riskScore,null);
});
test('H-28 NOT_APPLICABLE excluded from coverage denominator and CONFLICTED distinct',()=>{
 const a=assess({technical:fact('NOT_APPLICABLE'),governance:fact('CONFLICTED')});
 assert.equal(a.dimensions[0].status,'NOT_APPLICABLE');
 assert.equal(a.dimensions[0].coverage,null);
 assert.equal(a.dimensions[1].status,'CONFLICTED');
 assert.equal(a.dimensions[1].riskScore,null);
});
test('H-02 no risk input accepted without decision/evidence provenance',()=>{
 assert.throws(()=>assess({technical:fact('VERIFIED',{riskScore:4})}),/UNSOURCED_H01_RISK/);
});
