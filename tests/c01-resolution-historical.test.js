'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {fixture,finalize,doc}=require('./enrichment-helpers.js');
const store=require('../js/enrichment-store.js'),canonical=require('../js/enrichment-canonical.js');
test('T11 historical 1.0.0 remains byte-for-byte canonical',()=>{
 const original=fixture(),expected=canonical.datasetJSON(original),digest=original.revisionDigest;
 assert.equal(store.validateSnapshot(original,doc),true);
 const imported=store.importJSON(expected,doc);
 assert.equal(imported.exportJSON(),expected);
 assert.equal(imported.snapshot().revisionDigest,digest);
 assert.deepEqual(imported.snapshot().activeDecisionIds,original.activeDecisionIds);
 assert.deepEqual(imported.snapshot().decisions,original.decisions);
 assert.deepEqual(imported.snapshot().conflicts,original.conflicts);
 assert.deepEqual(imported.snapshot().componentEnrichments,original.componentEnrichments);
 assert.equal(canonical.datasetJSON(finalize(fixture())),expected);
});
