/* SHA-256 checked canonical JSON acquisition archive (not raw HTTP bytes). */
(function(root,factory){const canonical=typeof module==='object'&&module.exports?require('./enrichment-canonical.js'):root.MayaEnrichmentCanonical;const api=factory(canonical);if(typeof module==='object'&&module.exports)module.exports=api;else root.MayaIdentityArchive=api;})(typeof globalThis!=='undefined'?globalThis:this,function(canonical){
'use strict';
const FORMAT_VERSION='2';
function createMemoryBackend(){const data=new Map();return Object.freeze({put:async(k,v)=>{if(data.has(k)&&data.get(k)!==v)throw new Error('archive key collision');data.set(k,v);},get:async k=>data.get(k)||null});}
function createObservationArchive(backend){
 if(!backend||typeof backend.put!=='function'||typeof backend.get!=='function')throw new Error('archive backend required');
 async function store(acquisition){
  if(!acquisition||typeof acquisition.providerId!=='string'||typeof acquisition.url!=='string'||typeof acquisition.observedAt!=='string'||typeof acquisition.body!=='string'||!Number.isInteger(acquisition.status)&&acquisition.status!==null)throw new Error('invalid acquisition for archive');
  // Explicit allowlist: credentials and request/response headers are never persisted.
  const fields=['providerId','providerVersion','scope','url','query','observedAt','status','transport','error','body'];
  const safe={};for(const key of fields)if(Object.prototype.hasOwnProperty.call(acquisition,key))safe[key]=acquisition[key];
  const contentHash=canonical.sha256Text(safe.body);
  const raw=canonical.canonicalJSON({archiveFormatVersion:FORMAT_VERSION,contentHash,acquisition:safe});
  const sha256=canonical.sha256Text(raw),id='observation:'+sha256;
  await backend.put(id,raw);
  return Object.freeze({id,sha256,contentHash,archiveFormatVersion:FORMAT_VERSION});
 }
 async function load(reference){
  if(!reference||! /^observation:[a-f0-9]{64}$/.test(reference.id))throw new Error('invalid archive reference');
  const raw=await backend.get(reference.id);
  if(typeof raw!=='string'||canonical.sha256Text(raw)!==reference.id.slice(12))throw new Error('observation integrity failure');
  const parsed=JSON.parse(raw);
  if(parsed&&parsed.archiveFormatVersion===FORMAT_VERSION){
   if(!parsed.acquisition||typeof parsed.acquisition.body!=='string'||canonical.sha256Text(parsed.acquisition.body)!==parsed.contentHash)throw new Error('archive content integrity failure');
   return parsed.acquisition;
  }
  // Legacy v1 archives stored the canonical acquisition directly.
  if(parsed&&typeof parsed.providerId==='string'&&typeof parsed.body==='string')return parsed;
  throw new Error('unsupported archive format');
 }
 return Object.freeze({store,load});
}
return Object.freeze({createMemoryBackend,createObservationArchive,FORMAT_VERSION});
});