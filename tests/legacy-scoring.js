/* Frozen reference from main: legacy CycloneDX JSON path and scoring. */
function norm(p){return {name:String(p.name??p.packageName??p.component??p['Package Name']??p.Name??p.title??'Composant sans nom'),version:String(p.version??p.packageVersion??p['Package Version']??p.Version??'Inconnue'),supplier:String(p.supplier?.name??p.supplier??p.publisher??p.manufacturer??p.Supplier??''),purl:String(p.purl??p.PURL??''),license:String(p.licenseConcluded??p.licenseDeclared??p.licenses?.[0]?.license?.id??p.license??p.License??''),group:String(p.group??p.namespace??''),raw:p}}

function parseSBOM(text,name){
 const lower=String(name||'').toLowerCase();
 if(lower.endsWith('.csv')||lower.endsWith('.txt'))return parseCSV(text);
 if(lower.endsWith('.xml'))return parseXML(text);
 let o;try{o=JSON.parse(String(text).replace(/^\\uFEFF/,''))}catch(e){throw Error('JSON invalide : '+e.message)}
 // Accepte CycloneDX, SPDX, tableaux d'objets et enveloppes courantes.
 const candidates=[o,o?.bom,o?.sbom,o?.document,o?.data,o?.result,o?.SPDX,o?.spdx];
 let arr=null;
 for(const c of candidates){if(Array.isArray(c)) {arr=c;break} if(c&&typeof c==='object'){
  for(const k of ['components','packages','Packages','package','software','items','dependencies'])if(Array.isArray(c[k])&&c[k].length){arr=c[k];break}
  if(arr)break;
 }}
 if(!arr&&Array.isArray(o?.['@graph']))arr=o['@graph'];
 if(!arr)throw Error('Structure JSON non reconnue. Attendu : CycloneDX (components) ou SPDX (packages).');
 if(!arr.length)throw Error('Le JSON est valide mais la liste des composants est vide.');
 const result=arr.filter(p=>p&&typeof p==='object').map(p=>{
  const ext=Array.isArray(p.externalRefs)?p.externalRefs.find(x=>/purl/i.test(x.referenceType||x.referenceCategory||''))?.referenceLocator:'';
  const lic=Array.isArray(p.licenses)?p.licenses.map(x=>x.expression||x.license?.id||x.license?.name).filter(Boolean).join(', '):'';
  const sup=typeof p.supplier==='object'?(p.supplier.name||''):p.supplier;
  return {...p,name:p.name??p.PackageName??p.packageName??p.spdxid??p.SPDXID??p.title??p.component?.name,
   version:p.version??p.versionInfo??p.PackageVersion??p.packageVersion??p.component?.version??'Inconnue',
   supplier:sup??p.originator??p.publisher??p.manufacturer?.name??'',
   purl:p.purl??p.PURL??ext??'',
   license:p.licenseConcluded??p.licenseDeclared??p.licenseInfoInFile??lic};
 });
 if(!result.length)throw Error('Aucun objet composant trouvé dans le JSON.');
 return result;
}

function score(p,i,n){const seed=[...p.name+p.version+p.supplier+p.purl+p.license].reduce((a,c)=>a+c.charCodeAt(0),0);const stable=x=>Math.min(5,Math.max(0,x));return {tech:stable(1.1+(p.version==='Inconnue'?1.4:0)+(p.purl?0:.5)+(seed%19)/10),supply:stable(1.2+(!p.supplier?1.1:.2)+(seed%17)/10),gov:stable(1.0+(!p.license?1.6:.2)+(seed%13)/10),geo:stable(1.4+(!p.supplier?1:.1)+(seed%11)/10),dep:stable(.8+Math.min(2.5,n/35)+(seed%9)/10)}}

function global(p){return dims.reduce((s,d)=>s+p.scores[d.k]*weights[d.k],0)/100}

function legacyPackages(text){const arr=parseSBOM(text,'fixture.json');const map=new Map();for(const raw of arr){const p=norm(raw);if(!p.name||p.name==='Composant sans nom')continue;const key=[p.name,p.version].join('@');if(!map.has(key))map.set(key,p)}return [...map.values()].map((p,i,a)=>({...p,scores:score(p,i,a.length)}))}
module.exports={legacyPackages,score,global};
