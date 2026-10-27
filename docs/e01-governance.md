# Lot E — Governance, evidence-bound MVP (in progress)

## Reuse decision

**MINIMAL EXTENSION REQUIRED**: reuse C-01 exact ProjectIdentity corpus registry and archived upstream official sources; reuse Lot A deterministic Evidence/Assertion/Conflict/Decision vocabulary and `enrichment-canonical` digests. One module `js/e01-governance.js`, one tests matrix, one PR. No governance scoring, geopolitics, country/jurisdiction inference or new ADR.

## Real-source findings and boundaries

- **JUnit 4**: archived official tagged upstream POM explicitly contains `<organization><name>JUnit</name></organization>`. This supports a narrowly scoped **attributedToOrganization(JUnit, JUnit)** *as a project POM metadata attribution*, **not** legal ownership. The POM's contributors are not automatically maintainers.
- **Spring Framework**: official tagged README establishes the project and its code-of-conduct governance but does not explicitly identify a legal owner, Foundation or individual maintainer. Its Organization/Foundation/Maintainer relations remain **UNKNOWN** pending archived, proposition-specific governance sources.
- **Apache Log4j**: official Apache Logging Services guidelines (archived HTTP 200 with SHA-256) explicitly identify Logging Services as an ASF project with Log4j among its subprojects. This supports **governedByFoundation(Apache Log4j, Apache Software Foundation)**, not a claim of legal ownership. Official Log4j project guidelines explicitly identify the **Apache Logging Project Management Committee** as the volunteer group responsible for managing Apache Logging projects including Log4j. This supports collective **maintainedBy** with a documented governance role, not individual maintainer inference. Historical Log4j 2.3.x guidelines have no automatically assumed current validity interval. The charter provides corroborating ASF board governance context.

## Contract

`resolveGovernance({projectIdentityId,claims})` only admits exact known C-01 ProjectIdentity IDs, repository-allowlisted official archives bound to the correct project, literal contextual governance statements within the archived bytes, exact source URL, observedAt and optional validFrom/validTo. Each admitted proposition becomes deterministic Evidence, Assertion and Decision. Unknown remains UNKNOWN. No name-only, URL-only, contributor-only, domain-only, cross-project archive reuse or forged Evidence is authorized.

The expression `governedByFoundation` is distinct from `attributedToOrganization`, and `maintainedBy` requires an explicit maintainer statement. Different predicates never automatically imply one another.

**Closure status: LOT E GOVERNANCE VALIDATED — MERGED TO MAIN.** Official Apache Foundation and collective Maintainer positive tests are present. Controlled contradictions are explicitly `SYNTHETIC TEST ONLY`, segregated from the production resolver and rejected by the production verifier. All three real C-01 ProjectIdentity values are exercised; missing governance is UNKNOWN. PR #36 merged at `1f33aa3b10bfdcc52d0ec54ad9cc0f20af7f09cd` after CI run `40516842687` passed 551/551 Node, 58/58 Maven, 0 failed, 0 skipped, syntax and diff whitespace checks.

Next after validated closure: Lot F Geographic Facts, first increment Organization → Legal Jurisdiction only with explicit official/legal evidence.
