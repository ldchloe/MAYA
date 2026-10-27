# C01-I04 — H2 HUMAN DECISION PACKAGE (PENDING, NOT APPROVED)

This document is a **candidate for human approval**, not an approval. V-P and V-Y are verified; V-PY, positive eligibility, acceptance, and final offline Decision remain **INDETERMINATE / NOT VERIFIED**.

## Exact H1 allocation (human H1 APPROVED and executed)

- `projectId`: `project:3b8b92fd783639e12f59ff6256967b246edd5249343217fb6d669a6ce688ff8e`
- `attributionId`: `attribution:c1a5a291cae1229b52cf14da32fa80e925eb554cc051197b6334cd5d576af0c5`
- `createdAt`: `2026-10-27T09:01:54.309Z`
- `snapshotDigest`: `a61190267f2c520a70ed08ef6183e7d7b1492009c252f3e4dd2677f4f4378fb1`
- Source: `fixtures/c01/junit4-r4.13.2-project-readme.md`, source SHA-256 `63feaf908bda828d78adf9989bf404ffd4e4ac4ad76b0d7bed74cf5b4f611723`.
- Snapshot: `fixtures/c01/junit4-project-identity.snapshot.json`, `links=[]`. Created by `allocateProjectIdentity` in GitHub Actions with actual UTC time and CSPRNG IDs; verified offline via `importProjectIdentitySnapshot` / `validateProjectIdentitySnapshot`.
- No Maven coordinate or candidate bridge in attribution context. H1 establishes Y only.

## Exact H2 candidate (NOT APPROVED)

- Repository-controlled manifest: `fixtures/c01/junit-h2-authority-candidate.json`
- `authorityRuleId`: `c01:junit-4.13.2:project-attribution`
- `authorityRuleVersion`: `1.0.0`
- `contractDomain`: `C01-I04`
- `predicate`: `attributedToProjectIdentity`
- Exact Maven coordinate: `junit:junit:4.13.2` (`ecosystem=maven`, `groupId=junit`, `artifactId=junit`, `version=4.13.2`)
- Exact opaque target Y: `project:3b8b92fd783639e12f59ff6256967b246edd5249343217fb6d669a6ce688ff8e`
- Target Y snapshot digest: `a61190267f2c520a70ed08ef6183e7d7b1492009c252f3e4dd2677f4f4378fb1`
- Manifest SHA-256 canonical commitment (`manifestDigest`): `a0af0913dd7aedbe02100d93d92ffecdd6edd70e2ad1b2b3f552d56ee12bc3fb`
- Approval provenance: `status=PENDING_H2`, `decisionRef=null`. No approval has been given or inferred.

### Required archived evidence classes (ALL mandatory)

1. `lot-b-maven-central-observation`: `fixtures/c01/maven-central/junit-4.13.2.observation.json` and `junit-4.13.2.reference.json`. Lot B archive SHA-256 `605703278032b3282a60e2e145b24e1c788aaceb8e60a17a2da145bcab827aef`; Maven POM body SHA-256 `569b6977ee4603c965c1c46c3058fa6e969291b0160eb6964dd092cd89eadd94`.
2. `upstream-release-pom`: `fixtures/c01/junit4-r4.13.2-upstream-pom.xml`, body SHA-256 `569b6977ee4603c965c1c46c3058fa6e969291b0160eb6964dd092cd89eadd94`; official release-tag upstream POM.
3. `independent-project-readme`: `fixtures/c01/junit4-r4.13.2-project-readme.md`, SHA-256 `63feaf908bda828d78adf9989bf404ffd4e4ac4ad76b0d7bed74cf5b4f611723`.
4. `approved-project-identity-snapshot`: `fixtures/c01/junit4-project-identity.snapshot.json`, `snapshotDigest=a61190267f2c520a70ed08ef6183e7d7b1492009c252f3e4dd2677f4f4378fb1`.

The manifest now pins all five exact source/snapshot digest commitments in `sourceCommitments` (Lot B archive, Maven body, upstream POM, README, and H1 snapshot). A change to any commitment without resealing fails integrity validation.

### Validation method and limits

