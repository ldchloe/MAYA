/* Monotonic import generation: stale async results cannot commit UI state. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MayaImportCoordinator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createImportCoordinator() {
    let sequence = 0;
    return {
      begin() { return ++sequence; },
      invalidate() { ++sequence; },
      isActive(id) { return id === sequence; }
    };
  }
  return { createImportCoordinator };
});
