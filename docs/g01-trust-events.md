# G01 — Evidence-based Trust Events

## Scope
Historical events, not states. Reuses C01 ProjectIdentity, E01 governance identity allowlist, canonical Evidence/Assertion/Decision IDs and archive-based offline replay. No scoring, severity, geopolitical interpretation, risk levels or Lot H work.

## Real event corpus
Two independent historical JUnit 4 release events are evidenced by the official `junit-team/junit4` GitHub Releases API:
- `r4.13.1` — `fixtures/g01/junit/r4.13.1.json` and matching metadata.
- `r4.13.2` — `fixtures/g01/junit/r4.13.2.json` and matching metadata.

The archived API responses provide explicit `published_at`, tag, release ID and official repository URL. Event type `RELEASE` is an additional factual event category; release publication is **not** an ownership, maintainer, license, foundation or compromise change.

Pinned archive SHA-256:
- r4.13.1: `789aeef92cde549bffb0691fc7f8a917867ac8a364ada4afe1bf15fece79689e`
- r4.13.2: `570584193e1d9af512e1f16c1d492fdd04e0b4d69a7abcce05c2f084c5f01071`

Both raw source bodies, HTTP 200, URLs, acquisition UTC times, content types, byte counts and SHA-256 are versioned. Production G01 verifies the pinned bytes, exact release tag, `published_at`, release URL and official project subject. No live HTTP is used at replay time.

## Model
`resolveTrustEvents({projectIdentityId,claims})` creates immutable Evidence, source-backed Assertions, deterministic TrustEvents, timeline and Decision. Explicit event keys derive from the official release ID. Sorting uses effective timestamp, then event ID. Duplicate claims for the same official event yield one TrustEvent. Unsupported/unverified event claims remain UNKNOWN.

Supported event type vocabulary: OWNERSHIP_CHANGE, ACQUISITION, GOVERNANCE_CHANGE, MAINTAINER_CHANGE, LICENSE_CHANGE, REPOSITORY_CHANGE, FOUNDATION_CHANGE, SUPPLY_CHAIN_INCIDENT, COMPROMISE, RELEASE.

Only the two archived official RELEASE facts are production-admissible in this MVP. The other categories are representable and tested with isolated `SYNTHETIC TEST ONLY` fixtures; no fabricated production facts or source-to-ownership inference. A generic CVE does not prove compromise. JUnit is the only project with evidenced historical releases in this increment; Spring and Log4j remain UNKNOWN.

## Gates G-CLOSE-01–17
- 01–03: event model, essential types and two real archived historical events.
- 04–05: pinned archive integrity and rejection without source Evidence.
- 06–07: chronological deterministic timeline and before/after controlled fixtures.
- 08–09: UNKNOWN and isolated synthetic conflict preservation.
- 10–12: event deduplication; no ownership inference; no generic CVE → COMPROMISE.
- 13: deterministic offline replay from versioned local source bytes.
- 14–16: unchanged canonical and prior A–F behavior; reproducible decisions.
- 17: final complete GitHub Actions CI required before merge.

The synthetic test helpers are not accepted by the production verifier.
