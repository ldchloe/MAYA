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
  assert.equal(fresh.length,2);
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

test('D01 legacy license concatenation fallback and supplier normalization', () => {
  const {legacyPackages}=require('./legacy-scoring.js');
  const source=JSON.stringify({
    bomFormat:'CycloneDX',specVersion:'1.5',
    components:[
      {name:'expressions',version:'2',supplier:{name:'Example'},licenses:[{expression:'MIT'},{expression:'Apache-2.0'}]},
      {name:'ids',version:'3',licenses:[{license:{id:'BSD-3-Clause'}},{license:{id:'MIT'}}]},
      {name:'unnamed-nested-parent',components:[{name:'nested-only',version:'1'}]},
      {version:'missing-name'}
    ]
  });
  const old=legacyPackages(source);
  const {document}=importCycloneDxJson(source,'licenses.json');
  const projected=toLegacyPackages(document);
  assert.equal(projected.length,old.length);
  for(let i=0;i<old.length;i++)
    for(const field of ['name','version','supplier','purl','license','group'])
      assert.equal(projected[i][field],old[i][field],field+' at '+i);
  assert.equal(projected[0].license,'MIT, Apache-2.0');
  assert.equal(projected[1].license,'BSD-3-Clause');
  assert.equal(document.components.length,5);
});

