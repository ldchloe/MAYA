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


## Lot A consolidation — evidence-to-decision contract

The complete audited chain is `Evidence -> EvidenceRelation -> Assertion -> Conflict -> Decision -> ComponentEnrichment`. An EvidenceRelation has `id`, `evidenceId`, `assertionId`, `relation` (`supports`, `contradicts`, `inconclusive`), `subjectId`, `predicate` and optional `valueDigest`. Each assertion needs at least one `supports` link. The dataset checks subject and predicate compatibility, but **does not assert that a source is factually correct**. `contradicts` produces a conflict; `inconclusive` is retained but never increases confidence.

### Trust boundary

`declarative` = a source makes a claim. `observed` = content was observed. `derived` = transformation from other inputs. `verified` = offline source-content SHA-256 equality was recomputed against an attached verification record with `verificationMethod=sha256-content-match`, `verifierId=MAYA-local-sha256`, `verifierVersion=1.0.0`, `verifiedAt`, `sourceDigest`, `verificationArtifactDigest`, `result=passed`, `evidenceId` and `sourceContent`. The record is validated by executable code, not just metadata. This **does not establish source authenticity**, independence, official ownership, or trust in the party supplying source content. An attacker controlling the dataset and source content can construct a passing record. No external collection or authenticity service exists.

### Derived status and confidence

Positive evidence is limited to `supports`. Weighting: derived 0.4, declarative 0.6, observed 0.8, verified-content 1.0; sources are grouped by `independenceGroup || sourceRef`; at most 0.1 bonus for additional independent groups. Unverified evidence is capped below 0.95. `contradicts` creates an active conflict; `inconclusive` contributes zero. Active assertion and component confidence/status must match the deterministic resolver, otherwise snapshots are rejected. `unknown` means insufficient evidence, `conflicted` means an active contradiction, and `verified` means a selected assertion reached the policy threshold without active conflict. This is **verification of attached content**, not truth or authenticity.

A Decision records nonempty `reasonCodes`, `evidenceIds`, `conflictIds`, `policyVersion`, `engineVersion`, `inputDigest`, `selectedAssertionId`, `rejectedAssertionIds` and `decidedAt`. `activeDecisionIds` identifies applicable decisions; prior decisions remain stored. The resolver uses canonical JSON for value equality, with object keys recursively sorted and array order preserved. Timestamps are not selection criteria.

### Memory vs history

Frozen JavaScript objects prevent ordinary in-process mutation; they do not prevent deletion or modification of external JSON. `reviseStore` enforces append-only preservation of Evidence, EvidenceRelation, Verification, Assertion, Conflict and Decision when the previous store is provided. `createStore` creates roots only. `importJSON` without previous store accepts isolated snapshots and exposes `historyVerified()===false` for linked snapshots; with previous store it verifies continuity. No durable append-only database, cryptographic signer, or external authenticity guarantee is provided.

### Scope

No identity resolution, PURL normalization, registry lookups, repository collection, governance, geographical inference, trust events, risk scores or UI integration are introduced. `Organization` and `Foundation` remain future entities. Browser script order: `enrichment-canonical.js`, `enrichment-model.js`, `enrichment-evidence.js`, `enrichment-resolution.js`, `enrichment-store.js`.
