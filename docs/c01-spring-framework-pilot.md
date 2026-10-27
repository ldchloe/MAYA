# C01-I05 — Spring Framework 6.1.3 documentary attribution pilot

## Scope and human authorization

Human H2 approval was explicitly given in the current execution conversation for **evaluation only** of the exact bridge `maven:org.springframework:spring-core:6.1.3` → opaque Spring Framework ProjectIdentity under `attributedToProjectIdentity`. It does not establish V-PY or approve any evidence by itself. No wildcard, other version, other module, or other project is authorized.

The exact repository-controlled manifest is `fixtures/c01/spring/spring-h2-authority-manifest.json` with pinned canonical digest:

`57bcf8ba76d9c79bc0bb681df2774b28d8777889e881bba71c8c7e2672b83c33`.

The independent Spring Framework project allocation snapshot is `fixtures/c01/spring/spring-framework-project-identity.snapshot.json`:

- ProjectIdentity: `project:389fa659b1d9c46c996fcbef55f8b0c0c3dc7bb9790b9db8e4755c8f82ee79ef`
- Snapshot digest: `f31c312311e8d3da901c52d083e25d595e46534afd23f24e6777d55c217b2a11`
- Independent official project source: `spring-projects/spring-framework@v6.1.3:README.md`
- The allocation snapshot has zero package links.

## V-P archived real Maven observation

The existing Lot B Maven Central provider acquired `https://repo.maven.apache.org/maven2/org/springframework/spring-core/6.1.3/spring-core-6.1.3.pom` with HTTP 200 on 2026-10-27. The raw POM, acquisition metadata, provider information and observation reference are committed under `fixtures/c01/spring/maven-central/`.

- POM SHA-256: `e218e29adafcc0512596aa2e4458e8394521d6131491fce63ac7ecc3ed1bbdab`
- Observation ID: `observation:82379bb41013e1bfe25c27390cd27061aa4923cf6d4a8b53d30bfded6ceaded9`

## Official bridge chain

The official Spring Framework `v6.1.3` tag files are committed byte-for-byte under `fixtures/c01/spring/`:

1. `README.md`: Spring Framework project identity independent of the Maven package.
2. `gradle.properties`: official version `6.1.3`.
3. `settings.gradle`: explicit `spring-core` and `spring-beans` modules.
4. `spring-core/spring-core.gradle`: official `spring-core` module build definition.
5. `build.gradle`: group `org.springframework` assigned to Spring module projects.
6. Maven Central archived POM: exact `org.springframework:spring-core:6.1.3` published coordinates and published project metadata.
7. Independent ProjectIdentity snapshot: project provenance and digest.

The repository verifies official Git blob IDs, source content assertions, Maven coordinates, SHA-256 hashes, exact H2 manifest digest, and independent Y snapshot before issuing an authority resolution and bridge rule. Names, namespaces, URLs, and repository names alone are insufficient.

## Generic pipeline and negative controls

The existing JUnit authority and documentary pipeline are preserved. The repository-owned `js/c01-corpus-registry.js` declares the Spring corpus without granting the caller authority over the root. `js/c01-approved-authorities.js` verifies its exact manifest and archived evidence, `js/c01-p1-p5-evidence.js` materializes and verifies repository-bound propositions, and `js/c01-approved-bridge-rule.js` issues the rule deterministically.

Tests:

- `tests/c01-multi-corpus-authority.test.js`: GEN-01..10, cross-corpus substitutions, arbitrary caller rules/digests and order invariance.
- `tests/c01-spring-official-sources.test.js`: official tagged source provenance, independent project allocation and module distinction.
- `tests/c01-spring-maven-archive.test.js`: offline V-P and wrong-coordinate rejection.
- `tests/c01-spring-bridge-controls.test.js`: complete/missing/tampered evidence and controlled multi-module semantics.
- `tests/c01-spring-documentary-integration.test.js`: V-PY, real Assertion, Eligibility, Qualification, Completeness, Acceptance, Decision replay, synthetic conflict and fail-closed no-context controls.
- Existing JUnit documentary integration tests are run unchanged by the complete Node suite.

All Spring source and bridge tests use local archives, not network access. The temporary acquisition and allocation workflows were removed from the branch after archiving.

## Interpretation

`ACCEPTED` is the C01-I03 **documentary snapshot acceptance**, not a geopolitical trust score or an assertion that the package equals the project. The attributed package and the independently allocated project remain distinct. The second Spring module is a controlled fixture only; no real attribution of that second package is authorized by the spring-core H2 approval.
