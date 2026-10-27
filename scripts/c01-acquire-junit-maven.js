'use strict';
const fs=require('node:fs'),path=require('node:path');
const {createMavenCentralProvider}=require('../js/identity-maven-provider.js');
const {createObservationArchive,createMemoryBackend}=require('../js/identity-archive.js');
(async()=>{
 const provider=createMavenCentralProvider({fetchImpl:fetch,now:()=>new Date().toISOString()});
 const identity={ecosystem:'maven',namespace:'junit',name:'junit',version:'4.13.2'};
 const observation=await provider.acquire(identity,{scope:'Version'});
 if(observation.status!==200||observation.transport!=='ok'||!observation.body.includes('<project'))throw Error('MAVEN_CENTRAL_ACQUISITION_FAILED: '+JSON.stringify({url:observation.url,status:observation.status,transport:observation.transport,error:observation.error}));
 const map=new Map(),backend={put:async(k,v)=>{if(map.has(k))throw Error('duplicate archive');map.set(k,v);},get:async k=>map.get(k)||null};
 const archive=createObservationArchive(backend);
 const reference=await archive.store(observation);
 const replay=await archive.load(reference);
 if(JSON.stringify(replay)!==JSON.stringify(observation))throw Error('OFFLINE_REPLAY_MISMATCH');
 const dir=path.join(__dirname,'../fixtures/c01/maven-central');fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'junit-4.13.2.observation.json'),map.get(reference.id)+'\n');
 fs.writeFileSync(path.join(dir,'junit-4.13.2.reference.json'),JSON.stringify(reference,null,2)+'\n');
 console.log('MAVEN_REAL_ACQUISITION',JSON.stringify({reference,sourceRef:observation.url,status:observation.status,observedAt:observation.observedAt,bodyLength:observation.body.length,offlineReplay:'PASS'}));
})().catch(e=>{console.error(e);process.exitCode=1;});
