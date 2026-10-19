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
