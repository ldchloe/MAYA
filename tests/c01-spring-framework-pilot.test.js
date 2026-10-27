'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const bridge=require('../js/c01-approved-bridge-rule.js');
const authorities=require('../js/c01-approved-authorities.js');

const spring={
  predicate:'attributedToProjectIdentity',
  packageIdentityId:'maven:org.springframework:spring-core:6.1.3',
  externalIdentityId:'maven:org.springframework:spring-core:6.1.3',
  projectIdentityId:'project:'+'a'.repeat(64)
};

test('SPR-00 existing JUnit authority cannot approve an unrelated Spring package',()=>{
  assert.equal(authorities.resolveApprovedAuthority(spring),null);
  assert.equal(bridge.issue(spring).status,'REJECTED');
});

test('SPR-05 wrong version must never inherit the JUnit approval',()=>{
  assert.equal(bridge.issue({...spring,packageIdentityId:'maven:org.springframework:spring-core:6.1.4'}).status,'REJECTED');
});

test('SPR-06 another Spring artifact must not inherit approval',()=>{
  assert.equal(bridge.issue({...spring,packageIdentityId:'maven:org.springframework:spring-beans:6.1.3'}).status,'REJECTED');
});

test('SPR-08 name-only and URL-only cannot authorize a bridge',()=>{
  for(const claim of [{...spring,name:'Spring Framework'},{...spring,url:'https://spring.io'}])
    assert.equal(bridge.issue(claim).status,'REJECTED');
});

test('SPR-10 caller-supplied authority cannot override repository approval',()=>{
  assert.equal(bridge.issue({...spring,authorityRules:[{status:'APPROVED'}]}).status,'REJECTED');
});

test('SPR-11 caller-supplied bridge rule cannot override repository issuance',()=>{
  assert.equal(bridge.issue({...spring,approvedBridgeRule:{status:'APPROVED'}}).status,'REJECTED');
});

// Positive Spring tests must be introduced only with archived, independently verified
// Spring sources and a repository-controlled approval root. Do not fabricate V-PY.
