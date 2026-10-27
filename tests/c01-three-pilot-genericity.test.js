'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const issuer=require('../js/c01-approved-bridge-rule.js'),attribution=require('../js/c01-project-attribution.js');
const {dossier:junit}=require('./c01-junit-real-attribution.test.js');
const {dossier:log4j}=require('./c01-log4j-documentary-integration.test.js');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function spring(){
 const pkg='maven:org.springframework:spring-core:6.1.3',project='project:389fa659b1d9c46c996fcbef55f8b0c0c3dc7bb9790b9db8e4755c8f82ee79ef';
 const claim={predicate:'attributedToProjectIdentity',packageIdentityId:pkg,externalIdentityId:pkg,projectIdentityId:project},issued=issuer.issue(claim);
 assert.equal(issued.status,'APPROVED_BRIDGE_RULE_ISSUED');
 const base=path.join(__dirname,'../fixtures/c01/spring'),read=x=>fs.readFileSync(path.join(base,x),'utf8'),content=JSON.stringify(claim),archive=read('maven-central/spring-core-6.1.3.observation.json');
 return {packageIdentityId:pkg,externalIdentityId:pkg,projectIdentityId:project,projectSnapshot:JSON.parse(read('spring-framework-project-identity.snapshot.json')),archives:[{id:'maven-central-spring-core-6.1.3',packageIdentityId:pkg,externalIdentityId:pkg,sourceRef:'fixtures/c01/spring/maven-central/spring-core-6.1.3.observation.json',versionScope:'6.1.3',content:archive,sha256:sha(archive)}],bridgeEvidence:[{id:issued.bridgeEvidence.id,kind:'explicit-attribution',packageIdentityId:pkg,externalIdentityId:pkg,projectIdentityId:project,sourceRef:'repository:P1-P5',versionScope:'6.1.3',content,sourceDigest:sha(content),bridgeEvidenceDigest:issued.bridgeEvidence.bridgeEvidenceDigest}],authorityRules:[],exclusive:true};
}
function replay(order){
 return order.map(fn=>{const d=fn(),r=attribution.evaluate(d),rule=issuer.issue({externalIdentityId:d.externalIdentityId,packageIdentityId:d.packageIdentityId,projectIdentityId:d.projectIdentityId,predicate:'attributedToProjectIdentity'});assert.equal(r.status,'VERIFIED');assert.equal(r.eligibility,'ELIGIBLE');assert.equal(rule.status,'APPROVED_BRIDGE_RULE_ISSUED');return {package:d.packageIdentityId,project:d.projectIdentityId,assertion:r.assertion.id,evidence:r.assertion.evidenceIds[0],decision:r.decision.id,authority:rule.rule.manifestDigest}}).sort((a,b)=>a.package.localeCompare(b.package));
}
test('LOG-21 JUnit + Spring + Apache Log4j coexist independently and permutations preserve all decisions',()=>{
 const a=replay([junit,spring,log4j]),b=replay([log4j,junit,spring]);
 assert.deepEqual(a,b);
 for(const key of ['package','project','assertion','evidence','decision','authority'])assert.equal(new Set(a.map(x=>x[key])).size,3,key+' must not collide');
});
