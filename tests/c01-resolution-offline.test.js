'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const canonical=require('../js/enrichment-canonical.js');
const {run}=require('../js/c01-resolution-boundary.js');
const {fixture}=require('./c01-resolution-eligibility.test.js');
test('T15 offline replay produces identical digests without network',()=>{
 const e=fixture(['a1','a2'],['a1']);const first=run(e);
 const second=run(JSON.parse(JSON.stringify(e)));
 assert.equal(canonical.canonicalJSON(first),canonical.canonicalJSON(second));
 assert.equal(first.resultDigest,second.resultDigest);
});
