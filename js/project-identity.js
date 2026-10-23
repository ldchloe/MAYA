/* C-01.1A: offline ProjectIdentity allocation and explicit package links. No Project selection. */
(function(root,factory){
 const canonical=typeof module==='object'&&module.exports?require('./enrichment-canonical.js'):root.MayaEnrichmentCanonical;
 const api=factory(canonical);
 if(typeof module==='object'&&module.exports)module.exports=api;else root.MayaProjectIdentity=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(canonical){
'use strict';
const PROJECT_POLICY_VERSION='project-resolution-v1';
const ID=/^project:[a-f0-9]{32,64}$/;
const ATTRIBUTION=/^attribution:[a-f0-9]{32,64}$/;
const RELATION=/^relation:[a-f0-9]{32,64}$/;
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const fail=message=>{throw new Error(message);};
const check=(condition,message)=>{if(!condition)fail(message);};
const copy=value=>JSON.parse(canonical.canonicalJSON(value));
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
function policy(version){check(version===PROJECT_POLICY_VERSION,'unsupported project policy version');}
function date(value){check(nonempty(value)&&!Number.isNaN(Date.parse(value)),'invalid explicit createdAt');}
function context(value){check(value!==null&&typeof value==='object'&&!Array.isArray(value),'attributionContext required');canonical.canonicalJSON(value);}
function refs(values){check(Array.isArray(values)&&values.length>0&&values.every(x=>nonempty(x)&&/^evidence:[a-zA-Z0-9:_-]+$/.test(x))&&new Set(values).size===values.length,'invalid evidenceRefs');}
function ordered(data){return {policyVersion:PROJECT_POLICY_VERSION,projects:[...data.projects].sort((a,b)=>a.id.localeCompare(b.id)),links:[...data.links].sort((a,b)=>a.relationId.localeCompare(b.relationId))};}
function digest(data){return canonical.digest(ordered(data));}
function validateProjectIdentitySnapshot(snapshot){
 check(snapshot&&typeof snapshot==='object'&&!Array.isArray(snapshot),'invalid project snapshot');
 policy(snapshot.policyVersion);
 check(Array.isArray(snapshot.projects)&&Array.isArray(snapshot.links),'invalid project snapshot collections');
 check(/^[a-f0-9]{64}$/.test(snapshot.snapshotDigest||''),'invalid project snapshot digest');
 const ids=new Set(),attributions=new Set(),relations=new Set();
 for(const p of snapshot.projects){
  check(p&&ID.test(p.id||''),'invalid opaque projectId');
  check(ATTRIBUTION.test(p.attributionId||''),'invalid attributionId');
  date(p.createdAt);context(p.attributionContext);
  check(!ids.has(p.id),'duplicate projectId');
  check(!attributions.has(p.attributionId),'duplicate attributionId');
  ids.add(p.id);attributions.add(p.attributionId);
  if(p.name!==undefined&&p.name!==null)check(nonempty(p.name),'invalid descriptive project name');
  if(p.url!==undefined&&p.url!==null)check(nonempty(p.url),'invalid descriptive project url');
 }
 for(const link of snapshot.links){
  check(link&&RELATION.test(link.relationId||''),'invalid relationId');
  check(!relations.has(link.relationId),'duplicate relationId');
  relations.add(link.relationId);
  check(nonempty(link.packageIdentityId),'invalid packageIdentityId');
  check(ids.has(link.projectId),'broken project reference');
  check(attributions.has(link.attributionId),'broken attribution reference');
  check(snapshot.projects.some(p=>p.id===link.projectId&&p.attributionId===link.attributionId),'attribution mismatch');
  refs(link.evidenceRefs);policy(link.policyVersion);date(link.createdAt);context(link.attributionContext);
  if(link.versionScope!==undefined&&link.versionScope!==null)check(nonempty(link.versionScope),'invalid versionScope');
 }
 check(digest(snapshot)===snapshot.snapshotDigest,'project snapshot integrity failure');
 return true;
}
function seal(data){const value=ordered(data);value.snapshotDigest=digest(value);validateProjectIdentitySnapshot(value);return freeze(value);}
function createProjectIdentityRegistry({policyVersion=PROJECT_POLICY_VERSION}={}){policy(policyVersion);return seal({projects:[],links:[]});}
function allocateProjectIdentity(registry,{projectId,attributionId,createdAt,attributionContext,name=null,url=null}={}){
 validateProjectIdentitySnapshot(registry);
 check(ID.test(projectId||''),'opaque projectId required');
 check(ATTRIBUTION.test(attributionId||''),'opaque attributionId required');
 date(createdAt);context(attributionContext);
 check(!registry.projects.some(p=>p.id===projectId),'duplicate projectId');
 check(!registry.projects.some(p=>p.attributionId===attributionId),'duplicate attributionId');
 const project={id:projectId,attributionId,createdAt,attributionContext:copy(attributionContext),name,url};
 return seal({projects:[...registry.projects,project],links:registry.links});
}
function linkPackageIdentity(registry,{relationId,packageIdentityId,projectId,evidenceRefs,createdAt,attributionContext,versionScope=null,policyVersion=PROJECT_POLICY_VERSION}={}){
 validateProjectIdentitySnapshot(registry);policy(policyVersion);
 check(RELATION.test(relationId||''),'invalid relationId');
 check(!registry.links.some(l=>l.relationId===relationId),'duplicate relationId');
 check(nonempty(packageIdentityId),'invalid packageIdentityId');
 const project=registry.projects.find(p=>p.id===projectId);
 check(!!project,'broken project reference');
 refs(evidenceRefs);date(createdAt);context(attributionContext);
 check(versionScope===null||nonempty(versionScope),'invalid versionScope');
 const link={relationId,packageIdentityId,projectId,attributionId:project.attributionId,evidenceRefs:[...evidenceRefs],policyVersion,createdAt,attributionContext:copy(attributionContext),versionScope};
 return seal({projects:registry.projects,links:[...registry.links,link]});
}
function getProjectIdentity(registry,projectId){validateProjectIdentitySnapshot(registry);return registry.projects.find(p=>p.id===projectId)||null;}
function findLinksForPackageIdentity(registry,packageIdentityId){validateProjectIdentitySnapshot(registry);check(nonempty(packageIdentityId),'invalid packageIdentityId');return freeze(registry.links.filter(l=>l.packageIdentityId===packageIdentityId));}
function exportProjectIdentitySnapshot(registry){validateProjectIdentitySnapshot(registry);return canonical.canonicalJSON(registry);}
function importProjectIdentitySnapshot(json){check(typeof json==='string','project snapshot JSON required');const value=JSON.parse(json);validateProjectIdentitySnapshot(value);return seal(copy(value));}
return Object.freeze({PROJECT_POLICY_VERSION,createProjectIdentityRegistry,allocateProjectIdentity,linkPackageIdentity,getProjectIdentity,findLinksForPackageIdentity,exportProjectIdentitySnapshot,importProjectIdentitySnapshot,validateProjectIdentitySnapshot});
});
