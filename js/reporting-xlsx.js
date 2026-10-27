'use strict';
// Minimal dependency-free OOXML writer; ZIP CRC and XLSX structure validated on readback.
// Reporting is a pure projection of H01 outputs; no score formula or risk thresholds here.
const zlib=require('node:zlib');
const {digest}=require('./enrichment-canonical.js');
const riskPolicy=require('../config/h01-risk-policy.json');
const C={purple:'35205D',magenta:'BC287E',light:'F4F0F8',white:'FFFFFF',ink:'242236',grey:'697080',border:'DFD9E7',unknown:'E7E7EB',red:'F9D7DF',green:'DCEFE7'};
const xml=x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'');
const text=x=>x===null||x===undefined||x===''?'UNKNOWN':Array.isArray(x)?x.join('; ')||'UNKNOWN':String(x);
const col=n=>{let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s};
const round=x=>x===null||x===undefined?null:Math.round(x*100)/100;
function cell(value,r,c,style=0){
 const ref=col(c+1)+r;
 if(typeof value==='number'&&Number.isFinite(value))return '<c r="'+ref+'" s="'+style+'"><v>'+value+'</v></c>';
 const s=text(value);
 return '<c r="'+ref+'" s="'+(s==='UNKNOWN'?5:style)+'" t="inlineStr"><is><t>'+xml(s)+'</t></is></c>';
}
function sheet(rows,{widths=[],freeze=0,filter=null,merges=[]}={}){
 const cols=widths.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join('');
 const data=rows.map((row,i)=>'<row r="'+(i+1)+'">'+row.map((v,j)=>cell(v&&typeof v==='object'&&Object.hasOwn(v,'value')?v.value:v,i+1,j,v&&typeof v==='object'&&Object.hasOwn(v,'style')?v.style:0)).join('')+'</row>').join('');
 const merge=merges.length?'<mergeCells count="'+merges.length+'">'+merges.map(ref=>'<mergeCell ref="'+ref+'"/>').join('')+'</mergeCells>':'';
 return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
 '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0">'+
 (freeze?'<pane ySplit="'+freeze+'" topLeftCell="A'+(freeze+1)+'" activePane="bottomLeft" state="frozen"/>':'')+
 '</sheetView></sheetViews><sheetFormatPr defaultRowHeight="17"/><cols>'+cols+'</cols><sheetData>'+data+'</sheetData>'+
 (filter?'<autoFilter ref="'+filter+'"/>':'')+merge+'</worksheet>';
}
const hdr=v=>({value:v,style:2}),section=v=>({value:v,style:3}),title=v=>({value:v,style:1}),num=v=>({value:v,style:4});
const fields=[
 'Component Name','Version','PackageIdentity','ProjectIdentity / Project','Organization','Foundation','Maintainers','Namespace','Language','Declared License','Concluded License','License Decision','Legal Jurisdiction','Registered Location','Maintainer Location','Hosting Location','Development Location','Geographic Status','Recent Trust Events','Functional Criticality','Technical Risk 0-5','Governance Risk 0-5','Supply Chain Risk 0-5','Concentration Risk 0-5','Geopolitical Risk 0-5','Criticality Risk 0-5','Trust Score /100','Evidence Coverage %','Confidence','Conflict Count','Unknown Count','Top Reasons','Evidence References','Decision References','Conflict Summary','Geopolitical Region','Assessment ID'];
