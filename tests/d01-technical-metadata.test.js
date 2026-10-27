'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {resolveTechnicalMetadata,verifyTechnicalMetadata}=require('../js/d01-technical-metadata.js');
const {canonicalJSON,digest}=require('../js/enrichment-canonical.js');
const {importCycloneDxJson}=require('../js/cyclonedx-json.js');
const cyclo=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/cyclonedx-valid.json'),'utf8'));
const cd=(licenses,language)=>({id:'document:1',format:'cyclonedx-json',raw:{bomFormat:'CycloneDX',specVersion:'1.5'},components:[{id:'component:1',raw:{name:'demo',purl:'pkg:npm/demo@1',...(language?{language}:{}),licenses}}],licenses:licenses.map((raw,i)=>({id:'license:'+(i+1),componentId:'component:1',raw,sourcePath:'$.components[0].licenses['+i+']'}))});
const sp=(declared,concluded,language)=>({id:'document:1',format:'spdx-json',raw:{spdxVersion:'SPDX-2.3'},components:[{id:'SPDXRef-Package',raw:{name:'demo',licenseDeclared:declared,licenseConcluded:concluded,...(language?{primaryPackagePurpose:language}:{})}}],licenses:[]});
function run(doc,componentId=doc.components[0].id){return resolveTechnicalMetadata(doc,componentId)}
test('D-01 CycloneDX declared Apache-2.0 and real fixture preserve original canonical SBOM',()=>{const before=canonicalJSON(cyclo);const doc=cd([{license:{id:'Apache-2.0'}}]);const r=run(doc);assert.equal(r.licenses.declared,'Apache-2.0');assert.equal(r.decisions.license.status,'RESOLVED');assert.equal(canonicalJSON(cyclo),before)});
test('D-02/D-03 SPDX declared MIT and concluded Apache-2.0 stay separate',()=>{const r=run(sp('MIT','Apache-2.0'));assert.equal(r.licenses.declared,'MIT');assert.equal(r.licenses.concluded,'Apache-2.0');assert.equal(r.conflicts.length,0)});
test('D-04 unknown licence stays null',()=>{const r=run(cd([]));assert.equal(r.licenses.declared,null);assert.equal(r.decisions.license.status,'UNKNOWN')});
for(const expression of ['Apache-2.0','MIT OR Apache-2.0','MIT AND Apache-2.0','GPL-2.0-only WITH Classpath-exception-2.0','(MIT OR Apache-2.0) AND BSD-3-Clause'])test('D-05/06/07/08 valid SPDX expression '+expression,()=>{const r=run(cd([{expression}]));assert.equal(r.licenses.declared,expression);assert.equal(r.decisions.license.status,'RESOLVED')});
test('D-09 invalid SPDX expression is not repaired',()=>{const r=run(cd([{expression:'MIT OR'}]));assert.equal(r.licenses.declared,'MIT OR');assert.equal(r.decisions.license.status,'UNKNOWN');assert.equal(r.conflicts[0].reason,'INVALID_EXPRESSION')});
test('D-10 identical observations do not conflict',()=>{const r=run(cd([{license:{id:'MIT'}},{license:{id:'MIT'}}]));assert.equal(r.conflicts.length,0);assert.equal(r.decisions.license.status,'RESOLVED')});
test('D-11 conflicting declared observations preserve conflict',()=>{const r=run(cd([{license:{id:'MIT'}},{license:{id:'Apache-2.0'}}]));assert.equal(r.conflicts.length,1);assert.equal(r.decisions.license.status,'CONFLICTED')});
test('D-12 declared != concluded does not imply conflict',()=>{const r=run(sp('MIT','GPL-2.0-only'));assert.equal(r.conflicts.length,0);assert.equal(r.licenses.concluded,'GPL-2.0-only')});
test('D-13/14 missing or tampered evidence rejected',()=>{const r=run(cd([{license:{id:'MIT'}}]));assert.equal(verifyTechnicalMetadata(r),true);assert.equal(verifyTechnicalMetadata({...r,evidence:[]}),false);assert.equal(verifyTechnicalMetadata({...r,evidence:r.evidence.map(e=>({...e,value:'Apache-2.0'}))}),false)});
test('D-15/16 permutations and offline replay identical',()=>{const a=run(cd([{license:{id:'MIT'}},{license:{id:'Apache-2.0'}}])),b=run(cd([{license:{id:'Apache-2.0'}},{license:{id:'MIT'}}]));assert.equal(a.decisions.license.id,b.decisions.license.id);assert.equal(a.decisions.license.status,b.decisions.license.status);assert.equal(canonicalJSON(run(cd([{license:{id:'MIT'}}]))),canonicalJSON(run(cd([{license:{id:'MIT'}}]))))});
test('D-17 original document unchanged',()=>{const doc=cd([{license:{id:'MIT'}}]);const before=digest(doc);run(doc);assert.equal(digest(doc),before)});
test('D-22/23/24 explicit language with evidence; absent or name-derived unknown',()=>{const a=run(cd([], 'JavaScript'));assert.deepEqual(a.languages,['JavaScript']);assert.ok(a.assertions.some(x=>x.predicate==='hasDeclaredLanguage'));assert.deepEqual(run(cd([])).languages,[]);assert.deepEqual(run({...cd([]),components:[{id:'component:1',raw:{name:'java-library'}}]}).languages,[])});
test('D-16 non-Maven CycloneDX and Maven-agnostic SPDX',()=>{assert.equal(run(cd([{license:{id:'MIT'}}])).decisions.license.status,'RESOLVED');assert.equal(run(sp('Apache-2.0','NOASSERTION')).decisions.license.status,'RESOLVED')});

test('D-01 real versioned CycloneDX fixture through existing canonical importer',()=>{
 const input=fs.readFileSync(path.join(__dirname,'fixtures/cyclonedx-valid.json'),'utf8');
 const {document,report}=importCycloneDxJson(input,'cyclonedx-valid.json');
 assert.ok(document,JSON.stringify(report.errors));
 const component=document.components.find(x=>x.raw?.['bom-ref']==='a');
 const before=JSON.stringify(document),result=run(document,component.id);
 assert.equal(result.decisions.license.status,'CONFLICTED');
 assert.deepEqual([...new Set(result.evidence.map(e=>e.value))].sort(),['Apache-2.0','MIT']);
 assert.equal(JSON.stringify(document),before);
 assert.equal(verifyTechnicalMetadata(result),true);
});
