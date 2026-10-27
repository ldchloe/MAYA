'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {resolveApprovedAuthority}=require('../js/c01-approved-authorities.js');
const {issue}=require('../js/c01-approved-bridge-rule.js');
const packageIdentityId='maven:org.apache.logging.log4j:log4j-core:2.23.1';
const claim={externalIdentityId:packageIdentityId,packageIdentityId,predicate:'attributedToProjectIdentity',projectIdentityId:'project:log4j-not-allocated'};
test('LOG-05/06/07 wrong version, artifact and ProjectIdentity must reject',()=>{
 for(const c of [{...claim,packageIdentityId:'maven:org.apache.logging.log4j:log4j-core:2.23.2',externalIdentityId:'maven:org.apache.logging.log4j:log4j-core:2.23.2'},{...claim,packageIdentityId:'maven:org.apache.logging.log4j:log4j-api:2.23.1',externalIdentityId:'maven:org.apache.logging.log4j:log4j-api:2.23.1'},claim]){
  assert.equal(resolveApprovedAuthority(c),null);
  assert.equal(issue(c).status,'REJECTED');
 }
});
test('LOG-08/09/10/11 name, URL and caller-supplied approval do not establish authority',()=>{
 for(const c of [{...claim,name:'Apache Log4j'},{...claim,url:'https://logging.apache.org/log4j/2.x/'},{...claim,approved:true},{...claim,rule:{approved:true}}]){
  assert.equal(resolveApprovedAuthority(c),null);
  assert.equal(issue(c).status,'REJECTED');
 }
});
