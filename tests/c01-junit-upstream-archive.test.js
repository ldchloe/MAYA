'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const crypto=require('node:crypto');
const pom=fs.readFileSync(path.join(__dirname,'../fixtures/c01/junit4-r4.13.2-upstream-pom.xml'),'utf8');
const sha=crypto.createHash('sha256').update(Buffer.from(pom,'utf8')).digest('hex');
test('T57 archived upstream tagged JUnit POM is locally replayable',()=>{
 assert.match(pom,/<groupId>junit<\/groupId>/);
 assert.match(pom,/<artifactId>junit<\/artifactId>/);
 assert.match(pom,/<version>4\.13\.2<\/version>/);
 assert.match(pom,/<name>JUnit<\/name>/);
 assert.equal(sha,'569b6977ee4603c965c1c46c3058fa6e969291b0160eb6964dd092cd89eadd94');
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../fixtures/c01/junit4-r4.13.2-upstream-pom.xml'))).digest('hex'),sha);
});
