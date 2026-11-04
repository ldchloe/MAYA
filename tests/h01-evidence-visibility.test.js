'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {resolveTechnicalMetadata,verifyTechnicalMetadata}=require('../js/d01-technical-metadata.js');
const {collectDeclaredFacts}=require('../js/a01-declared-facts.js');
test('H01-EVIDENCE-01 technical VERIFIED provenance is a traceable SBOM declaration, not independent verification',()=>{
 const component={id:'occ:license',raw:{name:'libgstaudio-1.0-0',version:'1.26.7'}};
 const document={id:'sbom:test',format:'cyclonedx-json',components:[component],licenses:[{componentId:component.id,raw:{expression:'LGPL-2.1-or-later'},sourcePath:'$.components[0].licenses[0]'}]};
 const result=resolveTechnicalMetadata(document,component.id);
 assert.equal(result.decisions.license.status,'RESOLVED');
 assert.equal(result.evidence.length,1);
 assert.equal(result.evidence[0].method,'declarative');
 assert.equal(result.evidence[0].sourcePath,'$.components[0].licenses[0]');
 assert.equal(result.evidence[0].value,'LGPL-2.1-or-later');
 assert.equal(verifyTechnicalMetadata(result),true);
 assert.equal(collectDeclaredFacts(document,component).verificationStatus,'DECLARED_UNVERIFIED');
 assert.equal(verifyTechnicalMetadata({...result,evidence:[{...result.evidence[0],value:'MIT'}]}),false);
});