`js/c01-approved-authorities.js` loads the candidate from a fixed repository path, validates its canonical SHA-256 and exact scope, rejects changed manifest fields, other Maven coordinates, other project targets, missing required evidence classes and name-only evidence. The trust root `APPROVED_MANIFEST_DIGESTS` is **empty** until a subsequent explicit H2 decision; caller-supplied `trustedAuthorityDigest` cannot populate it. Tests `tests/c01-h2-authority-manifest.test.js` cover H2-01 through H2-07.

**Important:** manifest validation is *not* a positive V-PY verification. The candidate lists required classes and conditions; exact cryptographic binding of each archived source and an explicit non-nominal bridge Evidence to Y still need implementation after H2 approval. The current older `js/c01-bridge-authority.js` has a caller-digest path; it must not be used to claim an approved real bridge until integrated with this pinned root. Historical synthetic tests are not approval.

### Human decision requested — exactly one

**APPROVE H2**: approve the narrowly scoped rule `c01:junit-4.13.2:project-attribution` version `1.0.0` and authorize its explicit activation by a repository-pinned approval commitment, subject to all four source classes, their integrity checks, exact Y binding, independent explicit bridge evidence and complete downstream gates. Approval authorizes **evaluation**, not a positive V-PY conclusion.

**REJECT H2**: do not activate the rule; retain default-deny, V-PY NOT VERIFIED and PR #31 OPEN.

Risks: source authority overreach; trusting a matching name/URL; conflating Maven publication with opaque Y; accidental acceptance of caller digest; mistaken belief that a manifest candidate is itself a bridge. All must remain fail-closed.

## Conditional final review — H2 NOT ACTIVATED

The H2-A10 review identified a legacy path in `js/c01-project-attribution.js` that could accept caller-defined `authorityRules` without consulting the repository manifest. A regression test was added first, followed by a scoped fail-closed check for the exact JUnit H1 pilot. This does **not** establish a complete global no-bypass proof: `js/c01-bridge-authority.js` still has a legacy rule evaluation API, and alternate identity encodings need explicit negative coverage. Consequently H2 is **NOT APPROVED**, the approved-digest list stays empty, and the human approval candidate must not be activated. The next implementation step is to make the approved manifest mandatory in the shared authority evaluator and cover every route to `VXY=PASS` with negative tests, while preserving historical fixture behavior without accepting real unapproved bridges.

## H2-A10 generic enforcement follow-up (2026-10-27)

The generic exported `js/c01-bridge-authority.js:evaluate` now rejects raw caller rules as contractual authority. `js/c01-project-attribution.js:evaluate` no longer contains the JUnit-only guard: it relies on the shared fail-closed evaluator for every VXY result. `js/c01-approved-authorities.js:resolveApprovedAuthority` loads only the repository-pinned manifest, checks the exact canonical claim shape and the empty approval root, and returns no approval while H2 is pending. `isApprovedBridgeRule` deliberately returns false because there is **no independently approved evidence-bound bridge rule**. This guarantees no synthetic caller rule can yield a positive VXY, but is **not** a completed post-H2 positive authority issuance mechanism. H2 remains REJECTED / NOT ACTIVATED. The prior synthetic positive expectations were revised to fail-closed negatives; this is an intentional security-contract change, not a positive real JUnit result.

## Exact H2 repository-root activation (2026-10-27)

The user's explicit controlled-activation instruction authorizes only manifest digest `a0af0913dd7aedbe02100d93d92ffecdd6edd70e2ad1b2b3f552d56ee12bc3fb`. The immutable candidate manifest retains its `PENDING_H2` provenance field, since changing that field would invalidate its approved digest; approval is now represented **separately** by the pinned `APPROVED_MANIFEST_DIGESTS` registry. `resolveApprovedAuthority` reads only the pinned candidate, validates its digest and exact claim, and reconstructs the four archived evidence bindings, returning a canonical approved resolution. The shared bridge evaluator still refuses caller-supplied rules and has **no positive evidence-bound bridge issuance** (`isApprovedBridgeRule` fails closed). Therefore H2 manifest authorization is distinct from actual V-PY proof. No verified explicit P→Y documentary statement has been established and no positive V-PY/acceptance/Decision is claimed. Do not merge before these real gates pass.
