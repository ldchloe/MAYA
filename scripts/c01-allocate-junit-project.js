'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const P=require('../js/project-identity.js');
const {sha256Text}=require('../js/enrichment-canonical.js');
const root=path.join(__dirname,'..');
const source='fixtures/c01/junit4-r4.13.2-project-readme.md';
const sourceBytes=fs.readFileSync(path.join(root,source),'utf8');
if(!sourceBytes.startsWith('# JUnit 4\n')||!sourceBytes.includes('JUnit is a simple framework to write repeatable tests.'))throw Error('INDEPENDENT_PROJECT_SOURCE_INVALID');
const out=path.join(root,'fixtures/c01/junit4-project-identity.snapshot.json');
if(fs.existsSync(out))throw Error('PROJECT_IDENTITY_ALREADY_ALLOCATED');
const createdAt=new Date().toISOString();
const projectId='project:'+crypto.randomBytes(32).toString('hex');
const attributionId='attribution:'+crypto.randomBytes(32).toString('hex');
const registry=P.createProjectIdentityRegistry();
const snapshot=P.allocateProjectIdentity(registry,{projectId,attributionId,createdAt,attributionContext:{
 humanDecision:'H1 APPROVED',
 approvalScope:'explicit independent JUnit 4 project allocation only',
 projectSource:source,
 projectSourceSha256:sha256Text(sourceBytes),
 sourceProvenance:'https://github.com/junit-team/junit4/blob/r4.13.2/README.md',
 scope:'independent-project-identity-only',
 allocationMethod:'explicit-human-approved-offline-project-registry-v1'
},name:'JUnit 4',url:null});
P.validateProjectIdentitySnapshot(snapshot);
const canonical=P.exportProjectIdentitySnapshot(snapshot);
if(P.importProjectIdentitySnapshot(canonical).snapshotDigest!==snapshot.snapshotDigest)throw Error('OFFLINE_SNAPSHOT_REPLAY_FAILED');
fs.writeFileSync(out,canonical+'\n',{flag:'wx'});
console.log('H1_ALLOCATED',JSON.stringify({projectId,attributionId,createdAt,snapshotDigest:snapshot.snapshotDigest}));
