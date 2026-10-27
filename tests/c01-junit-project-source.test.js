'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const source=path.join(__dirname,'../fixtures/c01/junit4-r4.13.2-project-readme.md');
test('T62 upstream JUnit project description is independently archived',()=>{
 const body=fs.readFileSync(source,'utf8');
 assert.match(body,/^# JUnit 4/m);
 assert.match(body,/JUnit is a simple framework to write repeatable tests/);
 assert.doesNotMatch(body,/junit:junit:4\\.13\\.2/);
 assert.match(crypto.createHash('sha256').update(body).digest('hex'),/^[a-f0-9]{64}$/);
});
