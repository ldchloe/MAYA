# F01 — Geographic facts closure

Scope: factual geographic relationships only. No geographic risk or trust score.

## Official source
Apache Software Foundation, [Corporate History](https://www.apache.org/foundation/governance/corporation.html). Acquired raw HTML: `fixtures/f01/asf/corporation.html`; metadata: `fixtures/f01/asf/corporation.metadata.json`.
SHA-256 pinned in F01: `fad51bf402b0859c8bcaddc185eeb486696edf8ff1ca0922123d3cfe88d3831f`.
HTTP 200, text/html, 28,832 bytes, acquired 2026-10-27T16:20:06.741256Z.
The official statement expressly identifies ASF as a Delaware membership corporation subject to Delaware law. This proves the ASF legal jurisdiction, **not** the location of Log4j hosting, maintainers, development or all Apache projects.

## Governance scope and decisions
E01 independently verifies Apache Log4j's governance Foundation as Apache Software Foundation. F01 only admits the ASF's own `LEGAL_JURISDICTION` fact: `jurisdictionSubdivision=Delaware`, `countryObserved=United States`, `countryCode=US`. It is a Foundation-subject fact; no `ProjectIdentity.country` propagation.

F01 produces deterministic Evidence → Assertion → Decision and a typed CountryRelationship. It verifies archived raw bytes against pinned SHA-256 and metadata and checks the explicit selector. Other dimensions are UNKNOWN without proof. JUnit and Spring geographic facts remain UNKNOWN. The test-only conflict uses `SYNTHETIC TEST ONLY` and cannot pass the production verifier.

## Closure gates
- F-CLOSE-01/02: typed country relationship and legal jurisdiction.
- F-CLOSE-03: archived ASF Delaware/US positive case.
- F-CLOSE-04/05/06: UNKNOWN and no namespace/domain inference.
- F-CLOSE-07/08: distinct maintainer and hosting dimensions.
- F-CLOSE-09: temporal bounds retained in Evidence and Assertion.
- F-CLOSE-10/11: pinned archive and sourced Assertions.
- F-CLOSE-12: isolated synthetic conflict retained.
- F-CLOSE-13/14: deterministic IDs, permutation and offline replay using local archives.
- F-CLOSE-15/16: prior lots and canonical non-regression via complete Node suite.
- F-CLOSE-17: GitHub Actions green required before merge.

No new architecture, scoring, geographic inference or Lot G implementation.
