# C01-I04 — authentic JUnit upstream POM evidence inventory

Source acquired via GitHub repository content API from `junit-team/junit4`, file `pom.xml`, ref `r4.13.2`. Archived bytes: `fixtures/c01/junit4-r4.13.2-upstream-pom.xml`. SHA-256 (UTF-8 bytes): `569b6977ee4603c965c1c46c3058fa6e969291b0160eb6964dd092cd89eadd94`.

Source URL: https://github.com/junit-team/junit4/blob/r4.13.2/pom.xml

This is **upstream release-tag POM source**, not an authenticated Maven Central HTTP observation. It contains explicit `groupId=junit`, `artifactId=junit`, `version=4.13.2`, and `name=JUnit`. These fields are evidence of upstream source metadata, **not** sufficient by themselves to establish MAYA's `attributedToProjectIdentity` relationship with a specific opaque ProjectIdentity ID.

Offline replay: `tests/c01-junit-upstream-archive.test.js` verifies pinned archive SHA-256 and the observed coordinates without network access. Original upstream whitespace is retained, with a scoped Git whitespace attribute; archive bytes are not normalized.

Outstanding:
- A real Lot B Maven Central observation has now been acquired using `createMavenCentralProvider` on GitHub Actions and archived using `createObservationArchive`; **V-P = VERIFIED** with offline replay.
- No independently allocated and verified JUnit ProjectIdentity registry snapshot with pre-existing opaque Y was located.
- The upstream POM does not itself reference an opaque MAYA ProjectIdentity ID. A source-authorized mapping from its documented project to the independently established Y remains necessary.
- No independently governed and pinned authority rule registry exists. Caller-supplied rule fixtures are not independent authority.
- Positive eligibility, full integrated acceptance and real JUnit offline replay remain open. JUNIT PACKAGE→PROJECT = INDETERMINATE.

Do not merge PR #31 based solely on this archived source or the green synthetic tests.


## Independent project description acquired

A second upstream release-tag document has been archived from `junit-team/junit4` at `r4.13.2`: `fixtures/c01/junit4-r4.13.2-project-readme.md`, source https://github.com/junit-team/junit4/blob/r4.13.2/README.md . It explicitly describes JUnit 4 as a software testing framework, independently of Maven coordinates. Test `tests/c01-junit-project-source.test.js` verifies its archived content offline.

This establishes a real independent *project-description source*, **not** an approved opaque ProjectIdentity allocation or snapshot. No ProjectIdentity has been allocated on the strength of a Maven name or POM. The V-Y gate remains open pending an explicitly authorized independent registry allocation and its pinned provenance.

## Maven Central acquisition limitation

The approved Maven Central provider endpoint is `https://repo.maven.apache.org/maven2/junit/junit/4.13.2/junit-4.13.2.pom`. Local DNS acquisition failed, but GitHub Actions acquired HTTP 200 using the **existing Lot B provider**, stored the canonical acquisition with the **existing Lot B archive**, verified its offline load, and committed both archive and reference to this PR.


## Verified Lot B Maven Central acquisition (2026-10-27)

- Source URL: `https://repo.maven.apache.org/maven2/junit/junit/4.13.2/junit-4.13.2.pom`
- Provider: `maven-central` version `2`, scope `Version`, HTTP `200`, transport `ok`.
- Observed at: `2026-10-27T08:48:04.055Z` (UTC).
- Archive: `fixtures/c01/maven-central/junit-4.13.2.observation.json` and `junit-4.13.2.reference.json`.
- Archive ID: `observation:605703278032b3282a60e2e145b24e1c788aaceb8e60a17a2da145bcab827aef`.
- Archive SHA-256: `605703278032b3282a60e2e145b24e1c788aaceb8e60a17a2da145bcab827aef`.
- Body SHA-256: `569b6977ee4603c965c1c46c3058fa6e969291b0160eb6964dd092cd89eadd94`.
- Acquisition run: https://github.com/ldchloe/MAYA/actions/runs/40476035379
- Offline replay: `tests/c01-junit-maven-central-offline.test.js`, read-only archive load, source coordinates, hash, missing and tampered archive checks.
- This **closes V-P**, not V-Y, Bridge Authority, V-PY or positive integrated acceptance. No POM-to-opaque-Y inference is permitted.
