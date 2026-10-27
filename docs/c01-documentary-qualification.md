# C01-I02 — Documentary qualification and completeness proof

## Contract

This is the second executable Lot C slice. It extends the C01-I01 documentary envelope without changing historical schema 1.0.0 or the eligibility Policy.

Qualification rules: `maya.c01.documentary-qualification-fixture` version `1.0.0`.

`DocumentaryQualificationResult` contains contractDomain, contractVersion, corpusDigest, qualificationRulesId, qualificationRulesVersion, examinedAssertionIds, comparisonClasses, examinations, conflictIds, exclusions, resultDigest.

Each ComparisonClass has a deterministic id, subjectType, subjectId, predicate, versionScope and assertionIds. Each Examination has an id, classId, assertionIds, ruleId, result, conflictIds and reason. Results are CONFLICT, NO_CONFLICT or INDETERMINATE.

Every admitted Assertion participates, including superseded and noneligible Assertions; this pilot's declared scope is the complete admitted payload. A class groups equal subjectType, subjectId, predicate and normalized Evidence versionScope. Multiple incompatible scopes for a single Assertion are rejected.

## Closed fixture rule set

- Exact JSON string values `alpha` and `beta` within the same `mapsToProject` class are explicitly incompatible, producing one documentary Conflict per class.
- Otherwise the exact string `pending` yields INDETERMINATE.
- Otherwise the examination yields NO_CONFLICT, with an explicit reason.
- A mere difference between other values never produces a Conflict.

No network, similarity, URL, namespace, repository, confidence or inference is used.

## Proof and Store-facing verification

The qualifier builds required classes, examinations and expected documentary Conflicts. The proof generator canonically records coverage and digests; it does not insert Conflicts into the corpus.

The independent verifier reconstructs classes and examinations from the corpus and the fixed rule set. It rejects omitted or duplicate examinations, missing assertions, missing or artificial Conflicts, mismatched rule versions, unauthorized exclusions, incorrect corpusDigest or incorrect resultDigest. The verifier never repairs input.

The producer must explicitly persist the expected Conflicts in the documentary payload, refresh the envelope digest, and regenerate the proof. The acceptance integration belongs to C01-I03.

## Isolation

Qualification does not consult eligibility or call the historical Resolver. The eligibility boundary continues to transmit only eligible active Assertions, regardless of documentary qualification and Conflicts. Historical Store validation is unchanged.

## Validation

T16–T30 cover conflict/no-conflict/indeterminate examinations, noneligible coverage, omissions, extra records, digests, permutation, offline replay, historical isolation and C01-I01 integration.

## Limitations

C01-I02 does not implement PackageIdentity → ProjectIdentity resolution, validate N3 sources, accept an integrated documentary snapshot, or change the canonical SBOM.