function detailRows(a){
 return a.enrichments.map((e,i)=>{
  const ass=a.assessments[i],geo=e.geographic||{},location=t=>geo[t]?.status==='VERIFIED'?geo[t].countryCodes.join(', '):geo[t]?.status||'UNKNOWN';
  const risk=ass.dimensions.map(d=>d.riskScore);
  const unknown=ass.dimensions.filter(d=>d.status!=='VERIFIED'&&d.status!=='NOT_APPLICABLE').length;
  const reg=ass.dimensions.find(d=>d.type==='GEOPOLITICAL_RISK')?.factsUsed?.find(f=>f.region)?.region||'UNKNOWN';
  return [e.componentName,e.version,e.packageIdentity,e.projectIdentity,e.organization,e.foundation,e.maintainer,e.namespace,e.language,e.declaredLicense,e.concludedLicense,e.licenseDecision,e.legalJurisdiction,location('REGISTERED_LOCATION'),location('MAINTAINER_LOCATION'),location('HOSTING_LOCATION'),location('DEVELOPMENT_LOCATION'),geo.LEGAL_JURISDICTION?.status||'UNKNOWN',e.events.map(ev=>ev.eventType+' '+ev.effectiveAt).join('; ')||'UNKNOWN',e.criticality,...risk,ass.trustScore,ass.evidenceCoverage,ass.confidence,e.conflictCount,unknown,ass.reasonCodes.join('; '),e.evidenceIds.join('; '),[...new Set([...e.decisionIds,...ass.inputDecisionIds])].sort().join('; '),e.conflictSummary.join('; ')||'UNKNOWN',reg,ass.assessmentId];
 });
}
function buildComex(a){
 const p=a.portfolio,summary=a.executiveSummary,diag=a.diagnostics,rows=[];
 const add=(...values)=>rows.push(values);
 add(title('MAYA  |  TRUST & EXPOSURE ANALYSIS'));
 add(/^b06-|^cyclonedx-valid/i.test(a.fileName)?'EXECUTIVE BRIEF  •  DEMO / TEST DATA':'EXECUTIVE BRIEF  •  USER-SUPPLIED SBOM');
 add('SBOM',a.fileName,'Mode',a.analysisMode,'Policy',p.policyVersion);
 add('Source digest',a.sourceDigest);
 add('Analysis timestamp','NOT_RECORDED (deterministic replay)','MAYA engine','H01-1');
 add();
 add(section('01  •  EXECUTIVE SUMMARY'));
 add('Components analyzed',diag.componentsTotal,'Scored',summary.scoredComponents,'Unknown',summary.unknownComponents);
 add('TRUST SCORE /100',num(summary.overallTrustScore),'EVIDENCE COVERAGE %',num(summary.overallCoverage),'CONFIDENCE',summary.overallCoverage===null?'UNKNOWN':summary.overallCoverage>=riskPolicy.confidenceThresholds.high?'HIGH':summary.overallCoverage>=riskPolicy.confidenceThresholds.medium?'MEDIUM':'LOW');
 add('INTERPRETATION','UNKNOWN is not zero risk. Read score alongside coverage.');
 add();
 add(section('02  •  TOP RISK DRIVERS'));
 add(...['Rank','Component','Project','Dimension','Risk 0-5','Impact','Coverage %','Confidence','Reason'].map(hdr));
 const byId=new Map(a.enrichments.map(e=>[e.componentId,e]));
 p.topRiskDrivers.slice(0,10).forEach((r,i)=>{const e=byId.get(r.subjectId),ass=p.componentAssessments.find(x=>x.subjectId===r.subjectId),d=ass.dimensions.find(x=>x.type===r.type);add(i+1,e?.componentName||r.subjectId,e?.projectIdentity||'UNKNOWN',r.type,r.riskScore,r.penalty,ass.evidenceCoverage,ass.confidence,d.reasonCodes.join('; '))});
 if(!p.topRiskDrivers.length)add('NO VERIFIED RISK DRIVERS','Coverage must be considered');
 add();
 add(section('03  •  EUROPEAN EXPOSURE  |  VERIFIED LEGAL JURISDICTION ONLY'));
 add(...['Region','Count','Population','Exposure %'].map(hdr));
 for(const [key,label] of [['EU','EU'],['EEA','EEA'],['EUROPE_NON_EU','Europe non-EU'],['NON_EU','Non-EU'],['UNKNOWN','UNKNOWN']]){const v=p.geopoliticalExposure[key];add(label,v.count,v.total,v.percentage)}
 add();
 add(section('04  •  GOVERNANCE / STRUCTURAL CONCENTRATION'));
 add(...['Metric','Largest group','Numerator','Denominator','Percentage','Unknown'].map(hdr));
 for(const [key,v] of Object.entries(p.governanceConcentration))add(key,v.value||'UNKNOWN',v.count,v.total,v.percentage,v.unknownCount);
 add();
 add(section('05  •  VERIFIED CRITICAL DEPENDENCIES'));
 add(...['Component','Criticality','Evidence'].map(hdr));
 for(const d of p.criticalDependencies)add(byId.get(d.subjectId)?.componentName||d.subjectId,d.criticality,d.evidenceId);
 if(!p.criticalDependencies.length)add('NONE VERIFIED','UNKNOWN is not LOW');
 add();
 add(section('06  •  SUPPLY CHAIN ALERTS  |  RELEASES EXCLUDED'));
 add(...['Component','Event','Effective at'].map(hdr));
 for(const e of summary.supplyChainAlerts)add(byId.get(e.subjectId)?.componentName||e.subjectId,e.eventType,e.effectiveAt);
 if(!summary.supplyChainAlerts.length)add('NO VERIFIED INCIDENT ALERTS','Not proof of absence');
 add();
 add(section('07  •  DATA GAPS / COVERAGE WARNINGS'));
 add(...['Component','Coverage %','Unknown dimensions'].map(hdr));
 for(const w of p.unknownDataWarnings.slice(0,20))add(byId.get(w.subjectId)?.componentName||w.subjectId,w.coverage,w.unknownDimensions.join(', '));
 add('Governance UNKNOWN %',diag.componentsTotal?round(100*a.enrichments.filter(e=>!e.organization&&!e.foundation&&!e.maintainer).length/diag.componentsTotal):null);
 add('Legal jurisdiction UNKNOWN %',diag.componentsTotal?round(100*a.enrichments.filter(e=>!e.legalJurisdiction).length/diag.componentsTotal):null);
 add('Hosting location UNKNOWN %',diag.componentsTotal?round(100*a.enrichments.filter(e=>e.geographic.HOSTING_LOCATION?.status!=='VERIFIED').length/diag.componentsTotal):null);
 return rows;
}
function crc32(buf){let crc=0xffffffff;for(const b of buf){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return (crc^0xffffffff)>>>0}
function zip(entries){
 const local=[],central=[];let offset=0;
 for(const [name,body] of entries){
  const file=Buffer.from(name),data=Buffer.from(body),crc=crc32(data),lh=Buffer.alloc(30);
  lh.writeUInt32LE(0x04034b50,0);lh.writeUInt16LE(20,4);lh.writeUInt32LE(crc,14);lh.writeUInt32LE(data.length,18);lh.writeUInt32LE(data.length,22);lh.writeUInt16LE(file.length,26);
  local.push(lh,file,data);
  const ch=Buffer.alloc(46);ch.writeUInt32LE(0x02014b50,0);ch.writeUInt16LE(20,4);ch.writeUInt16LE(20,6);ch.writeUInt32LE(crc,16);ch.writeUInt32LE(data.length,20);ch.writeUInt32LE(data.length,24);ch.writeUInt16LE(file.length,28);ch.writeUInt32LE(offset,42);
  central.push(ch,file);offset+=lh.length+file.length+data.length;
 }
 const cd=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(cd.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...local,cd,end]);
}
const contentTypes='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>';
const rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
const workbook='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="COMEX" sheetId="1" r:id="rId1"/><sheet name="DETAIL" sheetId="2" r:id="rId2"/></sheets></workbook>';
const wbRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="10"/><color rgb="FF'+C.ink+'"/><name val="Aptos"/></font><font><b/><sz val="18"/><color rgb="FF'+C.purple+'"/><name val="Aptos Display"/></font><font><b/><sz val="10"/><color rgb="FF'+C.white+'"/><name val="Aptos"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF'+C.purple+'"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF'+C.magenta+'"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF'+C.unknown+'"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFill="1"/><xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="0" fillId="4" borderId="0" xfId="0" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
function createWorkbook(a){
 if(!a||!a.portfolio||!Array.isArray(a.assessments)||!Array.isArray(a.enrichments)||a.assessments.length!==a.enrichments.length)throw Error('INVALID_MAYA_ANALYSIS');
 const details=detailRows(a),priority={CRITICAL:4,HIGH:3,MEDIUM:2,LOW:1,UNKNOWN:0};
 const order=[...details].sort((x,y)=>(priority[y[19]]||0)-(priority[x[19]]||0)||(x[26]==='UNKNOWN'?1:y[26]==='UNKNOWN'?-1:x[26]-y[26])||String(x[0]).localeCompare(String(y[0]))||String(x[3]).localeCompare(String(y[3])));
 const detail=[ [title('MAYA  |  COMPONENT AUDIT TRAIL')],['DETAIL  •  VERIFIED FACTS AND H01 ASSESSMENTS'],[],fields.map(hdr),...order];
 const comex=buildComex(a);
 return zip([
  ['[Content_Types].xml',contentTypes],['_rels/.rels',rels],['xl/workbook.xml',workbook],['xl/_rels/workbook.xml.rels',wbRels],['xl/styles.xml',styles],
  ['xl/worksheets/sheet1.xml',sheet(comex,{widths:[35,34,28,28,22,23,24,24,40],freeze:0})],
  ['xl/worksheets/sheet2.xml',sheet(detail,{widths:fields.map((_,i)=>i>=31?60:i>=20&&i<=30?20:30),freeze:4,filter:'A4:AK'+detail.length,merges:[]})]
 ]);
}
function unzip(buf){
 const files=new Map();let p=0;
 while(p+4<=buf.length&&buf.readUInt32LE(p)===0x04034b50){
  const method=buf.readUInt16LE(p+8),crc=buf.readUInt32LE(p+14),len=buf.readUInt32LE(p+18),nameLen=buf.readUInt16LE(p+26),extra=buf.readUInt16LE(p+28),name=buf.subarray(p+30,p+30+nameLen).toString(),start=p+30+nameLen+extra;
  const raw=buf.subarray(start,start+len),body=method===0?raw:method===8?zlib.inflateRawSync(raw):null;
  if(!body||crc32(body)!==crc)throw Error('CORRUPT_XLSX_CRC');
  files.set(name,body.toString());p=start+len;
 }
 if(!files.has('xl/workbook.xml')||!files.has('xl/worksheets/sheet2.xml')||!buf.includes(Buffer.from('PK\x05\x06')))throw Error('CORRUPT_XLSX_STRUCTURE');
 return files;
}
function parseRows(xmlText){
 const rows=[];
 for(const m of xmlText.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)){
  const values=[];
  for(const c of m[2].matchAll(/<c r="([A-Z]+)\d+"[^>]*>([\s\S]*?)<\/c>/g)){
   let idx=0;for(const letter of c[1])idx=idx*26+letter.charCodeAt(0)-64;idx--;
   const v=/<v>([^<]*)<\/v>/.exec(c[2]),t=/<t>([\s\S]*?)<\/t>/.exec(c[2]);
   values[idx]=v?Number(v[1]):t?t[1].replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&'):null;
  }
  rows[Number(m[1])-1]=values;
 }
 return rows;
}
function inspectWorkbook(buf){
 const files=unzip(buf),w=files.get('xl/workbook.xml'),s1=files.get('xl/worksheets/sheet1.xml'),s2=files.get('xl/worksheets/sheet2.xml');
 const sheets=[...w.matchAll(/<sheet name="([^"]+)"/g)].map(x=>x[1]),comex=parseRows(s1),detail=parseRows(s2).slice(4);
 const find=label=>comex.find(r=>r?.[0]===label);
 const exposure={};for(const [k,label] of [['EU','EU'],['EEA','EEA'],['EUROPE_NON_EU','Europe non-EU'],['NON_EU','Non-EU'],['UNKNOWN','UNKNOWN']]){const r=find(label);exposure[k]={count:r?.[1],total:r?.[2],percentage:r?.[3],unknownCount:0}}
 const concentration={};for(const key of ['sameOrganization','sameFoundation','sameMaintainer','sameNamespace','sameLegalJurisdiction','unknownGovernance','unknownJurisdiction']){const r=find(key);if(r)concentration[key]=key.startsWith('unknown')?{count:r[2],total:r[3],percentage:r[4],unknownCount:r[5]}:{value:r[1]==='UNKNOWN'?null:r[1],count:r[2],total:r[3],percentage:r[4],unknownCount:r[5],population:'all input components'}}
 return {sheets,zipValid:true,hasFilters:s2.includes('<autoFilter'),hasFreeze:s2.includes('<pane'),detailRows:detail.length,componentsTotal:find('Components analyzed')?.[1],overallTrustScore:find('TRUST SCORE /100')?.[1]==='UNKNOWN'?null:find('TRUST SCORE /100')?.[1],overallCoverage:find('TRUST SCORE /100')?.[3]==='UNKNOWN'?null:find('TRUST SCORE /100')?.[3],exposure,concentration,detail:detail.map(r=>({trustScore:r[26]==='UNKNOWN'?null:r[26],evidenceCoverage:r[27]==='UNKNOWN'?null:r[27],risks:r.slice(20,26).map(x=>x==='UNKNOWN'?null:x),unknownCount:r[30],conflictCount:r[29],evidenceRefs:r[32],decisionRefs:r[33]}))};
}
module.exports={createWorkbook,inspectWorkbook};
