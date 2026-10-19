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


## Consolidated revision and identity rules

`revisionId` identifies a revision; `previousRevisionId` and `previousRevisionDigest` bind it to its parent. `revisionDigest` is SHA-256 of the canonical dataset excluding `revisionDigest` itself. `enrichmentVersion` must change on a linked revision. A linked revision must be checked against its parent through `reviseStore`; standalone imports cannot claim verified history. A snapshot can be imported without a parent, but its history remains unverified.

Canonical JSON sorts object keys recursively; array order is retained, except explicitly set-like top-level entity collections sorted by `id`. Canonicalization rejects undefined, non-finite numbers, sparse arrays, cycles and non-JSON objects. This representation is shared for equality, decision `inputDigest`, revision digests and deterministic IDs.

Identity namespaces are distinct: SBOM occurrence `sourceDocument.sha256 + componentId`; Project candidate ID; Repository candidate ID; Evidence ID; EvidenceRelation ID; Assertion ID; Decision ID; Revision ID. No similarity-based identity or merge is performed. `deterministicId(type, source-scoped-key)` is provided for stable identities, with caller-owned source-scoped keys; this does not implement Lot B registry/PURL normalization. A name alone is not an acceptable identity key. Decision IDs derive from canonical input digests; revision IDs are caller-supplied and protected against reuse on linked revisions.

A correction creates a new immutable record; historical records are retained. Assertions may declare `supersedesAssertionIds` to remove old hypotheses from active evaluation without deleting them. A new decision identifies the applicable result. The digest chain is tamper-evident only relative to an independently trusted earlier digest; it is not signed or externally anchored.
