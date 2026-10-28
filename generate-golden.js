'use strict';
// Maintainer-only command. Never invoked by the regression test or CI.
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');const fixture='tests/fixtures/b06-scanoss-java.json';
const {analyzeSbom}=require('../../js/reporting-product');const {createWorkbook,inspectWorkbook}=require('../../js/reporting-xlsx');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const canonical=x=>JSON.parse(JSON.stringify(x));
const a=analyzeSbom(fs.readFileSync(path.join(root,fixture)),{fileName:path.basename(fixture),mode:'offline'});
const excel=createWorkbook(a);const semantic=inspectWorkbook(excel);
const snapshot={analysis:canonical(a),excel:canonical(semantic)};
const archives=[];for(const folder of ['fixtures/c01','fixtures/e01','fixtures/f01','fixtures/g01']){const walk=d=>{for(const ent of fs.readdirSync(path.join(root,d),{withFileTypes:true})){const p=path.posix.join(d,ent.name);if(ent.isDirectory())walk(p);else archives.push({path:p,sha256:sha(p)})}};walk(folder)}
archives.sort((a,b)=>a.path.localeCompare(b.path));
const policies=['config/h01-risk-policy.json','config/h01-geopolitical-policy.json'].map(p=>({path:p,sha256:sha(p),version:JSON.parse(fs.readFileSync(path.join(root,p))).version}));
const manifest={version:'v0.1.0-mvp',originalMvpCommit:'2cf1a7eac3b2fba867a9e848d4c13d88bb1f6e11',primaryFixture:{path:fixture,sha256:sha(fixture)},analysisMode:'OFFLINE',policies,engineVersion:a.assessments[0]?.engineVersion||null,assessmentSchemaFields:Object.keys(a.assessments[0]||{}),nodeRuntimeValidated:process.version,archives,evidenceIds:[...new Set(a.enrichments.flatMap(e=>e.evidenceIds))].sort(),decisionIds:[...new Set(a.enrichments.flatMap(e=>e.decisionIds))].sort(),assessmentIds:a.assessments.map(x=>x.assessmentId).sort(),xlsx:{mode:'semantic-and-structure',sha256:crypto.createHash('sha256').update(excel).digest('hex'),byteIdenticalOnTwoGenerations:excel.equals(createWorkbook(a))},limitations:['Only CycloneDX JSON canonical import supported','Online acquisition not configured','Approved identities limited to pinned corpus','UNKNOWN coverage may be high','ZIP export is a deterministic snapshot, not Excel scoring','ZIP archive has no .git metadata: original commit verified externally, not from ZIP']};
fs.writeFileSync(path.join(__dirname,'expected-assessment.json'),JSON.stringify(snapshot,null,2)+'\n');fs.writeFileSync(path.join(__dirname,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log({components:a.components.length,score:a.portfolio.overallTrustScore,coverage:a.portfolio.overallCoverage,archives:archives.length,bytes:excel.length,xlsxSha256:manifest.xlsx.sha256});
