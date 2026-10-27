# C01-I04 — authentic JUnit upstream POM evidence inventory

Source acquired via GitHub repository content API from `junit-team/junit4`, file `pom.xml`, ref `r4.13.2`. Archived bytes: `fixtures/c01/junit4-r4.13.2-upstream-pom.xml`. SHA-256 (UTF-8 bytes): `569b6977ee4603c965c1c46c3058fa6e969291b0160eb6964dd092cd89eadd94`.

Source URL: https://github.com/junit-team/junit4/blob/r4.13.2/pom.xml

This is **upstream release-tag POM source**, not an authenticated Maven Central HTTP observation. It contains explicit `groupId=junit`, `artifactId=junit`, `version=4.13.2`, and `name=JUnit`. These fields are evidence of upstream source metadata, **not** sufficient by themselves to establish MAYA's `attributedToProjectIdentity` relationship with a specific opaque ProjectIdentity ID.

Offline replay: `tests/c01-junit-upstream-archive.test.js` verifies pinned archive SHA-256 and the observed coordinates without network access. Original upstream whitespace is retained, with a scoped Git whitespace attribute; archive bytes are not normalized.

Outstanding:
- The approved Lot B Maven Central observation archive (`providerId=maven-central`, source URL, HTTP status, observedAt, archived body) has not been acquired. Therefore real V-P in the required Maven acquisition sense is **not PASS**.
- No independently allocated and verified JUnit ProjectIdentity registry snapshot with pre-existing opaque Y was located.
- The upstream POM does not itself reference an opaque MAYA ProjectIdentity ID. A source-authorized mapping from its documented project to the independently established Y remains necessary.
- No independently governed and pinned authority rule registry exists. Caller-supplied rule fixtures are not independent authority.
- Positive eligibility, full integrated acceptance and real JUnit offline replay remain open. JUNIT PACKAGE→PROJECT = INDETERMINATE.

Do not merge PR #31 based solely on this archived source or the green synthetic tests.
