# C01-I04 — PackageIdentity → ProjectIdentity evidence contract (partial)

This increment implements an offline, non-inferential dossier for the real predicate `attributedToProjectIdentity`. Its Policy is `maya.c01.package-project-evidence@1.0.0`, distinct from `maya.c01.eligibility-fixture`.

V-X requires a pinned archive with a SHA-256 matching the archived content and explicit PackageIdentity, ExternalIdentity, source and version scope. V-Y requires a validated, independently allocated ProjectIdentity in a canonical ProjectIdentity snapshot. V-XY requires explicit, separately archived bridge Evidence, bound to the exact X, Y and PackageIdentity, with independently verified SHA-256. Names, Maven namespaces and repository URLs are never accepted as bridge Evidence.

The dossier and its result are deterministic and read-only. Contradictory bridge records remain visible. An insufficient dossier yields INDETERMINATE and no selected assertion. An explicitly verified and non-ambiguous dossier yields VERIFIED. A conflicting dossier yields CONFLICTED. This is an attribution-specific provisional Decision contract, not the historical Lot A Decision nor an integrated C01-I03 acceptance result.

**Important implementation boundary:** C01-I01's fixture Policy accepts only `mapsToProject`; its resolver adapter is not yet generalized to the real predicate. Consequently, this initial implementation does **not** satisfy T68 (real predicate through C01-I01/I02/I03) and must not be merged as a completed C01-I04. It is suitable for review and follow-up implementation, not production attribution. A further explicit versioned real-domain policy/dispatch integration is required, preserving the fixture contract and historical 1.0.0.

No real Maven POM or bridge archive for JUnit, Spring Framework or Apache Log4j has been identified in the examined branch. The synthetic records used by unit tests are contract fixtures only and must not be presented as evidence for any pilot. All three pilots remain INDETERMINATE pending controlled acquisition and archival of independent attribution Evidence.
