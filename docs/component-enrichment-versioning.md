# Enrichment versioning

- `schemaVersion`: exact supported schema version `1.0.0`. Unknown versions are rejected.
- `enrichmentVersion`: revision of the enrichment snapshot, independent from canonical data.
- `policyVersion`: decision rule version `1.0.0`.
- `producer.version`: implementation version.
- `sourceDocument.sha256`: SHA-256 of the original SBOM supplied by the caller; the caller is responsible for computing and authenticating it. The store checks its equality with the supplied digest and the canonical document ID.
- Evidence IDs are append-only across revisions. Existing evidence must not be rewritten.
- Decisions are deterministic for identical assertions, evidence, policy and explicit `decidedAt`.
- JSON export/import is standalone and does not modify the canonical model.

A future schema change requires an explicit migration. No implicit major-version migration is supported.

## Garantie d'historisation
Toute révision d'un store existant doit passer par `reviseStore`. L'API refuse la suppression ou la réécriture d'une Evidence, Assertion ou Conflict existante. Le rattachement au SBOM et le changement de `enrichmentVersion` sont obligatoires.

L'empreinte du SBOM est recalculée depuis `document.originalContent`, sans se fier à un hash fourni par l'appelant. La provenance du texte original reste la responsabilité de l'import canonique.
