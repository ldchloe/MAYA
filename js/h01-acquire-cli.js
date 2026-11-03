#!/usr/bin/env node
'use strict';
// Explicit, operator-driven acquisition. Never promote fetched text to verified governance automatically.
const fs=require('node:fs'),path=require('node:path'),https=require('node:https');
const {safeUrl}=require('./h01-independent-evidence.js');
const {sha256Text}=require('./enrichment-canonical.js');
function fetchText(url,maxBytes=2*1024*1024){
 return new Promise((resolve,reject)=>{
  if(!safeUrl(url))return reject(Error('SOURCE_URL_NOT_ALLOWLISTED'));
  const req=https.get(url,{timeout:15000,headers:{'User-Agent':'MAYA-H01-evidence-collector/1.0','Accept':'text/plain,text/html,application/json'}},res=>{
   if(res.statusCode!==200){res.resume();reject(Error('HTTP_STATUS_'+res.statusCode));return}
   let size=0;const chunks=[];
   res.on('data',chunk=>{size+=chunk.length;if(size>maxBytes){req.destroy(Error('SOURCE_TOO_LARGE'));return}chunks.push(chunk)});
   res.on('end',()=>resolve(Buffer.concat(chunks).toString('utf8')));
  });
  req.on('error',reject);req.on('timeout',()=>req.destroy(Error('SOURCE_TIMEOUT')));
 });
}
async function main(args=process.argv.slice(2)){
 const [requestPath,outputDir]=args;
 if(!requestPath||!outputDir)throw Error('Usage: node js/h01-acquire-cli.js requests.json output-dir');
 const requests=JSON.parse(fs.readFileSync(requestPath,'utf8'));
 if(!Array.isArray(requests)||requests.length>100)throw Error('INVALID_REQUEST_LIST');
 fs.mkdirSync(outputDir,{recursive:true});
 const records=[];
 for(const [i,r] of requests.entries()){
  if(!r||!safeUrl(r.sourceUrl)||!['technical','governance'].includes(r.dimension)||typeof r.componentId!=='string'||!r.componentId||!r.identity||r.identity.confirmedByOperator!==true||typeof r.identity.name!=='string'||typeof r.identity.version!=='string'||typeof r.field!=='string'||typeof r.value!=='string'||typeof r.selector!=='string')throw Error('INVALID_ACQUISITION_REQUEST_'+i);
  const body=await fetchText(r.sourceUrl);
  const sha256=sha256Text(body),archivePath='sources/'+sha256+'.txt';
  fs.mkdirSync(path.join(outputDir,'sources'),{recursive:true});
  fs.writeFileSync(path.join(outputDir,archivePath),body);
  records.push({componentId:r.componentId,dimension:r.dimension,field:r.field,value:r.value,selector:r.selector,identity:r.identity,sourceUrl:r.sourceUrl,archivePath,sha256,acquiredAt:new Date().toISOString(),collectionStatus:'ARCHIVED_UNVERIFIED'});
 }
 const manifest={schema:'maya-h01-independent-sources-v1',records};
 fs.writeFileSync(path.join(outputDir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 process.stdout.write(JSON.stringify({archived:records.length,manifest:path.join(outputDir,'manifest.json')})+'\n');
}
if(require.main===module)main().catch(e=>{console.error('MAYA_ACQUISITION_ERROR:',e.message);process.exitCode=1});
module.exports={main,fetchText};
