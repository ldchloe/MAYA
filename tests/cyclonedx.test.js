const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { importCycloneDxJson } = require('../js/cyclonedx-json.js');
const { toLegacyPackages } = require('../js/sbom-compat.js');
const load = name => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
const valid = () => importCycloneDxJson(load('cyclonedx-valid.json'), 'valid.json');
test('valid CycloneDX JSON creates document and report', () => {
  const {document, report} = valid();
  assert.equal(report.status, 'partial');
  assert.equal(report.detectedFormat, 'CycloneDX JSON');
  assert.equal(report.specVersion, '1.5');
  assert.equal(report.componentsRead, 3);
  assert.equal(report.componentsCreated, 5);
  assert.equal(report.dependenciesDeclared, 3);
  assert.equal(report.dependenciesResolved, 2);
  assert.equal(report.unresolvedReferences, 1);
  assert.equal(document.originalContent, load('cyclonedx-valid.json'));
});
test('missing version stays missing in canonical model', () => {
  const {document} = valid();
  const item = document.components.find(c => c.bomRef === 'no-version');
  assert.equal(item.version, undefined);
  assert.equal(toLegacyPackages(document).find(p => p.occurrenceId === item.id).version, 'Inconnue');
});
test('identical name/version with distinct bom-ref remain separate', () => {
  const {document} = valid();
  assert.equal(document.components.filter(c => c.name === 'same' && c.version === '1').length, 2);
  assert.equal(toLegacyPackages(document).filter(p => p.name === 'same').length, 2);
});
test('resolved and unresolved dependencies are retained', () => {
  const {document, report} = valid();
  assert.equal(document.dependencies.filter(d => d.resolved).length, 2);
  assert.equal(document.dependencies.filter(d => !d.resolved).length, 1);
  assert.equal(document.dependencies.find(d => d.targetReference === 'missing').targetComponentId, null);
  assert.ok(report.warnings.some(w => w.code === 'UNRESOLVED_REFERENCE'));
});
test('all licenses and externalReferences are preserved', () => {
  const {document} = valid();
  const item = document.components.find(c => c.bomRef === 'a');
  assert.equal(item.licenseIds.length, 2);
  assert.equal(item.externalReferenceIds.length, 2);
  assert.deepEqual(document.externalReferences.map(x => x.type), ['vcs','website']);
  assert.equal(document.externalReferences[0].raw.url, 'https://example.org/source');
  assert.equal(document.identifiers.find(x => x.type === 'purl').value, 'pkg:npm/same@1');
});
test('nested component and metadata root are explicit', () => {
  const {document} = valid();
  const parent = document.components.find(c => c.bomRef === 'a');
  assert.equal(document.components.find(c => c.bomRef === 'nested').parentId, parent.id);
  assert.equal(document.components.find(c => c.id === document.rootComponentId).bomRef, 'app-root');
  assert.equal(toLegacyPackages(document).length, 4);
});
test('generic JSON is rejected', () => {
  const {document, report} = importCycloneDxJson(load('cyclonedx-invalid.json'), 'invalid.json');
  assert.equal(document, null);
  assert.equal(report.status, 'failed');
  assert.ok(report.errors.some(x => x.code === 'NOT_CYCLONEDX'));
});
test('malformed JSON reports parse error', () => {
  const {report} = importCycloneDxJson('{"bomFormat":', 'broken.json');
  assert.equal(report.status, 'failed');
  assert.equal(report.errors[0].code, 'INVALID_JSON');
});
test('missing components array is allowed', () => {
  const {document, report} = importCycloneDxJson('{"bomFormat":"CycloneDX","specVersion":"1.5"}', 'empty.json');
  assert.equal(report.status, 'success');
  assert.equal(report.componentsRead, 0);
  assert.equal(document.components.length, 0);
});
test('wrong array types are rejected', () => {
  for (const field of ['components','dependencies']) {
    const {report} = importCycloneDxJson(JSON.stringify({bomFormat:'CycloneDX',specVersion:'1.5',[field]:{}}), 'invalid.json');
    assert.equal(report.status, 'failed');
  }
});
test('clean import succeeds', () => {
  const {report} = importCycloneDxJson(JSON.stringify({bomFormat:'CycloneDX',specVersion:'1.5',components:[{'bom-ref':'x',name:'x'}],dependencies:[{ref:'x',dependsOn:[]}]}), 'clean.json');
  assert.equal(report.status, 'success');
});
test('ambiguous bom-ref is not arbitrarily resolved', () => {
  const source = {bomFormat:'CycloneDX',specVersion:'1.5',components:[{'bom-ref':'x',name:'x'},{'bom-ref':'x',name:'y'},{'bom-ref':'z',name:'z'}],dependencies:[{ref:'z',dependsOn:['x']}]};
  const {document,report} = importCycloneDxJson(JSON.stringify(source),'dup.json');
  assert.equal(report.status,'partial');
  assert.equal(document.dependencies[0].targetComponentId,null);
});
