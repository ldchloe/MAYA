/* Lossless canonical data stays separate from MAYA's legacy display projection. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MayaSbomCompat = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function displayLicense(document, component) {
    const first = document.licenses.find(item => item.componentId === component.id);
    return first?.expression ?? first?.licenseId ?? first?.name ?? '';
  }
  function toLegacyPackage(document, component) {
    return {
      occurrenceId: component.id,
      name: String(component.name ?? 'Composant sans nom'),
      version: String(component.version ?? 'Inconnue'),
      supplier: String(component.supplier?.name ?? component.supplier ?? ''),
      purl: String(component.purl ?? ''),
      license: String(displayLicense(document, component)),
      group: String(component.group ?? ''),
      raw: component.raw
    };
  }
  function toLegacyPackages(document) {
    return document.components.filter(component => !component.isRoot).map(component => toLegacyPackage(document, component));
  }
  return { toLegacyPackage, toLegacyPackages };
});
