'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {materialize,verify}=require('../js/c01-p1-p5-evidence.js');
const {issue}=require('../js/c01-approved-bridge-rule.js');
const claim={predicate:'attributedToProjectIdentity',packageIdentityId:'maven:junit:junit:4.13.2',externalIdentityId:'maven:junit:junit:4.13.2',projectIdentityId:'project:3b8b92fd783639e12f59ff6256967b246edd5249343217fb6d669a6ce688ff8e'};
test('BR-01 verified P1-P5 produce repository Bridge Evidence and ApprovedBridgeRule',()=>{const r=issue(claim);assert.equal(r.status,'APPROVED_BRIDGE_RULE_ISSUED');assert.equal(r.verification.status,'BRIDGE_EVIDENCE_COMPLETE');assert.equal(r.bridgeEvidence.predicate,claim.predicate);assert.equal(r.rule.packageIdentityId,claim.packageIdentityId);assert.equal(r.rule.projectIdentityId,claim.projectIdentityId);});
test('BR-16/17 forged caller Bridge Evidence or rule rejected',()=>{assert.equal(issue({...claim,bridgeEvidence:{approved:true}}).status,'REJECTED');assert.equal(issue({...claim,approvedBridgeRule:{approved:true}}).status,'REJECTED');});
test('BR-09/10 wrong version and Y cannot issue',()=>{assert.equal(issue({...claim,packageIdentityId:'maven:junit:junit:4.13.1'}).status,'REJECTED');assert.equal(issue({...claim,projectIdentityId:'project:wrong'}).status,'REJECTED');});
test('BR-20 repository rule offline deterministic replay',()=>assert.deepEqual(issue(claim),issue(claim)));
