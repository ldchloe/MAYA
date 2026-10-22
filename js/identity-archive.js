/* Immutable, SHA-256 checked observation archive. Inject a durable key/value backend. */
(function(root,factory){const canonical=typeof module==='object'&&module.exports?require('./enrichment-canonical.js'):root.MayaEnrichmentCanonical;const api=factory(canonical);if(typeof module==='object'&&module.exports)module.exports=api;else root.MayaIdentityArchive=api;})(typeof globalThis!=='undefined'?globalThis:this,function(canonical){
'use strict';
function createMemoryBackend(){const data=new Map();return Object.freeze({put:async(k,v)=>{if(data.has(k)&&data.get(k)!==v)throw new Error('archive key collision');data.set(k,v);},get:async k=>data.get(k)||null});}
function createObservationArchive(backend){
 if(!backend||typeof backend.put!=='function'||typeof backend.get!=='function')throw new Error('archive backend required');
 async function store(acquisition){
  const raw=canonical.canonicalJSON(acquisition);
  const sha256=canonical.sha256Text(raw),id='observation:'+sha256;
  await backend.put(id,raw);
  return Object.freeze({id,sha256});
 }
 async function load(reference){
  if(!reference||! /^observation:[a-f0-9]{64}$/.test(reference.id))throw new Error('invalid archive reference');
  const raw=await backend.get(reference.id);
  if(typeof raw!=='string'||canonical.sha256Text(raw)!==reference.id.slice(12))throw new Error('observation integrity failure');
  return JSON.parse(raw);
 }
 return Object.freeze({store,load});
}
return Object.freeze({createMemoryBackend,createObservationArchive});
});
