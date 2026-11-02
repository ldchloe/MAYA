'use strict';
const fs=require('node:fs');const path=require('node:path');
const {analyzeSbom}=require('../../js/reporting-product');
const {createWorkbook,inspectWorkbook}=require('../../js/reporting-xlsx');
const fixture=path.resolve(__dirname,'../fixtures/b06-scanoss-java.json');
const a=analyzeSbom(fs.readFileSync(fixture),{fileName:path.basename(fixture),mode:'offline'});
process.stdout.write(JSON.stringify({analysis:a,excel:inspectWorkbook(createWorkbook(a))}));
