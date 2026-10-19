/* CycloneDX JSON adapter: source-preserving, no network calls. */
(function (root, factory) {
  const model = typeof module === 'object' && module.exports
    ? require('./sbom-model.js') : root.MayaSbomModel;
  const api = factory(model);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MayaCycloneDx = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (model) {
  const { createReport, issue, finalizeReport } = model;
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  function createDocument(filename, originalContent, source) {
    return {
      id: 'document:1', fileName: filename, originalContent, format: 'cyclonedx-json',
      formatVersion: source.specVersion, serialNumber: source.serialNumber,
      metadata: source.metadata ?? null, rootComponentId: null,
      components: [], dependencies: [], identifiers: [], licenses: [],
      externalReferences: [], services: [], partyAssociations: [], compositions: [], provenance: [], dependencyDeclarations: [], invalidDependencyDeclarations: [], raw: source
    };
  }
  function validComponentShape(raw, path, report) {
    if (!object(raw)) {
      issue(report, 'warning', 'INVALID_COMPONENT', 'Composant non objet.', path);
      return;
    }
    for (const field of ['name','version','group','type','description','purl','cpe','bom-ref']) {
      if (raw[field] !== undefined && typeof raw[field] !== 'string')
        issue(report, 'warning', 'INVALID_COMPONENT_FIELD', field + ' doit être une chaîne.', path + '.' + field);
    }
    if (raw.supplier !== undefined && raw.supplier !== null &&
        !(typeof raw.supplier === 'string' || (object(raw.supplier) && (raw.supplier.name === undefined || typeof raw.supplier.name === 'string'))))
      issue(report, 'warning', 'INVALID_SUPPLIER', 'supplier doit être un objet avec name texte ou une chaîne.', path + '.supplier');
    for (const field of ['licenses','externalReferences','components']) {
      if (raw[field] !== undefined && !Array.isArray(raw[field]))
        issue(report, 'warning', 'INVALID_COMPONENT_COLLECTION', field + ' doit être un tableau.', path + '.' + field);
    }
    if (Array.isArray(raw.licenses)) raw.licenses.forEach((item, i) => {
      if (!object(item) || (item.expression !== undefined && typeof item.expression !== 'string') ||
          (item.license !== undefined && !object(item.license)) ||
          (object(item.license) && ['id','name'].some(k => item.license[k] !== undefined && typeof item.license[k] !== 'string')))
        issue(report, 'warning', 'INVALID_LICENSE', 'Entrée de licence non conforme.', path + '.licenses[' + i + ']');
    });
    if (Array.isArray(raw.externalReferences)) raw.externalReferences.forEach((item, i) => {
      if (!object(item) || ['type','url','comment'].some(k => item[k] !== undefined && typeof item[k] !== 'string'))
        issue(report, 'warning', 'INVALID_EXTERNAL_REFERENCE', 'Référence externe non conforme.', path + '.externalReferences[' + i + ']');
    });
  }
  function validateDependencyShape(raw, path, report) {
    if (!object(raw)) {
      issue(report, 'warning', 'INVALID_DEPENDENCY', 'Déclaration non objet.', path);
      return;
    }
    if (typeof raw.ref !== 'string' || !raw.ref)
      issue(report, 'warning', 'INVALID_DEPENDENCY_REF', 'ref doit être une chaîne non vide.', path + '.ref');
    if (raw.dependsOn !== undefined && (!Array.isArray(raw.dependsOn) ||
        raw.dependsOn.some(ref => typeof ref !== 'string' || !ref)))
      issue(report, 'warning', 'INVALID_DEPENDS_ON', 'dependsOn doit être un tableau de références non vides.', path + '.dependsOn');
  }
  function validateSource(source, report) {
    if (!object(source)) {
      issue(report, 'error', 'NOT_OBJECT', 'La racine JSON doit être un objet.', '$');
      return false;
    }
    if (source.bomFormat !== 'CycloneDX') {
      issue(report, 'error', 'NOT_CYCLONEDX', 'bomFormat doit valoir CycloneDX.', '$.bomFormat');
    } else report.detectedFormat = 'CycloneDX JSON';
    if (typeof source.specVersion !== 'string' || !source.specVersion.trim())
      issue(report, 'error', 'MISSING_VERSION', 'specVersion est obligatoire.', '$.specVersion');
    else report.specVersion = source.specVersion;
    for (const field of ['components', 'dependencies', 'services', 'compositions', 'externalReferences']) {
      if (own(source, field) && !Array.isArray(source[field]))
        issue(report, 'error', 'INVALID_ARRAY', field + ' doit être un tableau.', '$.' + field);
    }
    if (own(source, 'metadata') && source.metadata !== null && !object(source.metadata))
      issue(report, 'error', 'INVALID_METADATA', 'metadata doit être un objet.', '$.metadata');
    if (report.errors.length) return false;
    (source.components || []).forEach((raw, i) => validComponentShape(raw, '$.components[' + i + ']', report));
    if (object(source.metadata) && source.metadata.component !== undefined)
      validComponentShape(source.metadata.component, '$.metadata.component', report);
    (source.dependencies || []).forEach((raw, i) => validateDependencyShape(raw, '$.dependencies[' + i + ']', report));
    (source.services || []).forEach((raw, i) => {
      const path = '$.services[' + i + ']';
      if (!object(raw)) { issue(report,'warning','INVALID_SERVICE','Service non objet.',path); return; }
      for (const field of ['bom-ref','name','description'])
        if (raw[field] !== undefined && typeof raw[field] !== 'string')
          issue(report,'warning','INVALID_SERVICE_FIELD',field+' doit être une chaîne.',path+'.'+field);
      for (const field of ['endpoints','data','externalReferences','properties','services'])
        if (raw[field] !== undefined && !Array.isArray(raw[field]))
          issue(report,'warning','INVALID_SERVICE_FIELD',field+' doit être un tableau.',path+'.'+field);
      for (const field of ['authenticated','trustBoundary'])
        if (raw[field] !== undefined && typeof raw[field] !== 'boolean')
          issue(report,'warning','INVALID_SERVICE_FIELD',field+' doit être booléen.',path+'.'+field);
    });
    return true;
  }
  function addIdentifier(doc, component, type, value, path, raw) {
    if (typeof value !== 'string' || !value) return;
    const id = 'identifier:' + (doc.identifiers.length + 1);
    doc.identifiers.push({ id, componentId: component.id, type, value, sourcePath: path, raw });
    component.identifierIds.push(id);
  }
  function addLicenses(doc, component, path) {
    if (component.raw.licenses === undefined) return;
    if (!Array.isArray(component.raw.licenses)) {
      issue(doc.importReport, 'warning', 'INVALID_LICENSES', 'licenses doit être un tableau.', path + '.licenses');
      return;
    }
    component.raw.licenses.forEach((raw, i) => {
      const id = 'license:' + (doc.licenses.length + 1);
      doc.licenses.push({
        id, componentId: component.id,
        licenseId: raw?.license?.id, name: raw?.license?.name,
        expression: raw?.expression, raw, sourcePath: path + '.licenses[' + i + ']'
      });
      component.licenseIds.push(id);
    });
  }
  function addExternalReferences(doc, component, path) {
    const refs = component.raw.externalReferences;
    if (refs === undefined) return;
    if (!Array.isArray(refs)) {
      issue(doc.importReport, 'warning', 'INVALID_EXTERNAL_REFERENCES', 'externalReferences doit être un tableau.', path + '.externalReferences');
      return;
    }
    refs.forEach((raw, i) => {
      const id = 'external-reference:' + (doc.externalReferences.length + 1);
      doc.externalReferences.push({
        id, componentId: component.id, type: raw?.type, url: raw?.url,
        comment: raw?.comment, hashes: raw?.hashes, raw,
        sourcePath: path + '.externalReferences[' + i + ']'
      });
      component.externalReferenceIds.push(id);
    });
  }

  function addParty(doc, role, raw, path, entityId, entityType) {
    if (raw === undefined || raw === null) return;
    if (Array.isArray(raw)) {
      raw.forEach((item, i) => addParty(doc, role, item, path + '[' + i + ']', entityId, entityType));
      return;
    }
    const id = 'party:' + (doc.partyAssociations.length + 1);
    doc.partyAssociations.push({
      id, role, observedIdentity: typeof raw === 'string' ? raw :
        (object(raw) ? (raw.name ?? raw.email ?? raw.url ?? null) : null),
      sourceEntityId: entityId, sourceEntityType: entityType,
      contacts: object(raw) ? { email: raw.email, phone: raw.phone, url: raw.url, contact: raw.contact, address: raw.address } : null,
      sourcePath: path, raw
    });
  }
  function addPartyRoles(doc, raw, path, entityId, entityType) {
    if (!object(raw)) return;
    for (const role of ['supplier','manufacturer','author','publisher','provider','creator'])
      if (own(raw,role)) addParty(doc,role,raw[role],path+'.'+role,entityId,entityType);
    if (object(raw.lifecycles)) { /* lifecycle content remains in raw */ }
    if (object(raw.tools) && Array.isArray(raw.tools.components))
      raw.tools.components.forEach((tool,i) => addPartyRoles(doc,tool,path+'.tools.components['+i+']',entityId,entityType));
    if (Array.isArray(raw.authors))
      raw.authors.forEach((author,i) => addParty(doc,'author',author,path+'.authors['+i+']',entityId,entityType));
    if (Array.isArray(raw.manufacturers))
      raw.manufacturers.forEach((manufacturer,i) => addParty(doc,'manufacturer',manufacturer,path+'.manufacturers['+i+']',entityId,entityType));
  }
  function addDocumentReferences(doc, raw, path, entityId, entityType) {
    if (!object(raw) || raw.externalReferences === undefined) return;
    if (!Array.isArray(raw.externalReferences)) {
      issue(doc.importReport,'warning','INVALID_EXTERNAL_REFERENCES','externalReferences doit être un tableau.',path+'.externalReferences');
      return;
    }
    raw.externalReferences.forEach((reference,i) => {
      doc.externalReferences.push({
        id:'external-reference:'+(doc.externalReferences.length+1),
        componentId:entityType==='component'?entityId:null,
        entityId, entityType, type:reference?.type, url:reference?.url,
        comment:reference?.comment, hashes:reference?.hashes,
        sourcePath:path+'.externalReferences['+i+']',raw:reference
      });
    });
  }
  function addService(doc, raw, path, parentId) {
    if (!object(raw)) {
      issue(doc.importReport,'warning','INVALID_SERVICE','Service non objet conservé dans raw.',path);
      return null;
    }
    const id='service:'+(doc.services.length+1);
    const service={
      id, documentId:doc.id, parentId:parentId??null, bomRef:raw['bom-ref'],
      name:raw.name, description:raw.description, provider:raw.provider,
      endpoints:raw.endpoints, authenticated:raw.authenticated,
      trustBoundary:raw.trustBoundary, data:raw.data,
      externalReferences:raw.externalReferences, properties:raw.properties,
      sourcePath:path, raw
    };
    doc.services.push(service);
    addPartyRoles(doc,raw,path,id,'service');
    for (const field of ['provenance','evidence'])
      if (own(raw,field)) doc.provenance.push({id:'provenance:'+(doc.provenance.length+1),kind:field,
        sourceEntityId:id,sourceEntityType:'service',sourcePath:path+'.'+field,raw:raw[field]});
    addDocumentReferences(doc,raw,path,id,'service');
    if (Array.isArray(raw.services))
      raw.services.forEach((child,i)=>addService(doc,child,path+'.services['+i+']',id));
    return service;
  }
  function addDocumentMetadata(doc, source) {
    addPartyRoles(doc,source,'
    if (!object(raw)) {
      issue(doc.importReport, 'warning', 'INVALID_COMPONENT', 'Composant non objet conservé dans le document brut.', path);
      return null;
    }
    validComponentShape(raw, path, doc.importReport);
    const id = 'component:' + (doc.components.length + 1);
    const component = {
      id, documentId: doc.id, parentId: parentId ?? null, isRoot: Boolean(isRoot),
      bomRef: raw['bom-ref'], name: raw.name, version: raw.version,
      group: raw.group, type: raw.type, description: raw.description,
      supplier: raw.supplier, purl: raw.purl,
      identifierIds: [], licenseIds: [], externalReferenceIds: [],
      enrichment: { github: null, organization: null, maintainers: null, country: null },
      sourcePath: path, raw
    };
    doc.components.push(component);
    addPartyRoles(doc,raw,path,id,'component');
    for (const field of ['pedigree','evidence','provenance'])
      if (own(raw,field)) doc.provenance.push({id:'provenance:'+(doc.provenance.length+1),kind:field,
        sourceEntityId:id,sourceEntityType:'component',sourcePath:path+'.'+field,raw:raw[field]});
    addIdentifier(doc, component, 'bom-ref', raw['bom-ref'], path + "['bom-ref']", raw['bom-ref']);
    addIdentifier(doc, component, 'purl', raw.purl, path + '.purl', raw.purl);
    addIdentifier(doc, component, 'cpe', raw.cpe, path + '.cpe', raw.cpe);
    addLicenses(doc, component, path);
    addExternalReferences(doc, component, path);
    if (raw.components !== undefined) {
      if (!Array.isArray(raw.components)) {
        issue(doc.importReport, 'warning', 'INVALID_NESTED_COMPONENTS', 'components imbriqués doit être un tableau.', path + '.components');
      } else raw.components.forEach((child, i) => addComponent(doc, child, path + '.components[' + i + ']', id, false));
    }
    return component;
  }

  function indexBomRefs(doc) {
    const index=new Map();
    for (const [type, entities] of [['component',doc.components],['service',doc.services]]) {
      for (const entity of entities) {
        if (typeof entity.bomRef!=='string' || !entity.bomRef) continue;
        if (!index.has(entity.bomRef)) index.set(entity.bomRef,[]);
        index.get(entity.bomRef).push({id:entity.id,type});
      }
    }
    for (const [ref,matches] of index)
      if (matches.length>1)
        issue(doc.importReport,'warning','DUPLICATE_BOM_REF',
          'bom-ref ambigu : '+ref+' ('+matches.length+' entités).','$.components / $.services');
    return index;
  }
  function resolveReference(ref,index,missing,ambiguous) {
    const matches=index.get(ref)||[];
    if (matches.length===1)
      return {reference:ref,resolvedEntityId:matches[0].id,
        resolvedEntityType:matches[0].type,resolutionStatus:'resolved'};
    const status=matches.length?'ambiguous':'missing';
    (matches.length?ambiguous:missing).add(String(ref));
    return {reference:ref,resolvedEntityId:null,resolvedEntityType:null,resolutionStatus:status};
  }
  function addDependencies(doc,declarations) {
    const index=indexBomRefs(doc),missing=new Set(),ambiguous=new Set(),declared=new Set();
    const report=doc.importReport;
    report.dependencyDeclarationsRead=declarations.length;
    declarations.forEach((raw,i)=>{
      const path='$.dependencies['+i+']';
      let reason=null;
      if (!object(raw)) reason='Déclaration non objet.';
      else if (typeof raw.ref!=='string'||!raw.ref) reason='ref doit être une chaîne non vide.';
      else if (raw.dependsOn!==undefined &&
          (!Array.isArray(raw.dependsOn)||raw.dependsOn.some(ref=>typeof ref!=='string'||!ref)))
        reason='dependsOn doit être un tableau de références non vides.';
      const source=!reason?resolveReference(raw.ref,index,missing,ambiguous):null;
      const count=!reason?(raw.dependsOn||[]).length:0;
      const declaration={
        id:'dependency-declaration:'+(i+1),ref:object(raw)?raw.ref:undefined,
        sourceEntityId:source?.resolvedEntityId??null,
        sourceEntityType:source?.resolvedEntityType??null,
        dependsOn:object(raw)?raw.dependsOn:undefined,
        raw,sourcePath:path,validationStatus:reason?'invalid-declaration':
          count?'declared-with-dependencies':'declared-empty',
        resolutionStatus:reason?'invalid-declaration':source.resolutionStatus,
        reason
      };
      doc.dependencyDeclarations.push(declaration);
      if (reason) {
        doc.invalidDependencyDeclarations.push({
          id:'invalid-dependency:'+(doc.invalidDependencyDeclarations.length+1),
          raw,sourcePath:path,reason
        });
        report.invalidDependencyDeclarations++;
        issue(report,'warning','INVALID_DEPENDENCY',reason,path);
        return;
      }
      if (source.resolutionStatus==='resolved') declared.add(source.resolvedEntityId);
      if (!count) report.emptyDependencyDeclarations++;
      (raw.dependsOn||[]).forEach((targetRef,j)=>{
        const target=resolveReference(targetRef,index,missing,ambiguous);
        const resolved=source.resolutionStatus==='resolved' && target.resolutionStatus==='resolved';
        doc.dependencies.push({
          id:'dependency:'+(doc.dependencies.length+1),documentId:doc.id,
          declarationId:declaration.id,
          sourceReference:raw.ref,targetReference:targetRef,
          sourceComponentId:source.resolvedEntityType==='component'?source.resolvedEntityId:null,
          targetComponentId:target.resolvedEntityType==='component'?target.resolvedEntityId:null,
          sourceEntityId:source.resolvedEntityId,targetEntityId:target.resolvedEntityId,
          sourceEntityType:source.resolvedEntityType,targetEntityType:target.resolvedEntityType,
          sourceEndpoint:source,targetEndpoint:target,
          resolved,sourcePath:path+'.dependsOn['+j+']',raw
        });
        report.dependenciesDeclared++;
        report.dependencyRelationsCreated++;
        if (resolved) report.dependenciesResolved++;
      });
    });
    for (const entity of [...doc.components,...doc.services])
      entity.dependencyGraphStatus=declared.has(entity.id)
        ? (doc.dependencyDeclarations.some(d=>d.sourceEntityId===entity.id && d.validationStatus==='declared-with-dependencies')
          ? 'declared-with-dependencies':'declared-empty')
        : 'absent-from-graph';
    report.entitiesAbsentFromDependencyGraph=[...doc.components,...doc.services]
      .filter(entity=>entity.dependencyGraphStatus==='absent-from-graph').length;
    report.missingReferences=missing.size;
    report.ambiguousReferences=ambiguous.size;
    report.unresolvedReferences=missing.size+ambiguous.size;
    for (const ref of missing)
      issue(report,'warning','UNRESOLVED_REFERENCE','Référence absente : '+ref,'$.dependencies');
    for (const ref of ambiguous)
      issue(report,'warning','UNRESOLVED_REFERENCE','Référence ambiguë : '+ref,'$.dependencies');
  }
  function importCycloneDxJson(text, filename) {
    const report = createReport();
    let source;
    try { source = JSON.parse(String(text).replace(/^\uFEFF/, '')); }
    catch (error) {
      issue(report, 'error', 'INVALID_JSON', 'JSON invalide : ' + error.message, '$');
      return { document: null, report: finalizeReport(report, true) };
    }
    if (!validateSource(source, report))
      return { document: null, report: finalizeReport(report, true) };
    const doc = createDocument(filename, text, source);
    doc.importReport = report;
    addDocumentMetadata(doc,source);
    const components = source.components || [];
    report.componentsRead = components.length;
    if (object(source.metadata) && own(source.metadata, 'component')) {
      const root = addComponent(doc, source.metadata.component, '$.metadata.component', null, true);
      doc.rootComponentId = root?.id ?? null;
    }
    components.forEach((raw, i) => addComponent(doc, raw, '$.components[' + i + ']', null, false));
    report.componentsCreated = doc.components.length;
    (source.services||[]).forEach((raw,i)=>addService(doc,raw,'$.services['+i+']',null));
    addDependencies(doc, source.dependencies || []);
    finalizeReport(report, false);
    return { document: doc, report };
  }
  return { importCycloneDxJson };
});
,doc.id,'document');
    addDocumentReferences(doc,source,'
    if (!object(raw)) {
      issue(doc.importReport, 'warning', 'INVALID_COMPONENT', 'Composant non objet conservé dans le document brut.', path);
      return null;
    }
    validComponentShape(raw, path, doc.importReport);
    const id = 'component:' + (doc.components.length + 1);
    const component = {
      id, documentId: doc.id, parentId: parentId ?? null, isRoot: Boolean(isRoot),
      bomRef: raw['bom-ref'], name: raw.name, version: raw.version,
      group: raw.group, type: raw.type, description: raw.description,
      supplier: raw.supplier, purl: raw.purl,
      identifierIds: [], licenseIds: [], externalReferenceIds: [],
      enrichment: { github: null, organization: null, maintainers: null, country: null },
      sourcePath: path, raw
    };
    doc.components.push(component);
    addIdentifier(doc, component, 'bom-ref', raw['bom-ref'], path + "['bom-ref']", raw['bom-ref']);
    addIdentifier(doc, component, 'purl', raw.purl, path + '.purl', raw.purl);
    addIdentifier(doc, component, 'cpe', raw.cpe, path + '.cpe', raw.cpe);
    addLicenses(doc, component, path);
    addExternalReferences(doc, component, path);
    if (raw.components !== undefined) {
      if (!Array.isArray(raw.components)) {
        issue(doc.importReport, 'warning', 'INVALID_NESTED_COMPONENTS', 'components imbriqués doit être un tableau.', path + '.components');
      } else raw.components.forEach((child, i) => addComponent(doc, child, path + '.components[' + i + ']', id, false));
    }
    return component;
  }
  function indexBomRefs(doc) {
    const index = new Map();
    for (const component of doc.components) {
      if (typeof component.bomRef !== 'string' || !component.bomRef) continue;
      const matches = index.get(component.bomRef) || [];
      matches.push(component.id);
      index.set(component.bomRef, matches);
    }
    for (const [ref, ids] of index) {
      if (ids.length > 1)
        issue(doc.importReport, 'warning', 'DUPLICATE_BOM_REF',
          'bom-ref dupliqué : ' + ref + ' (' + ids.length + ' occurrences).', '$.components');
    }
    return index;
  }
  function resolveReference(ref, index, unresolved) {
    const matches = index.get(ref) || [];
    if (matches.length === 1) return matches[0];
    unresolved.add(String(ref));
    return null;
  }
  function addInvalidDependency(doc, raw, path, reason) {
    doc.invalidDependencyDeclarations.push({
      id: 'invalid-dependency:' + (doc.invalidDependencyDeclarations.length + 1),
      raw, sourcePath: path, reason
    });
    doc.importReport.invalidDependencyDeclarations++;
    issue(doc.importReport, 'warning', 'INVALID_DEPENDENCY', reason, path);
  }
  function addDependencies(doc, declarations) {
    const index = indexBomRefs(doc), unresolved = new Set();
    doc.importReport.dependencyDeclarationsRead = declarations.length;
    declarations.forEach((declaration, i) => {
      const path = '$.dependencies[' + i + ']';
      if (!object(declaration)) {
        addInvalidDependency(doc, declaration, path, 'Déclaration non objet.');
        return;
      }
      if (typeof declaration.ref !== 'string' || !declaration.ref) {
        addInvalidDependency(doc, declaration, path, 'ref doit être une chaîne non vide.');
        return;
      }
      if (declaration.dependsOn !== undefined &&
          (!Array.isArray(declaration.dependsOn) || declaration.dependsOn.some(ref => typeof ref !== 'string' || !ref))) {
        addInvalidDependency(doc, declaration, path, 'dependsOn doit être un tableau de références non vides.');
        return;
      }
      const sourceId = resolveReference(declaration.ref, index, unresolved);
      (declaration.dependsOn || []).forEach((targetRef, j) => {
        const targetId = resolveReference(targetRef, index, unresolved);
        const id = 'dependency:' + (doc.dependencies.length + 1);
        doc.dependencies.push({
          id, documentId: doc.id, sourceReference: declaration.ref,
          targetReference: targetRef, sourceComponentId: sourceId,
          targetComponentId: targetId, resolved: Boolean(sourceId && targetId),
          sourcePath: path + '.dependsOn[' + j + ']', raw: declaration
        });
        doc.importReport.dependenciesDeclared++;
        doc.importReport.dependencyRelationsCreated++;
        if (sourceId && targetId) doc.importReport.dependenciesResolved++;
      });
    });
    doc.importReport.unresolvedReferences = unresolved.size;
    for (const ref of unresolved)
      issue(doc.importReport, 'warning', 'UNRESOLVED_REFERENCE',
        'Référence de dépendance absente ou ambiguë : ' + ref, '$.dependencies');
  }
  function importCycloneDxJson(text, filename) {
    const report = createReport();
    let source;
    try { source = JSON.parse(String(text).replace(/^\uFEFF/, '')); }
    catch (error) {
      issue(report, 'error', 'INVALID_JSON', 'JSON invalide : ' + error.message, '$');
      return { document: null, report: finalizeReport(report, true) };
    }
    if (!validateSource(source, report))
      return { document: null, report: finalizeReport(report, true) };
    const doc = createDocument(filename, text, source);
    doc.importReport = report;
    const components = source.components || [];
    report.componentsRead = components.length;
    if (object(source.metadata) && own(source.metadata, 'component')) {
      const root = addComponent(doc, source.metadata.component, '$.metadata.component', null, true);
      doc.rootComponentId = root?.id ?? null;
    }
    components.forEach((raw, i) => addComponent(doc, raw, '$.components[' + i + ']', null, false));
    report.componentsCreated = doc.components.length;
    addDependencies(doc, source.dependencies || []);
    finalizeReport(report, false);
    return { document: doc, report };
  }
  return { importCycloneDxJson };
});
,doc.id,'document');
    if (object(source.metadata)) {
      addPartyRoles(doc,source.metadata,'$.metadata',doc.id,'document');
      addDocumentReferences(doc,source.metadata,'$.metadata',doc.id,'document');
      if (object(source.metadata.tools)) {
        const tools=source.metadata.tools;
        if (Array.isArray(tools.components))
          tools.components.forEach((item,i)=>addPartyRoles(doc,item,'$.metadata.tools.components['+i+']',doc.id,'document'));
        if (Array.isArray(tools.services))
          tools.services.forEach((item,i)=>addPartyRoles(doc,item,'$.metadata.tools.services['+i+']',doc.id,'document'));
      }
    }
    (source.compositions||[]).forEach((raw,i)=>doc.compositions.push({
      id:'composition:'+(i+1),aggregate:raw?.aggregate,assemblies:raw?.assemblies,
      dependencies:raw?.dependencies,vulnerabilities:raw?.vulnerabilities,
      bomRef:raw?.['bom-ref'],sourcePath:'$.compositions['+i+']',raw
    }));
    for (const [field, value] of Object.entries(source)) {
      if (field === 'formulation' || field === 'pedigree' || field === 'evidence')
        doc.provenance.push({id:'provenance:'+(doc.provenance.length+1),kind:field,
          sourcePath:'$.'+field,raw:value});
    }
    if (object(source.metadata)) {
      for (const [field,value] of Object.entries(source.metadata))
        if (field === 'lifecycles' || field === 'tools' || field === 'properties')
          doc.provenance.push({id:'provenance:'+(doc.provenance.length+1),kind:field,
            sourcePath:'$.metadata.'+field,raw:value});
    }
  }

  function addComponent(doc, raw, path, parentId, isRoot) {
    if (!object(raw)) {
      issue(doc.importReport, 'warning', 'INVALID_COMPONENT', 'Composant non objet conservé dans le document brut.', path);
      return null;
    }
    validComponentShape(raw, path, doc.importReport);
    const id = 'component:' + (doc.components.length + 1);
    const component = {
      id, documentId: doc.id, parentId: parentId ?? null, isRoot: Boolean(isRoot),
      bomRef: raw['bom-ref'], name: raw.name, version: raw.version,
      group: raw.group, type: raw.type, description: raw.description,
      supplier: raw.supplier, purl: raw.purl,
      identifierIds: [], licenseIds: [], externalReferenceIds: [],
      enrichment: { github: null, organization: null, maintainers: null, country: null },
      sourcePath: path, raw
    };
    doc.components.push(component);
    addIdentifier(doc, component, 'bom-ref', raw['bom-ref'], path + "['bom-ref']", raw['bom-ref']);
    addIdentifier(doc, component, 'purl', raw.purl, path + '.purl', raw.purl);
    addIdentifier(doc, component, 'cpe', raw.cpe, path + '.cpe', raw.cpe);
    addLicenses(doc, component, path);
    addExternalReferences(doc, component, path);
    if (raw.components !== undefined) {
      if (!Array.isArray(raw.components)) {
        issue(doc.importReport, 'warning', 'INVALID_NESTED_COMPONENTS', 'components imbriqués doit être un tableau.', path + '.components');
      } else raw.components.forEach((child, i) => addComponent(doc, child, path + '.components[' + i + ']', id, false));
    }
    return component;
  }
  function indexBomRefs(doc) {
    const index = new Map();
    for (const component of doc.components) {
      if (typeof component.bomRef !== 'string' || !component.bomRef) continue;
      const matches = index.get(component.bomRef) || [];
      matches.push(component.id);
      index.set(component.bomRef, matches);
    }
    for (const [ref, ids] of index) {
      if (ids.length > 1)
        issue(doc.importReport, 'warning', 'DUPLICATE_BOM_REF',
          'bom-ref dupliqué : ' + ref + ' (' + ids.length + ' occurrences).', '$.components');
    }
    return index;
  }
  function resolveReference(ref, index, unresolved) {
    const matches = index.get(ref) || [];
    if (matches.length === 1) return matches[0];
    unresolved.add(String(ref));
    return null;
  }
  function addInvalidDependency(doc, raw, path, reason) {
    doc.invalidDependencyDeclarations.push({
      id: 'invalid-dependency:' + (doc.invalidDependencyDeclarations.length + 1),
      raw, sourcePath: path, reason
    });
    doc.importReport.invalidDependencyDeclarations++;
    issue(doc.importReport, 'warning', 'INVALID_DEPENDENCY', reason, path);
  }
  function addDependencies(doc, declarations) {
    const index = indexBomRefs(doc), unresolved = new Set();
    doc.importReport.dependencyDeclarationsRead = declarations.length;
    declarations.forEach((declaration, i) => {
      const path = '$.dependencies[' + i + ']';
      if (!object(declaration)) {
        addInvalidDependency(doc, declaration, path, 'Déclaration non objet.');
        return;
      }
      if (typeof declaration.ref !== 'string' || !declaration.ref) {
        addInvalidDependency(doc, declaration, path, 'ref doit être une chaîne non vide.');
        return;
      }
      if (declaration.dependsOn !== undefined &&
          (!Array.isArray(declaration.dependsOn) || declaration.dependsOn.some(ref => typeof ref !== 'string' || !ref))) {
        addInvalidDependency(doc, declaration, path, 'dependsOn doit être un tableau de références non vides.');
        return;
      }
      const sourceId = resolveReference(declaration.ref, index, unresolved);
      (declaration.dependsOn || []).forEach((targetRef, j) => {
        const targetId = resolveReference(targetRef, index, unresolved);
        const id = 'dependency:' + (doc.dependencies.length + 1);
        doc.dependencies.push({
          id, documentId: doc.id, sourceReference: declaration.ref,
          targetReference: targetRef, sourceComponentId: sourceId,
          targetComponentId: targetId, resolved: Boolean(sourceId && targetId),
          sourcePath: path + '.dependsOn[' + j + ']', raw: declaration
        });
        doc.importReport.dependenciesDeclared++;
        doc.importReport.dependencyRelationsCreated++;
        if (sourceId && targetId) doc.importReport.dependenciesResolved++;
      });
    });
    doc.importReport.unresolvedReferences = unresolved.size;
    for (const ref of unresolved)
      issue(doc.importReport, 'warning', 'UNRESOLVED_REFERENCE',
        'Référence de dépendance absente ou ambiguë : ' + ref, '$.dependencies');
  }
  function importCycloneDxJson(text, filename) {
    const report = createReport();
    let source;
    try { source = JSON.parse(String(text).replace(/^\uFEFF/, '')); }
    catch (error) {
      issue(report, 'error', 'INVALID_JSON', 'JSON invalide : ' + error.message, '$');
      return { document: null, report: finalizeReport(report, true) };
    }
    if (!validateSource(source, report))
      return { document: null, report: finalizeReport(report, true) };
    const doc = createDocument(filename, text, source);
    doc.importReport = report;
    const components = source.components || [];
    report.componentsRead = components.length;
    if (object(source.metadata) && own(source.metadata, 'component')) {
      const root = addComponent(doc, source.metadata.component, '$.metadata.component', null, true);
      doc.rootComponentId = root?.id ?? null;
    }
    components.forEach((raw, i) => addComponent(doc, raw, '$.components[' + i + ']', null, false));
    report.componentsCreated = doc.components.length;
    addDependencies(doc, source.dependencies || []);
    finalizeReport(report, false);
    return { document: doc, report };
  }
  return { importCycloneDxJson };
});