const industrialFixture=()=>({
 bomFormat:'CycloneDX',specVersion:'1.5',
 metadata:{authors:[{name:'Auditor',email:'auditor@example.org'}],
   component:{'bom-ref':'root',name:'plant-app',manufacturer:{name:'Plant OEM'}}},
 components:[
  {'bom-ref':'app',name:'app',supplier:{name:'Distributor',contact:[{email:'sales@example.org'}]},
   manufacturer:{name:'Factory'},pedigree:{ancestors:[{name:'old-app'}]},
   components:[{'bom-ref':'nested',name:'embedded'}]},
  {'bom-ref':'lib',name:'lib'}
 ],
 services:[
  {'bom-ref':'api',name:'Remote API',provider:{name:'Cloud Provider'},
   endpoints:['https://example.org/api'],authenticated:true,trustBoundary:false,
   data:[{flow:'inbound',classification:'public'}],properties:[{name:'tier',value:'external'}],
   externalReferences:[{type:'website',url:'https://example.org'}],
   services:[{'bom-ref':'subservice',name:'Internal Service'}]}
 ],
 externalReferences:[{type:'website',url:'https://example.org/bom'}],
 compositions:[{aggregate:'complete',assemblies:['app']}],
 dependencies:[
  {ref:'app',dependsOn:['lib','api']},
  {ref:'api',dependsOn:['app','subservice']},
  {ref:'subservice',dependsOn:['api']},
  {ref:'lib',dependsOn:[]},
  {ref:'nested'},
  {ref:'unknown',dependsOn:['app']},
  {ref:'app',dependsOn:[42]}
 ]
});
test('services preserve all requested canonical fields and nested services',()=>{
 const {document}=importCycloneDxJson(JSON.stringify(industrialFixture()),'industrial.json');
 const service=document.services.find(s=>s.bomRef==='api');
 for(const field of ['id','bomRef','name','provider','endpoints','authenticated','trustBoundary','data','externalReferences','properties','raw','sourcePath'])
  assert.ok(service[field]!==undefined,field);
 assert.equal(document.services.find(s=>s.bomRef==='subservice').parentId,service.id);
});
for(const [label,from,to,sourceType,targetType] of [
 ['component to component','app','lib','component','component'],
 ['component to service','app','api','component','service'],
 ['service to component','api','app','service','component'],
 ['service to service','api','subservice','service','service']
]) test(label+' dependency resolves typed endpoints',()=>{
 const {document}=importCycloneDxJson(JSON.stringify(industrialFixture()),'industrial.json');
 const edge=document.dependencies.find(d=>d.sourceReference===from&&d.targetReference===to);
 assert.equal(edge.resolved,true);
 assert.equal(edge.sourceEndpoint.resolutionStatus,'resolved');
 assert.equal(edge.targetEndpoint.resolutionStatus,'resolved');
 assert.equal(edge.sourceEndpoint.resolvedEntityType,sourceType);
 assert.equal(edge.targetEndpoint.resolvedEntityType,targetType);
 assert.ok(edge.sourceEndpoint.resolvedEntityId);
 assert.ok(edge.targetEndpoint.resolvedEntityId);
});
test('component and service duplicate bom-ref is ambiguous and partial',()=>{
 const fixture=industrialFixture();
 fixture.services.push({'bom-ref':'app',name:'Collision'});
 const {document,report}=importCycloneDxJson(JSON.stringify(fixture),'collision.json');
 assert.equal(report.status,'partial');
 assert.ok(report.ambiguousReferences>0);
 assert.ok(report.warnings.some(w=>w.code==='DUPLICATE_BOM_REF'));
 const edge=document.dependencies.find(d=>d.sourceReference==='app'&&d.targetReference==='api');
 assert.equal(edge.sourceEndpoint.resolutionStatus,'ambiguous');
 assert.equal(edge.sourceEndpoint.resolvedEntityId,null);
 assert.equal(edge.resolved,false);
});
test('empty dependency declaration is preserved and distinguished',()=>{
 const {document,report}=importCycloneDxJson(JSON.stringify(industrialFixture()),'industrial.json');
 const empty=document.dependencyDeclarations.find(d=>d.ref==='lib');
 const absentDependsOn=document.dependencyDeclarations.find(d=>d.ref==='nested');
 assert.equal(empty.validationStatus,'declared-empty');
 assert.deepEqual(empty.dependsOn,[]);
 assert.equal(absentDependsOn.validationStatus,'declared-empty');
 assert.equal(absentDependsOn.dependsOn,undefined);
 assert.ok(report.emptyDependencyDeclarations>=2);
 assert.equal(document.components.find(c=>c.bomRef==='lib').dependencyGraphStatus,'declared-empty');
});
test('absent from graph is explicitly unknown, not independent',()=>{
 const {document,report}=importCycloneDxJson(JSON.stringify(industrialFixture()),'industrial.json');
 assert.equal(document.components.find(c=>c.bomRef==='root').dependencyGraphStatus,'absent-from-graph');
 assert.ok(report.entitiesAbsentFromDependencyGraph>=1);
});
test('invalid declaration is retained in both declaration and invalid collections',()=>{
 const {document,report}=importCycloneDxJson(JSON.stringify(industrialFixture()),'industrial.json');
 const declaration=document.dependencyDeclarations.find(d=>d.validationStatus==='invalid-declaration');
 assert.equal(declaration.sourcePath,'$.dependencies[6]');
 assert.equal(declaration.raw.dependsOn[0],42);
 assert.equal(report.invalidDependencyDeclarations,1);
 assert.equal(document.invalidDependencyDeclarations.length,1);
 assert.equal(report.dependencyDeclarationsRead,7);
 assert.equal(report.dependencyRelationsCreated,6);
 assert.equal(report.missingReferences,1);
});
test('supplier and manufacturer are distinct party associations',()=>{
 const {document}=importCycloneDxJson(JSON.stringify(industrialFixture()),'industrial.json');
 const app=document.components.find(c=>c.bomRef==='app');
 const supplier=document.partyAssociations.find(p=>p.sourceEntityId===app.id&&p.role==='supplier');
 const manufacturer=document.partyAssociations.find(p=>p.sourceEntityId===app.id&&p.role==='manufacturer');
 assert.equal(supplier.observedIdentity,'Distributor');
 assert.equal(manufacturer.observedIdentity,'Factory');
 assert.notEqual(supplier.id,manufacturer.id);
 assert.equal(supplier.contacts.contact[0].email,'sales@example.org');
 assert.ok(document.partyAssociations.some(p=>p.role==='author'&&p.sourceEntityType==='document'));
 assert.ok(document.partyAssociations.some(p=>p.role==='provider'&&p.sourceEntityType==='service'));
});
test('document external references are canonical and source-preserving',()=>{
 const {document}=importCycloneDxJson(JSON.stringify(industrialFixture()),'industrial.json');
 const ref=document.externalReferences.find(r=>r.entityType==='document');
 assert.equal(ref.url,'https://example.org/bom');
 assert.equal(ref.sourcePath,'$.externalReferences[0]');
});
test('composition and provenance are preserved canonically',()=>{
 const {document}=importCycloneDxJson(JSON.stringify(industrialFixture()),'industrial.json');
 assert.equal(document.compositions.length,1);
 assert.equal(document.compositions[0].aggregate,'complete');
 assert.deepEqual(document.compositions[0].raw.assemblies,['app']);
 assert.ok(document.provenance.some(p=>p.kind==='pedigree'&&p.sourcePath==='$.components[0].pedigree'));
});
test('root and nested component bom-refs resolve across service graph',()=>{
 const fixture=industrialFixture();
 fixture.dependencies.push({ref:'root',dependsOn:['nested']});
 const {document}=importCycloneDxJson(JSON.stringify(fixture),'industrial.json');
 const edge=document.dependencies.find(d=>d.sourceReference==='root');
 assert.equal(edge.sourceEndpoint.resolutionStatus,'resolved');
 assert.equal(edge.targetEndpoint.resolutionStatus,'resolved');
 assert.equal(edge.targetEndpoint.resolvedEntityType,'component');
});
