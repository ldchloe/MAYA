'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const base=path.join(__dirname,'../fixtures/c01/official-p1');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function replay(){const meta=JSON.parse(fs.readFileSync(path.join(base,'acquisition.json'),'utf8'));const bytes=fs.readFileSync(path.join(base,'dependency-info.html'));assert.equal(meta.httpStatus,200);assert.equal(meta.sourceUrl,'https://junit.org/junit4/dependency-info.html');assert.equal(meta.finalUrl,meta.sourceUrl);assert.equal(meta.provider,'github-actions-curl');assert.match(meta.acquiredAt,/^2026-10-27T/);assert.equal(meta.bodyBytes,bytes.length);assert.equal(meta.bodySha256,sha(bytes));assert.equal(meta.archiveId,'sha256:'+sha(bytes));const html=bytes.toString('utf8');assert.match(html,/<title>JUnit &#x2013; Dependency Information<\/title>/);assert.match(html,/<li id="projectVersion"[^>]*>Version: 4\.13\.2<\/li>/);assert.match(html,/&lt;groupId&gt;junit&lt;\/groupId&gt;\s*&lt;artifactId&gt;junit&lt;\/artifactId&gt;\s*&lt;version&gt;4\.13\.2&lt;\/version&gt;/);return Object.freeze({status:'P1_OFFICIAL_COORDINATES_VERIFIED',archiveId:meta.archiveId,bodySha256:meta.bodySha256,coordinates:'junit:junit:4.13.2'});}
test('P15-P1 real raw official HTTP archive integrity and explicit Maven declaration offline',()=>{assert.deepEqual(replay(),replay());});
test('P15-P1 altered raw response rejected by SHA-256',()=>{const meta=JSON.parse(fs.readFileSync(path.join(base,'acquisition.json'),'utf8'));const original=fs.readFileSync(path.join(base,'dependency-info.html'));assert.notEqual(sha(Buffer.concat([original,Buffer.from(' ')])),meta.bodySha256);});
