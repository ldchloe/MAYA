# ADR-09 — Local evidence validation is not source authenticity

Status: Proposed for architectural review (does not modify ADR-01 through ADR-08).

## Context
Lot A is offline and has no trusted external collector, signature verifier or registry. An imported record may contain both content and its digest.

## Decision proposed
Treat `verified` as **locally verified content-digest consistency**, not authenticated external truth. Require an executable offline check against attached content and an explicit verification record. Keep declarative/observed/derived categories distinct. Use evidence relations to declare supports/contradicts/inconclusive and reject incompatible scopes. Bind decisions to canonical input digests and versioned policies.

## Consequences
An adversarial producer can fabricate internally consistent source content and verification artifacts. Source authenticity, collector identity and external trust roots require a separate future decision. No claim of cryptographic authenticity is made in Lot A.
