# Lot E — Governance, evidence-bound MVP (in progress)

## Reuse decision

**MINIMAL EXTENSION REQUIRED**: reuse C-01 exact ProjectIdentity corpus registry and archived upstream official sources; reuse Lot A deterministic Evidence/Assertion/Conflict/Decision vocabulary and `enrichment-canonical` digests. One module `js/e01-governance.js`, one tests matrix, one PR. No governance scoring, geopolitics, country/jurisdiction inference or new ADR.

## Real-source findings and boundaries

- **JUnit 4**: archived official tagged upstream POM explicitly contains `<organization><name>JUnit</name></organization>`. This supports a narrowly scoped **attributedToOrganization(JUnit, JUnit)** *as a project POM metadata attribution*, **not** legal ownership. The POM's contributors are not automatically maintainers.
- **Spring Framework**: official tagged README establishes the project and its code-of-conduct governance but does not explicitly identify a legal owner, Foundation or individual maintainer. Its Organization/Foundation/Maintainer relations remain **UNKNOWN** pending archived, proposition-specific governance sources.
- **Apache Log4j**: tagged parent POM identifies Apache contributor/PMC metadata and ASF licensing but the license header alone is **not** evidence of legal ownership or a Foundation-governance relationship. These relations remain **UNKNOWN** pending explicit governance documentation. Apache's official Logging guidelines at https://logging.apache.org/guidelines.html describe ASF and Logging PMC governance, but their raw bytes have not yet been archived in this branch and thus are not admitted to the offline evidence registry.

## Contract

`resolveGovernance({projectIdentityId,claims})` only admits exact known C-01 ProjectIdentity IDs, repository-allowlisted official archives bound to the correct project, literal contextual governance statements within the archived bytes, exact source URL, observedAt and optional validFrom/validTo. Each admitted proposition becomes deterministic Evidence, Assertion and Decision. Unknown remains UNKNOWN. No name-only, URL-only, contributor-only, domain-only, cross-project archive reuse or forged Evidence is authorized.

The expression `governedByFoundation` is distinct from `attributedToOrganization`, and `maintainedBy` requires an explicit maintainer statement. Different predicates never automatically imply one another.

**Closure status: IN PROGRESS.** The three-project offline corpus is deterministic, but the full official source set, positive Foundation/Maintainer tests, substantive conflict tests, full CI and final closure must be verified before declaring Lot E validated. Do not claim Lot E closed based on this document alone.

Next after validated closure: Lot F Geographic Facts, first increment Organization → Legal Jurisdiction only with explicit official/legal evidence.
