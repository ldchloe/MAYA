/* Versioned, read-only enrichment dataset tied to an exact canonical document. */
(function(root,factory){const model=typeof module==='object'&&module.exports?require('./enrichment-model.js'):root.MayaEnrichmentModel;const api=factory(model);if(typeof module==='object'&&module.exports)module.exports=api;else root.MayaEnrichmentStore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(model){
'use strict';
// Synchronous SHA-256 over the exact UTF-8 SBOM source, compatible with Node and browsers.
function sha256Text(text){
 const bytes=typeof TextEncoder!=='undefined'?new TextEncoder().encode(text):utf8(text);
 const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
 const H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];const size=Math.ceil((bytes.length+9)/64)*64;const data=new Uint8Array(size);data.set(bytes);data[bytes.length]=128;const bitLength=BigInt(bytes.length)*8n;for(let i=0;i<8;i++)data[size-1-i]=Number((bitLength>>BigInt(8*i))&255n);
 const rotr=(x,n)=>(x>>>n)|(x<<(32-n));
 for(let offset=0;offset<size;offset+=64){const w=new Uint32Array(64);for(let i=0;i<16;i++){const j=offset+i*4;w[i]=((data[j]<<24)|(data[j+1]<<16)|(data[j+2]<<8)|data[j+3])>>>0;}for(let i=16;i<64;i++){const x=w[i-15],y=w[i-2];w[i]=(w[i-16]+(rotr(x,7)^rotr(x,18)^(x>>>3))+w[i-7]+(rotr(y,17)^rotr(y,19)^(y>>>10)))>>>0;}
 let [a,b,c,d,e,f,g,h]=H;for(let i=0;i<64;i++){const t1=(h+(rotr(e,6)^rotr(e,11)^rotr(e,25))+((e&f)^(~e&g))+K[i]+w[i])>>>0;const t2=((rotr(a,2)^rotr(a,13)^rotr(a,22))+((a&b)^(a&c)^(b&c)))>>>0;h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}for(const [i,v] of [a,b,c,d,e,f,g,h].entries())H[i]=(H[i]+v)>>>0;
 }return H.map(x=>x.toString(16).padStart(8,'0')).join('');
}
function utf8(text){const encoded=encodeURIComponent(text),out=[];for(let i=0;i<encoded.length;i++){if(encoded[i]==='%'){out.push(parseInt(encoded.slice(i+1,i+3),16));i+=2;}else out.push(encoded.charCodeAt(i));}return Uint8Array.from(out);}

function validateCanonical(dataset,document,sha256){model.check(document&&Array.isArray(document.components),'missing canonical document');model.check(dataset.sourceDocument.id===document.id,'document id mismatch');model.check(typeof document.originalContent==='string','canonical originalContent required');const actual=sha256Text(document.originalContent);model.check(dataset.sourceDocument.sha256===actual,'document digest mismatch');const ids=new Set(document.components.map(x=>x.id));for(const c of dataset.componentEnrichments)model.check(ids.has(c.componentId),'component not in canonical document: '+c.componentId);return true;}
const COLLECTIONS=new Set(['componentEnrichments','projects','repositories','evidence','assertions','conflicts','decisions']);
function canonical(x,key){if(Array.isArray(x)){const values=x.map(v=>canonical(v));if(COLLECTIONS.has(key))values.sort((a,b)=>a.id.localeCompare(b.id));return values;}if(x!==null&&typeof x==='object'){const out={};for(const k of Object.keys(x).sort())out[k]=canonical(x[k],k);return out;}return x;}
function createStore(input,document,sha256){const dataset=model.copy(input);model.validateDataset(dataset);validateCanonical(dataset,document,sha256);const frozen=model.freeze(dataset);return Object.freeze({snapshot:()=>model.freeze(model.copy(frozen)),exportJSON:()=>JSON.stringify(canonical(frozen)),getComponent:id=>{const x=frozen.componentEnrichments.find(c=>c.componentId===id);return x?model.freeze(model.copy(x)):null;}});}
function reviseStore(previousStore,input,document,sha256){
 model.check(previousStore&&typeof previousStore.snapshot==='function','previous store required');
 const previous=previousStore.snapshot(),next=model.copy(input);
 model.check(previous.sourceDocument.id===next.sourceDocument.id&&previous.sourceDocument.sha256===next.sourceDocument.sha256,'revision document mismatch');
 model.check(previous.enrichmentVersion!==next.enrichmentVersion,'revision version must change');
 for(const key of ['evidence','assertions','conflicts']){
  const existing=new Map(next[key].map(x=>[x.id,x]));
  for(const old of previous[key])model.check(existing.has(old.id)&&JSON.stringify(canonical(existing.get(old.id)))===JSON.stringify(canonical(old)),'historical '+key+' must be preserved unchanged: '+old.id);
 }
 return createStore(next,document,sha256);
}
function importJSON(json,document,sha256){model.check(typeof json==='string','JSON input required');return createStore(JSON.parse(json),document,sha256);}
return {createStore,importJSON,validateCanonical,reviseStore,sha256Text};
});