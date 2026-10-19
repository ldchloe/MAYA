/* Canonical occurrences are not the legacy scoring inventory. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MayaSbomCompat = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function historicalLicense(raw) {
    return Array.isArray(raw.licenses)
      ? raw.licenses.map(x => x?.expression || x?.license?.id || x?.license?.name).filter(Boolean).join(', ')
      : '';
  }
  function toLegacyPackage(component) {
    const raw = component.raw;
    const supplier = typeof raw.supplier === 'object' && raw.supplier !== null ? (raw.supplier.name || '') : raw.supplier;
    return {
      occurrenceId: component.id,
      name: String(raw.name ?? raw.PackageName ?? raw.packageName ?? raw.spdxid ?? raw.SPDXID ?? raw.title ?? raw.component?.name ?? 'Composant sans nom'),
      version: String(raw.version ?? raw.versionInfo ?? raw.PackageVersion ?? raw.packageVersion ?? raw.component?.version ?? 'Inconnue'),
      supplier: String(supplier ?? raw.originator ?? raw.publisher ?? raw.manufacturer?.name ?? ''),
      purl: String(raw.purl ?? raw.PURL ?? ''),
      license: String(raw.licenseConcluded ?? raw.licenseDeclared ?? raw.licenseInfoInFile ?? historicalLicense(raw)),
      group: String(raw.group ?? raw.namespace ?? ''),
      raw
    };
  }
  function toLegacyPackages(document) {
    const seen = new Set(), result = [];
    for (const component of document.components) {
      // Legacy parseSBOM() only read top-level components; prepare() skipped unnamed
      // entries and deduplicated by normalized name@version, retaining the first.
      if (component.isRoot || component.parentId !== null) continue;
      const projected = toLegacyPackage(component);
      if (!projected.name || projected.name === 'Composant sans nom') continue;
      const key = projected.name + '@' + projected.version;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(projected);
    }
    return result;
  }
  return { toLegacyPackage, toLegacyPackages };
});
