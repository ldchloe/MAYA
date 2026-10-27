# C01-I04 — PackageIdentity → ProjectIdentity evidence contract (partial)

This increment implements an offline, non-inferential dossier for the real predicate `attributedToProjectIdentity`. Its Policy is `maya.c01.package-project-evidence@1.0.0`, distinct from `maya.c01.eligibility-fixture`.

V-X requires a pinned archive with a SHA-256 matching the archived content and explicit PackageIdentity, ExternalIdentity, source and version scope. V-Y requires a validated, independently allocated ProjectIdentity in a canonical ProjectIdentity snapshot. V-XY requires explicit, separately archived bridge Evidence, bound to the exact X, Y and PackageIdentity, with independently verified SHA-256. Names, Maven namespaces and repository URLs are never accepted as bridge Evidence.

The dossier and its result are deterministic and read-only. Contradictory bridge records remain visible. An insufficient dossier yields INDETERMINATE and no selected assertion. An explicitly verified and non-ambiguous dossier yields VERIFIED. A conflicting dossier yields CONFLICTED. This is an attribution-specific provisional Decision contract, not the historical Lot A Decision nor an integrated C01-I03 acceptance result.

**Important implementation boundary:** C01-I01's fixture Policy accepts only `mapsToProject`; its resolver adapter is not yet generalized to the real predicate. Consequently, this initial implementation does **not** satisfy T68 (real predicate through C01-I01/I02/I03) and must not be merged as a completed C01-I04. It is suitable for review and follow-up implementation, not production attribution. A further explicit versioned real-domain policy/dispatch integration is required, preserving the fixture contract and historical 1.0.0.

No real Maven POM or bridge archive for JUnit, Spring Framework or Apache Log4j has been identified in the examined branch. The synthetic records used by unit tests are contract fixtures only and must not be presented as evidence for any pilot. All three pilots remain INDETERMINATE pending controlled acquisition and archival of independent attribution Evidence.

## Hardening on PR #31

The bridge archive must now contain a structured `attributedToProjectIdentity` observation explicitly naming the exact PackageIdentity, ExternalIdentity and ProjectIdentity; arbitrary prose with a matching digest is insufficient. Conflicting archived attributions are retained as separate Assertions with an explicit Conflict referencing both. Dossier outputs are recursively frozen, and duplicate evidence IDs are rejected by the corresponding endpoint validation.

This is **content integrity and explicit referent matching**, not independent authentication of the publisher or verification of the underlying factual claim. In particular, a caller could construct a self-consistent synthetic record. Until controlled source provenance and independent verification are implemented, synthetic `VERIFIED` test results must not be interpreted as real-world proof.

The historical C01-I01 fixture dispatch, C01-I02 fixture qualification and C01-I03 acceptance are not yet generalized to this real predicate. Integration T40–T44 and a real JUnit archive are still required. Do not merge PR #31 merely because unit tests pass.

## T40–T44 integration checkpoint (2026-10-27)

The real predicate `attributedToProjectIdentity` is now covered by dedicated qualification/completeness/acceptance tests. Distinct target ProjectIdentity values under the same documentary subject and version scope produce an explicit Conflict with both Assertion IDs; the completeness verifier independently recomputes the same conflict. Both assertions remain in the proof, including when noneligible. The original `mapsToProject` fixture rule is retained unchanged and is not aliased.

**Gate not met:** the current C01-I01 policy continues to default-deny the real predicate. These tests exercise noneligible real assertions and conflicted noneligible real assertions; they do **not** demonstrate a positively eligible real attribution. A bridge-specific binary source-authority verification and eligibility path must precede that positive integration.

**JUnit pilot inventory:** `tests/identity-maven.test.js` currently uses a synthetic `spring-core` Maven response, not a persisted official JUnit POM. The C01-I04 JUnit fixture uses `archived junit POM` placeholder content and a synthetic ProjectIdentity allocation. Neither is independent, real-world proof. The missing inputs are an authentic archived JUnit Maven observation, an independently pre-existing JUnit ProjectIdentity snapshot, and an authority-qualified archived statement explicitly binding that package to that identity. Accordingly JUnit is **INDETERMINATE**; no real resolved attribution or offline real-world pilot is claimed. Spring and Log4j are not attempted until JUnit is completed.
