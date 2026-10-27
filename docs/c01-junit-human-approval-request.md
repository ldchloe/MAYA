# C01-I04 — independent approval decision required (JUnit pilot)

Status: **HUMAN APPROVAL REQUIRED**. This is an approval request, **not** an approved allocation, an approved authority, or a verified Package→Project bridge.

## Verified and archived, no further acquisition needed

- Real Maven Central Lot B observation: `fixtures/c01/maven-central/junit-4.13.2.observation.json` and `junit-4.13.2.reference.json`. Provider `maven-central` v2, HTTP 200, version `4.13.2`, observation timestamp `2026-10-27T08:48:04.055Z`. Archive SHA-256 `6a977171df7e5908a66ee179fd86039a5e5fd3322758197a2f2d101987e4f740`; body SHA-256 `569b6977ee4603c965c1c46c3058fa6e969291b0160eb6964dd092cd89eadd94`. Offline test: `tests/c01-junit-maven-central-offline.test.js`.
- Project-description source: `fixtures/c01/junit4-r4.13.2-project-readme.md`, official upstream tagged JUnit 4 README, offline test `tests/c01-junit-project-source.test.js`. Describes the JUnit project, **does not** allocate a MAYA ProjectIdentity.
- Tagged upstream POM: `fixtures/c01/junit4-r4.13.2-upstream-pom.xml`, SHA-256 `569b6977ee4603c965c1c46c3058fa6e969291b0160eb6964dd092cd89eadd94`. Its matching bytes and Maven coordinates do **not** independently prove a link to an opaque ProjectIdentity.

## Decision 1 — Independent ProjectIdentity allocation

**Approver**: a human authorized to approve MAYA ProjectIdentity registry allocations, independently of this candidate package attribution.

**Exact artifact**: an explicit registry allocation record, using `allocateProjectIdentity(registry,{projectId,attributionId,createdAt,attributionContext,name,url})` from `js/project-identity.js`, plus a committed exported snapshot and the source references/digests establishing the JUnit project as a project in its own right.

**Approval requested**: approve one newly allocated **opaque** `project:<hex>` and `attribution:<hex>` as an independently established project registry entry, with `attributionContext` identifying the allocation decision, approving actor, date, and archived project source. **No package coordinates, Maven archive, bridge assertion, or package→project link may be used as the justification for this allocation.** The registry snapshot must be created and sealed before evaluating the bridge.

**Scope**: independent project identity only. No `linkPackageIdentity` and no `attributedToProjectIdentity` assertion.

**Risk**: treating the README or matching names as an implicit allocation, or letting the bridge candidate approve its own target, creates circular evidence.

## Decision 2 — Independent bridge-authority approval

**Approver**: a human authorized to approve documentary source authority for C01-I04, separately from the caller evaluating the JUnit bridge.

**Exact artifact**: a versioned, repository-controlled approved-authority configuration or approved rule manifest, with independently recorded approval provenance. Required fields: rule ID/version, approved source class, verification method and verification ID, source reference and digest, predicate `attributedToProjectIdentity`, exact package/version scope, external identity scope, and **approved opaque ProjectIdentity target**. The rule's approval must predate, or be independent of, the bridge evaluation.

**Approval requested**: decide explicitly whether the archived upstream JUnit release POM and the independently established project record, **together**, are competent to attest the specific `junit:junit:4.13.2 → <approved opaque Y>` claim. If not, identify and archive a stronger authoritative source before approving. An official-looking URL, a valid SHA-256, a repository name, and the Maven coordinates are not authority.

**Scope**: C01-I04 explicit PackageIdentity→ProjectIdentity documentary attribution for the identified claim, not a general trust delegation, organization attribution, or global predicate allowlist.

**Risk**: `js/c01-bridge-authority.js` currently permits caller-provided `trustedAuthorityDigest` when provenance is requested; without a separately approved trust root, an assertion requester could self-authorize. A positive fixture does not repair this.

## Required implementation after approvals

1. Commit the independently approved ProjectIdentity allocation and sealed snapshot; validate it with `validateProjectIdentitySnapshot` and offline replay. Reject a different Y.
2. Commit the independently approved authority manifest, implement fail-closed resolution against that approved set (never against a caller-selected digest alone), and add positive/negative tests for issuer, source, scope, claim and digest.
3. Construct the bridge Evidence only from the archived P/Y/source records and approved authority; run V-PY and verify a changed opaque Y fails.
4. Extend C01-I01 positive eligibility only for the **same** verifiably bound Assertion and full V-P/V-Y/V-PY/authority gates. Preserve default deny.
5. Reuse C01-I02 qualification, independent completeness verification, C01-I03 integrated acceptance and existing resolver; test missing evidence, omitted examination and contradictory fixture.
6. Replay the **entire** chain with network disabled and compare all digests, assertion, acceptance and Decision; require green full CI before merge.

**Current decision**: V-P PASS; V-Y NOT VERIFIED; independent Bridge Authority NOT VERIFIED; V-PY NOT VERIFIED; positive eligibility/acceptance/final Decision replay NOT VERIFIED. **Do not merge PR #31.**
