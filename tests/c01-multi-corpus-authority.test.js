'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const authority=require('../js/c01-approved-authorities.js');
const evidence=require('../js/c01-p1-p5-evidence.js');
const bridge=require('../js/c01-approved-bridge-rule.js');
const spring='project:389fa659b1d9c46c996fcbef55f8b0c0c3dc7bb9790b9db8e4755c8f82ee79ef';
const junit='project:3b8b92fd783639e12f59ff6256967b246edd5249343217fb6d669a6ce688ff8e';
const claim=(pkg,project)=>({externalIdentityId:pkg,packageIdentityId:pkg,predicate:'attributedToProjectIdentity',projectIdentityId:project});
const s=claim('maven:org.springframework:spring-core:6.1.3',spring);
const j=claim('maven:junit:junit:4.13.2',junit);
test('GEN-01 existing JUnit approval and bridge stay deterministic',()=>{
 assert.deepEqual(bridge.issue(j),bridge.issue(j));
 assert.equal(bridge.issue(j).status,'APPROVED_BRIDGE_RULE_ISSUED');
});
test('GEN-02 two approved corpus authorities are independently resolvable',()=>{
 const a=authority.resolveApprovedAuthority(s),b=authority.resolveApprovedAuthority(j);
 assert.equal(a?.status,'APPROVED');
 assert.equal(b?.status,'APPROVED');
 assert.notEqual(a.manifestDigest,b.manifestDigest);
});
test('GEN-03 and GEN-04 cross-corpus substitutions reject',()=>{
 assert.equal(authority.resolveApprovedAuthority({...s,projectIdentityId:junit}),null);
 assert.equal(authority.resolveApprovedAuthority({...j,projectIdentityId:spring}),null);
});
test('GEN-05 wrong digest cannot become an authority',()=>{
 assert.equal(authority.resolveApprovedAuthority({...s,manifestDigest:'a0af0913dd7aedbe02100d93d92ffecdd6edd70e2ad1b2b3f552d56ee12bc3fb'}),null);
});
test('GEN-06 distinct approved authority resolutions',()=>{
 const a=authority.resolveApprovedAuthority(s),b=authority.resolveApprovedAuthority(j);
 assert.notEqual(a.resolutionDigest,b.resolutionDigest);
});
test('GEN-07 order of resolution does not matter',()=>{
 const a=[s,j].map(x=>authority.resolveApprovedAuthority(x).resolutionDigest).sort();
 const b=[j,s].map(x=>authority.resolveApprovedAuthority(x).resolutionDigest).sort();
 assert.deepEqual(a,b);
});
test('GEN-08 and GEN-09 caller-supplied authority and digest are rejected',()=>{
 assert.equal(authority.resolveApprovedAuthority({...s,approved:true}),null);
 assert.equal(authority.resolveApprovedAuthority({...s,manifestDigest:'57bcf8ba76d9c79bc0bb681df2774b28d8777889e881bba71c8c7e2672b83c33'}),null);
});
test('GEN-10 offline two-corpus repository rule replay deterministic',()=>{
 const a=[j,s].map(x=>bridge.issue(x));
 const b=[s,j].map(x=>bridge.issue(x)).reverse();
 assert.deepEqual(a,b);
 assert.ok(a.every(x=>x.status==='APPROVED_BRIDGE_RULE_ISSUED'));
 assert.notEqual(a[0].rule.ruleDigest,a[1].rule.ruleDigest);
});
test('SPR-N wrong version and another Spring module fail closed',()=>{
 for(const pkg of ['maven:org.springframework:spring-core:6.1.4','maven:org.springframework:spring-beans:6.1.3'])
 assert.equal(bridge.issue(claim(pkg,spring)).status,'REJECTED');
});
test('SPR-N no context or caller-built rules are not accepted',()=>{
 assert.equal(bridge.issue({...s,rule:{approved:true}}).status,'REJECTED');
 assert.equal(bridge.issue({...s,authority:{approved:true}}).status,'REJECTED');
});
