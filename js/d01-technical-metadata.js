/* Lot D technical metadata: source-preserving, deterministic and network-free. */
'use strict';
const {digest,deterministicId}=require('./enrichment-canonical.js');
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const norm=x=>typeof x==='string'&&x.trim()&&x!=='NOASSERTION'&&x!=='NONE'?x.trim():null;
function validExpression(input){
 if(typeof input!=='string'||!input.trim())return false;
 const tokens=input.match(/\(|\)|\bAND\b|\bOR\b|\bWITH\b|[A-Za-z0-9][A-Za-z0-9.+-]*/g);
 if(!tokens||tokens.join('')!==input.replace(/\s+/g,''))return false;
 let i=0;
 const atom=()=>{if(tokens[i]==='('){i++;if(!expr()||tokens[i++]!==')')return false;return true;}if(!/^[A-Za-z0-9][A-Za-z0-9.+-]*$/.test(tokens[i]||'')||['AND','OR','WITH'].includes(tokens[i]))return false;i++;if(tokens[i]==='WITH'){i++;if(!/^[A-Za-z0-9][A-Za-z0-9.+-]*$/.test(tokens[i]||'')||['AND','OR','WITH'].includes(tokens[i]))return false;i++;}return true;};
 const expr=()=>{if(!atom())return false;while(tokens[i]==='AND'||tokens[i]==='OR'){i++;if(!atom())return false;}return true;};
 return expr()&&i===tokens.length;
}
function resolveTechnicalMetadata(document,componentId){
 if(!plain(document)||!Array.isArray(document.components))throw Error('INVALID_CANONICAL_DOCUMENT');
 const component=document.components.find(x=>x.id===componentId);
 if(!component||!plain(component.raw))throw Error('UNKNOWN_COMPONENT');
 const documentDigest=digest(document),raw=component.raw,observations=[];
 const push=(field,value,semantic,sourcePath)=>{const v=norm(value);if(v!==null)observations.push({field,value:v,semantic,sourcePath})};
 if(document.format==='cyclonedx-json'){
  const licenses=Array.isArray(document.licenses)?document.licenses.filter(x=>x.componentId===componentId):[];
  for(const l of licenses){const item=l.raw||{};push('licenses',item.expression||item.license?.id||item.license?.name,'declared',l.sourcePath||'$.licenses')}
 }else if(document.format==='spdx-json'||document.format==='spdx-tag-value'){
  push('licenseDeclared',raw.licenseDeclared,'declared','$.packages[].licenseDeclared');
  push('licenseConcluded',raw.licenseConcluded,'concluded','$.packages[].licenseConcluded');
 }else throw Error('UNSUPPORTED_SBOM_FORMAT');
 if(typeof raw.language==='string')push('language',raw.language,'language','$.components[].language');
 const evidence=observations.map(o=>{const core={componentId,documentDigest,documentId:document.id,format:document.format,sourcePath:o.sourcePath,field:o.field,value:o.value,semantic:o.semantic,method:'declarative'};return {id:deterministicId('evidence',core),...core,sourceDigest:digest(core)};}).sort((a,b)=>a.id.localeCompare(b.id));
 const assertions=evidence.map(e=>{const predicate=e.semantic==='language'?'hasDeclaredLanguage':e.semantic==='concluded'?'hasConcludedLicense':'hasDeclaredLicense';const core={componentId,predicate,value:e.value,evidenceIds:[e.id]};return {id:deterministicId('assertion',core),...core,status:'verified'};}).sort((a,b)=>a.id.localeCompare(b.id));
 const conflicts=[];
 for(const semantic of ['declared','concluded']){
  const values=[...new Set(evidence.filter(e=>e.semantic===semantic).map(e=>e.value))].sort();
  if(values.length>1){const core={componentId,semantic,reason:'CONTRADICTORY_OBSERVATIONS',values};conflicts.push({id:deterministicId('conflict',core),...core})}
 }
 for(const e of evidence.filter(e=>e.semantic!=='language'&&!validExpression(e.value))){
  const core={componentId,semantic:e.semantic,reason:'INVALID_EXPRESSION',values:[e.value]};conflicts.push({id:deterministicId('conflict',core),...core});
 }
 conflicts.sort((a,b)=>a.id.localeCompare(b.id));
 const select=semantic=>{const v=[...new Set(evidence.filter(e=>e.semantic===semantic).map(e=>e.value))];return v.length===1?v[0]:null};
 const declared=select('declared'),concluded=select('concluded');
 const status=conflicts.some(c=>c.reason==='CONTRADICTORY_OBSERVATIONS')?'CONFLICTED':conflicts.some(c=>c.reason==='INVALID_EXPRESSION')?'UNKNOWN':declared||concluded?'RESOLVED':'UNKNOWN';
 const core={componentId,documentDigest,status,declared:status==='CONFLICTED'?null:declared,concluded:status==='CONFLICTED'?null:concluded,conflictIds:conflicts.map(c=>c.id)};
 const licenseDecision={id:deterministicId('decision',Object.fromEntries(Object.entries(core).filter(([key])=>key!=='documentDigest'))),...core};
 const languages=[...new Set(evidence.filter(e=>e.semantic==='language').map(e=>e.value))].sort();
 return {componentId,documentDigest,licenses:{declared,concluded},languages,evidence,assertions,conflicts,decisions:{license:licenseDecision},resultDigest:digest({evidence,assertions,conflicts,licenseDecision,languages})};
}
function verifyTechnicalMetadata(result){
 if(!plain(result)||!Array.isArray(result.evidence)||!Array.isArray(result.assertions)||!Array.isArray(result.conflicts)||!plain(result.decisions))return false;
 const ids=new Set(result.evidence.map(e=>e.id));
 return result.evidence.every(e=>{const {id,sourceDigest,...core}=e;return id===deterministicId('evidence',core)&&sourceDigest===digest(core)&&e.documentDigest===result.documentDigest&&e.componentId===result.componentId})
 &&result.assertions.every(a=>{const {id,status,...core}=a;return status==='verified'&&id===deterministicId('assertion',core)&&Array.isArray(a.evidenceIds)&&a.evidenceIds.length>0&&a.evidenceIds.every(e=>ids.has(e))})
 &&result.decisions.license.id===deterministicId('decision',Object.fromEntries(Object.entries(result.decisions.license).filter(([k])=>k!=='id'&&k!=='documentDigest')))
 &&result.resultDigest===digest({evidence:result.evidence,assertions:result.assertions,conflicts:result.conflicts,licenseDecision:result.decisions.license,languages:result.languages});
}
module.exports={resolveTechnicalMetadata,verifyTechnicalMetadata,validExpression};
