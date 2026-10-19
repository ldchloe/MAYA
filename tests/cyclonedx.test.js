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
  assert.equal(toLegacyPackages(document).filter(p => p.name === 'same').length, 1); // legacy deduplicates
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
  assert.equal(toLegacyPackages(document).length, 2); // legacy excludes root, nested and duplicates
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

test('D02 reports structural validation and rejects wrong top-level shapes', () => {
  const {report}=valid();
  assert.equal(report.validationLevel,'structural');
  for(const source of [
    {bomFormat:'CycloneDX',specVersion:'1.5',components:{}},
    {bomFormat:'CycloneDX',specVersion:'1.5',dependencies:{}},
    {bomFormat:'CycloneDX',specVersion:''}
  ]) assert.equal(importCycloneDxJson(JSON.stringify(source),'bad.json').report.status,'failed');
});
test('D02 malformed interpreted fields and entries are reported as partial', () => {
  const source={bomFormat:'CycloneDX',specVersion:'1.5',components:[42,{'bom-ref':12,name:'a',version:9,licenses:[{license:{id:8}}],externalReferences:[{url:5}],components:[false]}],dependencies:[null]};
  const {document,report}=importCycloneDxJson(JSON.stringify(source),'bad.json');
  assert.equal(report.status,'partial');
  assert.ok(report.warnings.some(x=>x.code==='INVALID_COMPONENT_FIELD'));
  assert.ok(report.warnings.some(x=>x.code==='INVALID_LICENSE'));
  assert.ok(report.warnings.some(x=>x.code==='INVALID_EXTERNAL_REFERENCE'));
  assert.ok(document.raw.components.length===2);
});
test('D03 invalid declarations retain raw, source path, reason and counters', () => {
  const source={bomFormat:'CycloneDX',specVersion:'1.5',components:[{'bom-ref':'a',name:'a'}],dependencies:[{ref:'a',dependsOn:['a']},{ref:'a',dependsOn:[3]},null,{dependsOn:[]}]};
  const {document,report}=importCycloneDxJson(JSON.stringify(source),'deps.json');
  assert.equal(report.dependencyDeclarationsRead,4);
  assert.equal(report.dependencyRelationsCreated,1);
  assert.equal(report.invalidDependencyDeclarations,3);
  assert.equal(document.invalidDependencyDeclarations.length,3);
  assert.equal(document.invalidDependencyDeclarations[0].sourcePath,'$.dependencies[1]');
  assert.deepEqual(document.invalidDependencyDeclarations[0].raw,source.dependencies[1]);
  assert.ok(document.invalidDependencyDeclarations.every(x=>x.reason));
});
test('D04 duplicated bom-ref is partial even without dependencies', () => {
  const source={bomFormat:'CycloneDX',specVersion:'1.5',components:[{'bom-ref':'dup',name:'a'},{'bom-ref':'dup',name:'b'}]};
  const {document,report}=importCycloneDxJson(JSON.stringify(source),'dups.json');
  assert.equal(document.components.length,2);
  assert.equal(report.status,'partial');
  assert.ok(report.warnings.some(x=>x.code==='DUPLICATE_BOM_REF'));
});
test('D01 D07 D19 compare every legacy scoring input, score, mean and rank', () => {
  const vm=require('node:vm');
  const {legacyPackages,global:legacyGlobal}=require('./legacy-scoring.js');
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  const scoreCode=html.slice(html.indexOf('function score(p,i,n){'),html.indexOf('function prepare('));
  const globalCode=html.slice(html.indexOf('function global(p){'),html.indexOf('function scoreHTML('));
  const current=vm.runInNewContext(scoreCode+'\n'+globalCode+'\n({score,global})',{dims:[{k:'tech'},{k:'supply'},{k:'gov'},{k:'geo'},{k:'dep'}],weights:{tech:25,supply:25,gov:20,geo:20,dep:10}});
  const source=load('cyclonedx-valid.json');
  const old=legacyPackages(source);
  const {document}=importCycloneDxJson(source,'fixture.json');
  const projected=toLegacyPackages(document);
  assert.equal(projected.length,old.length);
  const fields=['name','version','supplier','purl','license','group'];
  for(let i=0;i<old.length;i++){
    for(const field of fields) assert.equal(projected[i][field],old[i][field],field+' at '+i);
    const computed=current.score(projected[i],i,projected.length);
    for(const dim of ['tech','supply','gov','geo','dep']) assert.equal(computed[dim],old[i].scores[dim],dim+' at '+i);
    assert.equal(current.global({...projected[i],scores:computed}),legacyGlobal(old[i]));
  }
  const average=list=>list.reduce((n,p)=>n+current.global(p),0)/list.length;
  const fresh=projected.map((p,i,a)=>({...p,scores:current.score(p,i,a.length)}));
  assert.equal(average(fresh),average(old));
  const ranking=list=>list.map(p=>({key:p.name+'@'+p.version,score:current.global(p)})).sort((a,b)=>b.score-a.score);
  assert.deepEqual(JSON.parse(JSON.stringify(ranking(fresh))),JSON.parse(JSON.stringify(ranking(old))));
  assert.equal(document.components.length,5);
  assert.equal(fresh.length,3);
});
test('D14 D15 import coordinator rejects stale attempts and reset', () => {
  const {createImportCoordinator}=require('../js/import-coordinator.js');
  const coordinator=createImportCoordinator();
  const first=coordinator.begin(),second=coordinator.begin();
  assert.equal(coordinator.isActive(first),false);
  assert.equal(coordinator.isActive(second),true);
  coordinator.invalidate();
  assert.equal(coordinator.isActive(second),false);
});
test('D14 D15 async out-of-order completion and reset do not publish', async () => {
  const {createImportCoordinator}=require('../js/import-coordinator.js');
  const coordinator=createImportCoordinator(),published=[];
  let finishOld,finishNew;
  function importAsync(name,delay){
    const id=coordinator.begin();
    return new Promise(resolve=>{delay(()=>{if(coordinator.isActive(id))published.push(name);resolve()})});
  }
  const old=importAsync('old',cb=>{finishOld=cb});
  const fresh=importAsync('new',cb=>{finishNew=cb});
  finishNew();finishOld();await Promise.all([old,fresh]);
  assert.deepEqual(published,['new']);
  const pending=importAsync('reset',cb=>{finishOld=cb});
  coordinator.invalidate();finishOld();await pending;
  assert.deepEqual(published,['new']);
});
