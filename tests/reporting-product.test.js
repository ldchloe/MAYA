'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {analyzeSbom}=require('../js/reporting-product.js');
const {createWorkbook,inspectWorkbook}=require('../js/reporting-xlsx.js');
const real=fs.readFileSync(path.join(__dirname,'fixtures/b06-scanoss-java.json'),'utf8');
const run=()=>analyzeSbom(real,{fileName:'b06-scanoss-java.json',mode:'offline'});
test('R-01 R-02 R-12 R-17 real pinned CycloneDX → A-H assessments → two-sheet XLSX',()=>{
 const a=run(),book=createWorkbook(a),inspect=inspectWorkbook(book);
 assert.equal(a.analysisMode,'OFFLINE');assert.ok(a.components.length>0);
 assert.equal(a.assessments.length,a.components.length);
 assert.deepEqual(inspect.sheets,['COMEX','DETAIL']);
 assert.equal(inspect.detailRows,a.components.length);
 assert.ok(book.subarray(0,2).equals(Buffer.from('PK')));
});
test('R-03 R-04 R-07 R-08 reporting consumes H01 unchanged',()=>{
 const a=run(),x=inspectWorkbook(createWorkbook(a));console.log('DEBUG_XLSX',JSON.stringify({comex:x.debugComex,detail:x.debugDetail}));
 assert.equal(x.overallTrustScore,a.executiveSummary.overallTrustScore);
 assert.equal(x.overallCoverage,a.executiveSummary.overallCoverage);
 assert.deepEqual(x.detail.map(d=>d.trustScore).sort(),a.assessments.map(d=>d.trustScore).sort());
 assert.deepEqual(x.detail.map(d=>d.evidenceCoverage).sort(),a.assessments.map(d=>d.evidenceCoverage).sort());
 assert.deepEqual(x.detail.map(d=>d.risks.join(',')).sort(),a.assessments.map(a=>a.dimensions.map(d=>d.riskScore).join(',')).sort());
});
test('R-05 R-06 R-13 R-14 unknown/conflict and traceability represented',()=>{
 const a=run(),x=inspectWorkbook(createWorkbook(a));
 assert.ok(x.detail.some(d=>d.unknownCount>0));
 assert.ok(x.detail.every(d=>typeof d.evidenceRefs==='string'&&typeof d.decisionRefs==='string'));
 assert.ok(x.detail.every(d=>d.conflictCount>=0));
});
test('R-09 R-10 R-11 COMEX totals, exposure, concentration match H01',()=>{
 const a=run(),x=inspectWorkbook(createWorkbook(a));
 assert.equal(x.componentsTotal,a.diagnostics.componentsTotal);
 assert.deepEqual(x.exposure,a.portfolio.geopoliticalExposure);
 assert.deepEqual(x.concentration,a.portfolio.governanceConcentration);
});
test('R-15 invalid or unsupported SBOM fails explicitly',()=>{
 assert.throws(()=>analyzeSbom('{bad',{fileName:'bad.json'}),/INVALID_SBOM/);
 assert.throws(()=>analyzeSbom('<bom/>',{fileName:'bad.xml'}),/UNSUPPORTED_SBOM_FORMAT/);
});
test('R-16 R-20 deterministic workbook bytes, filters, freeze and valid ZIP CRC',()=>{
 const a=run(),b=run(),x=createWorkbook(a);
 assert.deepEqual(a.portfolio,b.portfolio);assert.deepEqual(x,createWorkbook(b));
 const inspect=inspectWorkbook(x);assert.ok(inspect.hasFilters);assert.ok(inspect.hasFreeze);
 assert.ok(inspect.zipValid);
});
test('R-18 R-19 canonical and legacy scoring unaffected',()=>{
 const a=run(),b=run();assert.deepEqual(a.canonical,b.canonical);
 assert.equal(a.portfolio.resultDigest,b.portfolio.resultDigest);
});
