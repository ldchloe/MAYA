#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {analyzeSbom}=require('./reporting-product.js');
const {createWorkbook,inspectWorkbook}=require('./reporting-xlsx.js');
function main(args=process.argv.slice(2)){
 const input=args.find(x=>!x.startsWith('--')&&x!==args[args.indexOf('--output')+1]&&x!==args[args.indexOf('--mode')+1]);
 const option=name=>{const i=args.indexOf(name);return i<0?null:args[i+1]};
 if(!input||args.includes('--help')){process.stdout.write('Usage: node js/reporting-cli.js input.json --output report.xlsx [--mode offline|online]\nSupported: CycloneDX JSON. XML/SPDX not supported by existing canonical import.\n');return input?0:1}
 const output=option('--output')||'maya-report.xlsx',mode=option('--mode')||'offline';
 try{
  const a=analyzeSbom(fs.readFileSync(input),{fileName:path.basename(input),mode});
  const bytes=createWorkbook(a),check=inspectWorkbook(bytes);
  if(check.detailRows!==a.diagnostics.componentsTotal||check.sheets.join(',')!=='COMEX,DETAIL')throw Error('XLSX_VALIDATION_FAILED');
  fs.writeFileSync(output,bytes);
  process.stdout.write(JSON.stringify({output,mode:a.analysisMode,components:a.diagnostics.componentsTotal,trustScore:a.executiveSummary.overallTrustScore,coverage:a.executiveSummary.overallCoverage,bytes:bytes.length})+'\n');
  return 0;
 }catch(e){process.stderr.write('MAYA_REPORTING_ERROR: '+e.message+'\n');return 1}
}
if(require.main===module)process.exitCode=main();
module.exports={main};
