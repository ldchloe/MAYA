#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {analyzeSbom}=require('./reporting-product.js');
const {collectDeclaredFacts}=require('./a01-declared-facts.js');
const {resolveTechnicalMetadata}=require('./d01-technical-metadata.js');
const {createWorkbook,inspectWorkbook}=require('./reporting-xlsx.js');
function main(args=process.argv.slice(2)){
 const option=name=>{const i=args.indexOf(name);return i<0?null:args[i+1]};
 const optionValues=new Set(['--output','--mode','--audit-json'].flatMap(flag=>{const i=args.indexOf(flag);return i>=0&&args[i+1]?[args[i+1]]:[]}));
 const input=args.find(x=>!x.startsWith('--')&&!optionValues.has(x));
 if(!input||args.includes('--help')){process.stdout.write('Usage: node js/reporting-cli.js input.json --output report.xlsx [--mode offline|online]\nOptional: --audit-json audit.json (H01 assessments, provenance IDs). Supported: CycloneDX JSON. XML/SPDX not supported by existing canonical import.\n');return input?0:1}
 const output=option('--output')||'maya-report.xlsx',mode=option('--mode')||'offline',auditJson=option('--audit-json');
 try{
  const a=analyzeSbom(fs.readFileSync(input),{fileName:path.basename(input),mode});
  const bytes=createWorkbook(a),check=inspectWorkbook(bytes);
  if(check.detailRows!==a.diagnostics.componentsTotal||check.sheets.join(',')!=='COMEX,DETAIL')throw Error('XLSX_VALIDATION_FAILED');
  fs.writeFileSync(output,bytes);
  if(auditJson){
   const entries=a.components.map((c,i)=>({componentId:c.id,assessment:a.assessments[i],enrichment:a.enrichments[i],declaredFacts:collectDeclaredFacts(a.canonical,c),technicalProvenance:resolveTechnicalMetadata(a.canonical,c.id)}));
   const audit={schema:'maya-h01-audit-v1',sourceDigest:a.sourceDigest||null,analysisMode:a.analysisMode,policyVersion:a.assessments[0]?.policyVersion||null,entries};
   fs.writeFileSync(auditJson,JSON.stringify(audit,null,2)+'\n');
  }
  process.stdout.write(JSON.stringify({output,mode:a.analysisMode,components:a.diagnostics.componentsTotal,trustScore:a.executiveSummary.overallTrustScore,coverage:a.executiveSummary.overallCoverage,bytes:bytes.length})+'\n');
  return 0;
 }catch(e){process.stderr.write('MAYA_REPORTING_ERROR: '+e.message+'\n');return 1}
}
if(require.main===module)process.exitCode=main();
module.exports={main};
