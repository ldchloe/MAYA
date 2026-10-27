'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const projects=require('../js/project-identity.js');
const base=path.join(__dirname,'../fixtures/c01/log4j');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
test('LOG-01 official Maven Central POM is byte-exact archived HTTP 200',()=>{
 const m=JSON.parse(fs.readFileSync(path.join(base,'acquisition-manifest.json')));
 const record=m.records.find(x=>x.file==='maven-central/log4j-core-2.23.1.pom');
 assert.equal(record.status,200);assert.equal(record.provider,'maven-central');
 const bytes=fs.readFileSync(path.join(base,record.file));assert.equal(sha(bytes),record.sha256);
 const xml=bytes.toString('utf8');assert.match(xml,/<artifactId>log4j-core<\/artifactId>/);assert.match(xml,/<version>2\.23\.1<\/version>/);
});
test('LOG-02 independent Apache Log4j ProjectIdentity snapshot',()=>{
 const snapshot=JSON.parse(fs.readFileSync(path.join(base,'apache-log4j-project-identity.snapshot.json')));
 assert.equal(projects.validateProjectIdentitySnapshot(snapshot),true);
 assert.equal(snapshot.projects.length,1);assert.equal(snapshot.links.length,0);
 assert.equal(snapshot.projects[0].name,'Apache Log4j');
 assert.equal(snapshot.projects[0].attributionContext.scope,'independent-project-identity-only');
 const readme=fs.readFileSync(path.join(base,'apache-log4j-readme.adoc'));
 assert.equal(snapshot.projects[0].attributionContext.projectSourceSha256,sha(readme));
});
test('LOG-03 official tagged Apache project root and module archives are immutable',()=>{
 const m=JSON.parse(fs.readFileSync(path.join(base,'acquisition-manifest.json')));
 for(const record of m.records){
  assert.equal(record.status,200);
  assert.equal(sha(fs.readFileSync(path.join(base,record.file))),record.sha256);
  assert.equal(record.archiveId,'sha256:'+record.sha256);
 }
 const root=fs.readFileSync(path.join(base,'apache-log4j-parent-pom.xml'),'utf8');
 const module=fs.readFileSync(path.join(base,'apache-log4j-core-pom.xml'),'utf8');
 assert.match(root,/log4j-core/);assert.match(module,/<artifactId>log4j-core<\/artifactId>/);
});

test('LOG-03 L3/L4/L5 official module parent revision matches published Maven Central release',()=>{
 const root=fs.readFileSync(path.join(base,'apache-log4j-parent-pom.xml'),'utf8');
 const module=fs.readFileSync(path.join(base,'apache-log4j-core-pom.xml'),'utf8');
 const published=fs.readFileSync(path.join(base,'maven-central/log4j-core-2.23.1.pom'),'utf8');
 assert.ok(root.includes('<revision>2.23.1</revision>'));
 assert.ok(root.includes('<module>log4j-core</module>'));
 assert.ok(root.includes('<groupId>org.apache.logging.log4j</groupId>'));
 assert.ok(module.includes('<artifactId>log4j-core</artifactId>'));
 assert.ok(module.includes('<version>${revision}</version>'));
 assert.ok(published.includes('<groupId>org.apache.logging.log4j</groupId>'));
 assert.ok(published.includes('<artifactId>log4j-core</artifactId>'));
 assert.ok(published.includes('<version>2.23.1</version>'));
 assert.ok(published.includes('<artifactId>log4j</artifactId>'));
});
