/* Canonical, in-memory CycloneDX data model. No scoring or UI dependencies. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MayaSbomModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createReport() {
    return {
      status: 'failed', validationLevel: 'structural', detectedFormat: null, specVersion: null,
      componentsRead: 0, componentsCreated: 0,
      dependenciesDeclared: 0, dependenciesResolved: 0,
      dependencyDeclarationsRead: 0, dependencyRelationsCreated: 0,
      invalidDependencyDeclarations: 0,
      unresolvedReferences: 0, warnings: [], errors: []
    };
  }
  function issue(report, severity, code, message, sourcePath) {
    report[severity === 'error' ? 'errors' : 'warnings'].push({ severity, code, message, sourcePath });
  }
  function finalizeReport(report, fatal) {
    report.status = fatal || report.errors.length ? 'failed'
      : report.warnings.length ? 'partial' : 'success';
    return report;
  }
  return { createReport, issue, finalizeReport };
});
