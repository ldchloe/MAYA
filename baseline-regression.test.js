'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');const cp=require('node:child_process');
const {analyzeSbom}=require('../../js/reporting-product');const {createWorkbook,inspectWorkbook}=require('../../js/reporting-xlsx');
const root=path.resolve(__dirname,'../..'),manifest=require('./manifest.json'),golden=require('./expected-assessment.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>fs.readFileSync(path.join(root,p));
const fixture=read(manifest.primaryFixture.path);
const run=()=>{const a=analyzeSbom(fixture,{fileName:path.basename(manifest.primaryFixture.path),mode:'offline'});return {analysis:a,excel:inspectWorkbook(createWorkbook(a))}};
const offline=()=>cp.execFileSync(process.execPath,['--require',path.join(__dirname,'network-block.js'),path.join(__dirname,'offline-run.js')],{cwd:root,encoding:'utf8',timeout:30000,maxBuffer:20*1024*1024});
test('BASE-01 fixture and pinned archived Evidence SHA-256 unchanged',()=>{
 assert.equal(sha(fixture),manifest.primaryFixture.sha256);
 for(const a of manifest.archives)assert.equal(sha(read(a.path)),a.sha256,a.path);
 for(const p of manifest.policies){assert.equal(sha(read(p.path)),p.sha256,p.path);assert.equal(JSON.parse(read(p.path)).version,p.version)}
});
test('BASE-02 exact business golden: Decisions, Evidence, UNKNOWN, conflicts, assessments and H01 portfolio',()=>{
 const actual=JSON.parse(JSON.stringify(run()));assert.deepEqual(actual.analysis,golden.analysis);
 assert.deepEqual(actual.excel,golden.excel);
 assert.deepEqual(actual.analysis.assessments.map(x=>x.assessmentId).sort(),manifest.assessmentIds);
 assert.deepEqual([...new Set(actual.analysis.enrichments.flatMap(e=>e.evidenceIds))].sort(),manifest.evidenceIds);
 assert.deepEqual([...new Set(actual.analysis.enrichments.flatMap(e=>e.decisionIds))].sort(),manifest.decisionIds);
});
test('BASE-03 XLSX semantic golden: COMEX, DETAIL, score, coverage, risks, refs, filters and frozen panes',()=>{
 const a=run(),x=a.excel;
 assert.deepEqual(x.sheets,['COMEX','DETAIL']);assert.equal(x.detailRows,a.analysis.components.length);
 assert.ok(x.hasFilters&&x.hasFreeze&&x.zipValid);
 assert.equal(x.overallTrustScore,a.analysis.portfolio.overallTrustScore);
 assert.equal(x.overallCoverage,a.analysis.portfolio.overallCoverage);
 assert.deepEqual(x,golden.excel);
});
test('BASE-04 two independent XLSX generations byte-for-byte identical',()=>{
 const a=analyzeSbom(fixture,{fileName:path.basename(manifest.primaryFixture.path),mode:'offline'});
 const b=createWorkbook(a),c=createWorkbook(a);
 assert.deepEqual(b,c);assert.equal(sha(b),manifest.xlsx.sha256);
});
test('BASE-05 network blocked: offline replay twice matches golden exactly',()=>{
 const a=offline(),b=offline();assert.equal(a,b);
 assert.deepEqual(JSON.parse(a),golden);
});
test('BASE-06 guard fails on any attempted network connection',()=>{
 const probe=cp.spawnSync(process.execPath,['--require',path.join(__dirname,'network-block.js'),'-e','require("node:http").get("https://example.org")'],{cwd:root,encoding:'utf8'});
 assert.notEqual(probe.status,0);assert.match(probe.stderr,/BASELINE_OFFLINE_NETWORK_ATTEMPT/);
});
