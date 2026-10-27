# Lot D — Technical Metadata MVP

## Reuse decision

**MINIMAL EXTENSION REQUIRED.** The canonical CycloneDX adapter already retains per-component `licenses` with `license.id`, `license.name`, `expression`, `raw` and `sourcePath`; the existing SPDX compatibility projection already exposes `licenseDeclared` and `licenseConcluded` in raw package data. The deterministic canonical JSON, digest and opaque IDs are reused from `js/enrichment-canonical.js`. Evidence, Assertion, Conflict and Decision records use the existing Lot A/C conceptual model. No new engine, ADR, Maven provider, external fetch, scoring or canonical schema migration.

The standalone `resolveTechnicalMetadata(document, componentId)` API accepts canonical CycloneDX documents or source-preserving SPDX JSON / tag-value package records. SPDX is supported at the package-record contract boundary; there is no newly introduced SPDX document importer. The caller must provide a document whose `components` and `raw` fields already represent the parsed SPDX source.

## Semantics

- CycloneDX `licenses[].license.id/name` and `licenses[].expression` are treated as **declared** observations; no concluded status is invented.
- SPDX `licenseDeclared` and `licenseConcluded` are kept in separate predicates and separate semantic slots. `NOASSERTION`, `NONE`, missing and null values remain UNKNOWN.
- A declared value different from a concluded value is not by itself a conflict.
- Repeated identical observations are deduplicated semantically. Distinct contradictory values for the same semantic slot create a deterministic factual Conflict; no winner is selected.
- Invalid expressions remain unchanged and generate an `INVALID_EXPRESSION` Conflict and UNKNOWN Decision. The lightweight expression recognizer checks the required AND/OR/WITH and parentheses grammar, but is **not** a complete SPDX identifier registry or legal compatibility analyzer. Unknown identifiers are not externally validated.
- A language is observed only from an explicit `component.raw.language` field; the name, ecosystem, package coordinates, extension and repository are never used for inference.
- Every Assertion links to a deterministic Evidence record with component, source field, original value, source path, document ID, document digest, format and declarative method. The verifier checks record IDs, source digests, evidence references, decision IDs and result digest.
- The Decision ID is based on semantic results rather than the ordering of SBOM observations; document provenance remains attached separately.
- The pipeline is synchronous and offline-only. The input document is not mutated.

## Closure review

| Gate | Coverage |
| --- | --- |
| D-CLOSE-01 CycloneDX | Existing importer and real versioned fixture |
| D-CLOSE-02 SPDX | Declared/concluded raw package fields |
| D-CLOSE-03 Expressions | Simple, OR, AND, WITH and parentheses; grammar scope documented |
| D-CLOSE-04 Semantics | Declared and concluded distinct |
| D-CLOSE-05/06 Evidence/Assertions | Deterministic, source-bound and verified |
| D-CLOSE-07 Conflicts | Factual contradictions and invalid expressions preserved |
| D-CLOSE-08 UNKNOWN | Null/NOASSERTION/NONE preserved |
| D-CLOSE-09 Decisions | RESOLVED/CONFLICTED/UNKNOWN; deterministic |
| D-CLOSE-10/11/12 Language | Explicit only, absent UNKNOWN, no inference |
| D-CLOSE-13 Canonical unchanged | Digest checked before/after |
| D-CLOSE-14 Offline | No network calls, deterministic replay |
| D-CLOSE-15/16 Non-regression | Existing Node and Maven full CI |

This MVP intentionally does not perform legal license compatibility analysis, verify identifiers against an external SPDX license list, or fetch language data from GitHub. Those are not prerequisites for declarative SBOM metadata extraction.

**LOT D TECHNICAL METADATA VALIDATED.** PR #35 merged at `4ff23ca09a499225c697510015a88cb362dd2d7e` after GitHub Actions run `40511994746` passed 527/527 Node and 58/58 Maven, 0 failed and 0 skipped. Next active phase: Lot E — Governance Layer, first increment ProjectIdentity → Organization with independently archived official ownership/stewardship evidence.
