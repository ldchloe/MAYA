'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {collectDeclaredFacts,verifyDeclaredFacts}=require('../js/a01-declared-facts.js');
const {analyzeSbom}=require('../js/reporting-product.js');
const doc={id:'sbom:sample',format:'cyclonedx-json'};
const component={id:'occ:rust',raw:{name:'icu_normalizer_data',version:'1.5.0',purl:'pkg:cargo/icu_normalizer_data@1.5.0',supplier:{name:'Unverified vendor'},licenses:[{license:{id:'MIT'}}],externalReferences:[{type:'vcs',url:'https://example.org/repo'}]}};
test('A01-01 collects Cargo technical and governance declarations with source paths and unverified status',()=>{
 const x=collectDeclaredFacts(doc,component);
 assert.equal(x.ecosystem,'cargo');
 assert.equal(x.claims.find(c=>c.field==='supplier').verificationStatus,'DECLARED_UNVERIFIED');
 assert.equal(x.claims.find(c=>c.field==='license').value,'MIT');
 assert.ok(x.claims.every(c=>c.sourcePath.startsWith('$.components[]')));
 assert.equal(verifyDeclaredFacts(doc,component,x),true);
 assert.equal(verifyDeclaredFacts(doc,component,{...x,claims:[]}),false);
});
test('A01-02 declarations cannot change H01 assessments or scores',()=>{
 const sbom=JSON.stringify({bomFormat:'CycloneDX',specVersion:'1.6',version:1,components:[{type:'library',...component.raw,'bom-ref':'rust'}]});
 const before=analyzeSbom(sbom,{mode:'offline'});
 const collected=collectDeclaredFacts(before.canonical,before.components[0]);
 assert.ok(collected.claims.length);
 const after=analyzeSbom(sbom,{mode:'offline'});
 assert.deepEqual(after.assessments,before.assessments);
 assert.deepEqual(after.enrichments,before.enrichments);
 assert.equal(after.assessments[0].dimensions.find(d=>d.type==='GOVERNANCE_RISK').status,'UNKNOWN');
});
