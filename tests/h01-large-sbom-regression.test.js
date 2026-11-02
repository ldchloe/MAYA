'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {analyzeSbom}=require('../js/reporting-product.js');
const {resolveTechnicalMetadata}=require('../js/d01-technical-metadata.js');
const {importCycloneDxJson}=require('../js/cyclonedx-json.js');
const {digest}=require('../js/enrichment-canonical.js');
const fixture=path.join(__dirname,'fixtures/b06-spring-feroz-sbom.json');
test('H01-PERF-01 cached document digest preserves original evidence and decision identities',()=>{
 const canonical=importCycloneDxJson(fs.readFileSync(fixture,'utf8'),path.basename(fixture)).document;
 const expected=digest(JSON.parse(JSON.stringify(canonical)));
 for(const component of canonical.components.filter(c=>!c.isRoot)){
  const result=resolveTechnicalMetadata(canonical,component.id);
  assert.equal(result.documentDigest,expected);
  assert.ok(result.evidence.every(e=>e.documentDigest===expected));
 }
});
test('H01-PERF-02 pinned 66-component H01 golden assessment, enrichment, evidence and decision output',()=>{
 const a=analyzeSbom(fs.readFileSync(fixture),{fileName:path.basename(fixture),mode:'offline'});
 assert.equal(a.components.length,66);
 assert.equal(digest({assessments:a.assessments,enrichments:a.enrichments,portfolio:a.portfolio,diagnostics:a.diagnostics}),'f24ec52d871b2afdc5fc2d679dc9708a7199e73932bdf6d48c5c520ebfbda5de');
});
test('H01-PERF-03 large SBOM analysis under 30 seconds, if H01_LARGE_SBOM is provided',{timeout:35000},()=>{
 const input=process.env.H01_LARGE_SBOM;
 if(!input)return;
 const started=Date.now(),a=analyzeSbom(fs.readFileSync(input),{fileName:path.basename(input),mode:'offline'});
 assert.ok(a.components.length>=900);
 assert.equal(a.assessments.length,a.components.length);
 assert.ok(Date.now()-started<30000);
});
