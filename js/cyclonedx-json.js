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
      externalReferences: [], invalidDependencyDeclarations: [], raw: source
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
    for (const field of ['components', 'dependencies']) {
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
