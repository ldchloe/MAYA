'use strict';
/* C-01.1B: explicit online acquisition only. Never imported by offline tests. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../tests/fixtures/c01');
const targets=[
 {groupId:'junit',artifactId:'junit',version:'4.13.2'},
 {groupId:'org.springframework',artifactId:'spring-core',version:'6.1.3'},
 {groupId:'org.apache.logging.log4j',artifactId:'log4j-core',version:'2.23.1'}
];
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function descriptor(t){
 const parts=[t.groupId,t.artifactId,t.version];
 if(parts.some(x=>!x||!/^[a-zA-Z0-9_.-]+$/.test(x)))throw Error('invalid Maven coordinates');
 const archivePath=t.groupId.replace(/\./g,'/')+'/'+t.artifactId+'/'+t.version+'/'+t.artifactId+'-'+t.version+'.pom';
 return {...t,sourceUrl:'https://repo.maven.apache.org/maven2/'+archivePath,archivePath};
}
function verify(manifest,read=relative=>fs.readFileSync(path.join(root,relative))){
 if(!manifest||manifest.formatVersion!=='c01-corpus-v1'||!Array.isArray(manifest.archives)||manifest.archives.length!==3)throw Error('invalid corpus manifest');
 const seen=new Set();
 for(const entry of manifest.archives){
  const d=descriptor(entry);
  if(entry.archivePath!==d.archivePath||entry.sourceUrl!==d.sourceUrl)throw Error('coordinate or URL mismatch: '+entry.archivePath);
  if(seen.has(entry.archivePath))throw Error('duplicate archive');
  seen.add(entry.archivePath);
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(entry.acquisitionDate))throw Error('invalid acquisition date');
  const bytes=read(entry.archivePath);
  if(bytes.length!==entry.contentLength||sha256(bytes)!==entry.sha256)throw Error('archive integrity failure: '+entry.archivePath);
 }
 return true;
}
async function acquire({fetchImpl=fetch,now=()=>new Date().toISOString()}={}){
 if(fs.existsSync(path.join(root,'manifest.json')))throw Error('corpus already exists: refusing overwrite');
 const archives=[];
 for(const target of targets){
  const d=descriptor(target);
  const response=await fetchImpl(d.sourceUrl);
  if(!response.ok)throw Error('Maven acquisition failed: '+d.sourceUrl+' HTTP '+response.status);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(!bytes.length)throw Error('empty POM: '+d.sourceUrl);
  const acquisitionDate=now();
  archives.push({...d,acquisitionDate,sha256:sha256(bytes),contentLength:bytes.length,bytes});
 }
 for(const entry of archives){
  const dest=path.join(root,entry.archivePath);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.writeFileSync(dest,entry.bytes,{flag:'wx'});
 }
 const manifest={formatVersion:'c01-corpus-v1',archives:archives.map(({bytes,...entry})=>entry)};
 fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
 verify(manifest);
 return manifest;
}
if(require.main===module){
 if(process.argv[2]==='--verify'){
  try{verify(JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8')));console.log('Corpus integrity verified');}catch(error){console.error(error.message);process.exitCode=1;}
 }else if(process.argv[2]==='--acquire'){
  acquire().then(()=>console.log('Corpus acquired and verified')).catch(error=>{console.error(error.message);process.exitCode=1;});
 }else{console.error('Use --acquire (network) or --verify (offline)');process.exitCode=2;}
}
module.exports={targets,descriptor,verify,sha256,acquire};
