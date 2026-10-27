'use strict';
// Offline, repository-source verifier. This is NOT a bridge authority issuer.
const crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const reject=()=>Object.freeze({status:'REJECTED',bridgeRule:null});
function verifyTaggedSourceChain(input){
 if(!input||!input.provenance||!Buffer.isBuffer(input.pom)||!Buffer.isBuffer(input.readme))return reject();
 const {provenance:p,pom,readme}=input;
 if(input.expectedCoordinate!==undefined&&input.expectedCoordinate!==p.packageCoordinate)return reject();
 if(p.officialRepository!=='junit-team/junit4'||p.tag!=='r4.13.2'||p.claim!=='upstream-tagged-pom-declares-maven-coordinates'||p.packageCoordinate!=='junit:junit:4.13.2'||p.bridgeAuthorityStatus!=='NOT_ISSUED')return reject();
 if(p.pom?.gitBlobSha!=='38be96092f241cb4e1ff0d9046b323b67d34b127'||p.readme?.gitBlobSha!=='739347df507869dae1df7646019866118112083f')return reject();
 if(sha(pom)!==p.pom.archiveSha256||sha(readme)!==p.readme.archiveSha256)return reject();
 // Git blob IDs are content-addressed, independently verified against the official tag.
 const blob=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length),Buffer.from([0]),b])).digest('hex');
 if(blob(pom)!==p.pom.gitBlobSha||blob(readme)!==p.readme.gitBlobSha)return reject();
 const xml=pom.toString('utf8');
 const tag=k=>{const m=xml.match(new RegExp('<'+k+'>([^<]+)</'+k+'>'));return m?.[1]};
 if(tag('groupId')!=='junit'||tag('artifactId')!=='junit'||tag('version')!=='4.13.2')return reject();
 return Object.freeze({status:'TAGGED_POM_VERIFIED_NOT_BRIDGE',packageCoordinate:p.packageCoordinate,tag:p.tag,pomSha256:sha(pom),readmeSha256:sha(readme),bridgeRule:null});
}
module.exports={verifyTaggedSourceChain};
