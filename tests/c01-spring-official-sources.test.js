'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {createProjectIdentityRegistry,allocateProjectIdentity,validateProjectIdentitySnapshot}=require('../js/project-identity.js');
const base=path.join(__dirname,'../fixtures/c01/spring');
const source=(name)=>fs.readFileSync(path.join(base,'spring-framework-v6.1.3-'+name),'utf8');
const sha=(body)=>crypto.createHash('sha256').update(body).digest('hex');
const expected={
 'readme.md':'c642c976c9e6e92572da5a9e6d3d651cd9e940ee',
 'settings.gradle':'8f9f81e27c8d01080d4df802801c2887ddf96588',
 'spring-core.gradle':'a947f95c1ae2f716738f95e48794297dbd3305d8'
};
const gitBlob=body=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+Buffer.byteLength(body)+'\0'),Buffer.from(body)])).digest('hex');

test('SPR-S1 official tagged README independently identifies Spring Framework',()=>{
 const readme=source('readme.md');
 assert.match(readme,/# .*Spring Framework/);
 assert.match(readme,/home of the Spring Framework/);
 assert.equal(gitBlob(readme),expected['readme.md']);
});

test('SPR-S2 official v6.1.3 version is fixed independently of Maven namespace',()=>{
 const properties=source('gradle.properties');
 assert.match(properties,/^version=6\.1\.3$/m);
});

test('SPR-S3 tagged settings and module build explicitly include spring-core',()=>{
 const settings=source('settings.gradle');
 const module=source('spring-core.gradle');
 assert.match(settings,/include "spring-core"/);
 assert.match(settings,/include "spring-beans"/);
 assert.match(module,/description = "Spring Core"/);
 assert.equal(gitBlob(settings),expected['settings.gradle']);
 assert.equal(gitBlob(module),expected['spring-core.gradle']);
});

test('SPR-S4 official tagged root build establishes Maven group for modules',()=>{
 const build=source('build.gradle');
 assert.match(build,/description = "Spring Framework"/);
 assert.match(build,/group = "org\.springframework"/);
 assert.match(build,/moduleProjects = subprojects/);
});

test('SPR-Y independent opaque ProjectIdentity allocation replays without a package link',()=>{
 const readme=source('readme.md');
 const context={scope:'independent-project-identity-only',projectSourceSha256:sha(readme),officialSource:'spring-projects/spring-framework@v6.1.3:README.md'};
 const params={projectId:'project:'+'a'.repeat(64),attributionId:'attribution:'+'b'.repeat(64),createdAt:'2026-10-27T12:00:00Z',attributionContext:context,name:'Spring Framework',url:'https://spring.io/projects/spring-framework'};
 const first=allocateProjectIdentity(createProjectIdentityRegistry(),params);
 const second=allocateProjectIdentity(createProjectIdentityRegistry(),params);
 assert.deepEqual(first,second);
 assert.equal(first.links.length,0);
 assert.equal(first.projects[0].attributionContext.scope,'independent-project-identity-only');
 assert.equal(validateProjectIdentitySnapshot(first),true);
});

test('SPR-MULTI-01 spring-core and spring-beans are distinct official modules',()=>{
 const settings=source('settings.gradle');
 assert.notEqual('maven:org.springframework:spring-core','maven:org.springframework:spring-beans');
 assert.match(settings,/include "spring-core"/);
 assert.match(settings,/include "spring-beans"/);
});
