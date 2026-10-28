'use strict';
// Preload in a fresh Node process. Any attempt to open an external connection fails.
const blocked=()=>{throw Error('BASELINE_OFFLINE_NETWORK_ATTEMPT')};
for(const mod of ['node:net','node:tls','node:dns','node:http','node:https','node:dgram']){
 const m=require(mod);for(const key of ['connect','createConnection','request','get','lookup','resolve','resolve4','resolve6','createSocket'])if(typeof m[key]==='function')m[key]=blocked;
}
globalThis.fetch=blocked;
