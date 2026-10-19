# MAYA — Lot A: enrichment architecture

The canonical CycloneDX document is the source of truth and is never mutated. This package defines only `EnrichmentDataset`, `ComponentEnrichment`, `Project`, `Repository`, `Evidence`, `Assertion`, `Conflict`, and `Decision`.

- `ComponentEnrichment.selectedProjectId` and `.selectedRepositoryId` are nullable and require a verified assertion (`mapsToProject` or `officialRepository`) backed by evidence.
- Candidate IDs are separate from selected IDs. Project-to-repository relations are many-to-many.
- Each assertion references at least one existing evidence ID. Evidence has `evidenceKind`: `declarative`, `observed`, `verified`, or `derived`.
- Evidence is defensively copied and recursively frozen. New observations use new IDs.
- Conflict objects retain all contradictory assertion IDs. Decisions retain selected and rejected assertions, policy version and reason codes.
- The resolver does not infer official repositories from names, URLs, or SBOM declarations. The confidence policy is deterministic and does not produce risk scores.
- No organization, foundation, maintainer, country, trust event or trust assessment entities are implemented.
- No network access, build step, browser-specific dependency or UI integration is required.

## Limitations

This is a local-data foundation only. The `verified` evidence kind is a classification of supplied evidence, not independent external verification by MAYA. The initial confidence policy is heuristic and not statistically calibrated. No external registries or APIs are consulted.

## Corrections ciblées du lot A
- `Evidence.evidenceKind='verified'` exige une source vérifiable (`official-document`, `repository` ou `registry`), une empreinte SHA-256 de source et `verificationMethod='independent-check'`. Les preuves déclaratives ne peuvent pas obtenir une confiance suffisante pour être automatiquement sélectionnées comme vérifiées. Ces métadonnées sont une **attestation**, pas une vérification externe cryptographiquement authentifiée.
- `reviseStore(previousStore, nextDataset, document)` exige la conservation à l'identique des preuves, assertions et conflits antérieurs. Une nouvelle révision est obligatoire. Les appels isolés à `createStore` ne disposent pas d'un historique antérieur et ne peuvent pas le contrôler.
- Le store calcule lui-même SHA-256 sur `document.originalContent` (chaîne UTF-8 exacte) et compare à `sourceDocument.sha256`. La valeur SHA-256 facultative anciennement fournie à l'API n'est plus utilisée pour établir la confiance.
