'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {prepared,clone}=require('./c01-snapshot-acceptance-fixtures.js');
const {acceptDocumentarySnapshot}=require('../js/c01-snapshot-acceptance.js');
const canonical=require('../js/enrichment-canonical.js');
test('T47 offline replay is byte-equivalent',()=>{const e=prepared({values:['alpha','beta'],allowed:['a1']});assert.equal(canonical.canonicalJSON(acceptDocumentarySnapshot(e)),canonical.canonicalJSON(acceptDocumentarySnapshot(clone(e))));});
test('T48 historical snapshot validation unchanged',()=>{const {fixture,doc}=require('./enrichment-helpers.js');const store=require('../js/enrichment-store.js');const d=fixture(),before=canonical.datasetJSON(d);assert.equal(store.validateSnapshot(d,doc),true);assert.equal(canonical.datasetJSON(d),before);});
