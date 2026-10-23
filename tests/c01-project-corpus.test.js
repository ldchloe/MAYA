'use strict';
/* Offline corpus contract: no fetch or acquisition. */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {targets,descriptor,verify,sha256}=require('../scripts/acquire-c01-fixtures.js');
const root=path.join(__dirname,'fixtures/c01');
const manifestPath=path.join(root,'manifest.json');
const load=()=>JSON.parse(fs.readFileSync(manifestPath,'utf8'));
test('C01B-01 manifest and three pinned archives exist',()=>{
 assert.ok(fs.existsSync(manifestPath),'missing real Maven corpus manifest');
 const m=load();assert.equal(m.archives.length,3);
 for(const t of targets)assert.ok(m.archives.some(e=>e.groupId===t.groupId&&e.artifactId===t.artifactId&&e.version===t.version));
 for(const e of m.archives)assert.ok(fs.existsSync(path.join(root,e.archivePath)));
});
test('C01B-02 real corpus SHA-256 and paths verify offline',()=>assert.equal(verify(load()),true));
test('C01B-03 replay is byte-for-byte reproducible',()=>{
 const m=load();const replay=()=>m.archives.map(e=>({archivePath:e.archivePath,sha256:sha256(fs.readFileSync(path.join(root,e.archivePath)))}));
 assert.deepEqual(replay(),replay());
});
test('C01B-04 tampered archive rejected',()=>{
 const m=load();const read=p=>Buffer.concat([fs.readFileSync(path.join(root,p)),Buffer.from('altered')]);
 assert.throws(()=>verify(m,read),/integrity failure/);
});
test('C01B-05 tampered digest rejected',()=>{
 const m=load();m.archives[0].sha256='0'.repeat(64);
 assert.throws(()=>verify(m),/integrity failure/);
});
test('C01B-06 absent URL and inconsistent coordinates rejected',()=>{
 const m=load();delete m.archives[0].sourceUrl;
 assert.throws(()=>verify(m),/coordinate or URL mismatch/);
 const n=load();n.archives[0].groupId='invalid.group';
 assert.throws(()=>verify(n),/coordinate or URL mismatch/);
});
test('C01B-07 provenance contains no Project interpretation',()=>{
 const m=load();const forbidden=/selectedProjectId|Candidate|Selected|Conflicted|officialRepository|projectResolution/i;
 assert.doesNotMatch(JSON.stringify(m),forbidden);
 for(const e of m.archives){assert.equal(Object.keys(e).sort().join(','),'acquisitionDate,archivePath,artifactId,contentLength,groupId,sha256,sourceUrl,version');}
});
test('C01B-08 deterministic descriptor and strictly pinned versions',()=>{
 for(const t of targets){assert.deepEqual(descriptor(t),descriptor(t));assert.notEqual(t.version,'latest');}
});
test('C01B-09 offline verifier never invokes network',()=>{
 const m=load();const old=globalThis.fetch;
 globalThis.fetch=()=>{throw Error('network forbidden in offline replay');};
 try{assert.equal(verify(m),true);}finally{globalThis.fetch=old;}
});
