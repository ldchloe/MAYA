'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {sha256Text}=require('../js/enrichment-canonical.js');
const {verifySnapshot,verifyComponent,safeUrl}=require('../js/h01-independent-evidence.js');
test('H01-V2 rejects untrusted URLs, path traversal, and modified archives',()=>{
 assert.equal(safeUrl('http://gnupg.org/file'),null);
 assert.equal(safeUrl('https://evil.example/file'),null);
 assert.equal(safeUrl('https://gnupg.org@evil.example/file'),null);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'maya-evidence-'));
 try{
  fs.writeFileSync(path.join(dir,'source.txt'),'license GPL-2.0-only');
  const r={sourceUrl:'https://gnupg.org/source',archivePath:'source.txt',sha256:sha256Text('license GPL-2.0-only'),acquiredAt:'2026-11-03T00:00:00Z',dimension:'license',field:'license',value:'GPL-2.0-only',selector:'license GPL-2.0-only'};
  assert.equal(verifySnapshot(r,dir).status,'INTEGRITY_CHECKED');
  assert.equal(verifySnapshot({...r,archivePath:'../source.txt'},dir).status,'UNKNOWN');
  fs.writeFileSync(path.join(dir,'source.txt'),'tampered');
  assert.equal(verifySnapshot(r,dir).reason,'ARCHIVE_DIGEST_MISMATCH');
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('H01-V2 does not elevate self declarations without a source and explicit identity',()=>{
 const component={id:'occ:gpgv',raw:{name:'gpgv',version:'1.4.7',licenses:[{license:{id:'GPL-2.0-only'}}]}};
 const document={id:'sbom:test',format:'cyclonedx-json',components:[component]};
 const result=verifyComponent(document,component,null,process.cwd());
 assert.equal(result.summary.independentlyVerified,0);
 assert.ok(result.checks.every(x=>x.status==='DECLARED_UNVERIFIED'));
});
