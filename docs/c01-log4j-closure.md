# C01-I06 — Apache Log4j 2.23.1 documentary attribution and C-01 closure evidence

## Pilot scope

Exact package: `maven:org.apache.logging.log4j:log4j-core:2.23.1`.

Independent Apache Log4j ProjectIdentity: `project:4cf1b8a8c5718164a1abd9de619fa7c15415c9ad94e0ea0dba781dc2b9fa2f48`.

Project snapshot digest: `7e7adf7d386d6076e78fc75a7d3448cf57e8c6c631fb95b613f8582e4e888893`.

Exact H2 manifest: `fixtures/c01/log4j/log4j-h2-authority-manifest.json`.

Approved manifest digest: `a5eeb7ca0d06e0643be944e4c718ccbcb595a032eb7938bd1b7d17eb183c4bd0`.

Authorization scope is restricted to the exact package/version, independently allocated ProjectIdentity and `attributedToProjectIdentity` predicate. The approval root is in the repository-owned corpus registry; the caller cannot supply authority, rules, source paths or approval digests. The manifest records the C01-I06 fast-track authority instruction as its decision reference.

## Archived official evidence

Acquisition manifest: `fixtures/c01/log4j/acquisition-manifest.json`. It records the official URLs, provider, HTTP 200 status, acquisition timestamp, content hashes and response metadata. The archived sources are:

- Apache `apache/logging-log4j2@rel/2.23.1:README.adoc`: independently documents the Apache Log4j project.
- Apache tagged root `pom.xml`: `org.apache.logging.log4j` group, `<revision>2.23.1</revision>` and `<module>log4j-core</module>`.
- Apache tagged `log4j-core/pom.xml`: explicit module artifact and parent revision.
- Maven Central real `org.apache.logging.log4j:log4j-core:2.23.1` POM, acquired using the existing Lot B Maven provider and stored with a provider-native observation reference.

Maven Central POM SHA-256: `c89ba0c23757511b9252b27a731d01e863b28ddfce503e7dee94ae2318c82ddc`.

The project identity was allocated independently of Maven coordinates; its attribution context binds the official Apache project README SHA-256 `cf6ba510571fff70a2579ba38795ab66354812db4228c3604cfb7e164f89f6fd`. Its initial snapshot contains zero package links.

The archived tagged POMs and Maven Central publication are compared by their declared Maven group, module, parent and resolved release revision; they are not assumed byte-identical. All files are immutable inputs for offline replay.

## Reused generic implementation

No new identity engine, Maven provider, approved authority resolver, bridge issuer, documentary qualifier, completeness verifier or acceptance engine was created. The only production change is a new exact-scope corpus registry entry in `js/c01-corpus-registry.js`. Existing generic authority, Evidence and bridge modules perform the validation.

Test coverage includes `tests/c01-log4j-archive.test.js`, `tests/c01-log4j-pilot.test.js`, `tests/c01-log4j-documentary-integration.test.js` and `tests/c01-three-pilot-genericity.test.js`.

The three-pilot test requires distinct PackageIdentity, ProjectIdentity, Assertion, Evidence, Authority and Decision identifiers, with identical results across permutations. The negative tests cover missing or forged context, alternative project claims, wrong version, wrong module, names and URLs without documentary proof.

## C-01 closure criteria

C01-01 through C01-15 are tested through JUnit, Spring and Log4j real archived corpora, with official-source and digest checks, explicit EvidenceRelations, preserved synthetic conflicts, fail-closed eligibility, C01-I02 qualification and independently verified completeness, C01-I03 documentary acceptance, deterministic decisions and offline replay. No historical schema, policy or scoring engine version was changed.

The latest project status scopes the active Lot C ticket to **PackageIdentity → Project**. Repository, forks and mirrors are outside that active MVP ticket. Therefore the next phase after a green three-pilot merge is **Lot D — Technical Metadata**, starting with licenses and SPDX, reusing Evidence / Assertion / Conflict and preserving UNKNOWN for unsupported claims.

The closure declaration becomes effective only after the final complete CI passes and the Log4j PR is merged into main.
