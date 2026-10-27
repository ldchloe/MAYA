# C01-I01 — Policy-driven resolution eligibility boundary

This is the first executable slice of Lot C, not documentary snapshot acceptance.

## Contract isolation

Historical schemaVersion 1.0.0, its Store, Resolver, canonical digests and helper fixtures are unchanged. Historical resolution continues to transmit every active Assertion.

The documentary envelope explicitly identifies contractDomain `maya.lot-c.documentary`, contractVersion `1.0.0`, artifactKind `documentary-snapshot`, policyId `maya.c01.eligibility-fixture` and policyVersion `1.0.0`. Unknown combinations are rejected, never inferred from Assertions.

## Eligibility

The fixture Policy admits an active Assertion only when subjectType is `componentEnrichment`, predicate is `mapsToProject` and its id is explicitly listed in the integrity-checked `validationContext.eligibleAssertionIds`. All other valid cases return `NOT_ELIGIBLE`. Missing or contradictory contract context fails validation.

`A_eligible ⊆ A_active ⊆ A_admitted` and `A_transmitted = A_eligible`. Noneligible Assertions and their Evidence, EvidenceRelation and documentary Conflicts remain in the original corpus. Supersession is evaluated before eligibility.

The adapter calls the historical resolver using its internal historical policy version; adapted decisions have distinct C01 identities and digests. Engine-generated Conflicts are distinct from pre-existing documentary Conflicts. The boundary result is deterministic and does not certify full documentary acceptance.

## Tests

T01 active eligible; T02 active excluded; T03 mixed; T04 Evidence preservation; T05 EvidenceRelation preservation; T06 documentary Conflict preservation; T07 default deny; T08 unsupported predicate; T09 invalid context; T10 permutation; T11 historical compatibility; T12 Resolver bypass; T13 supersession; T14 Decision exactness; T15 offline replay.

Run the repository's existing complete suite with `node --test tests/*.test.js` and Maven tests with `node --test tests/identity-maven.test.js`.

## Limitations

C01-I01 DOES NOT IMPLEMENT PACKAGEIDENTITY TO PROJECTIDENTITY RESOLUTION.

C01-I01 DOES NOT VALIDATE N3 SOURCES.

C01-I01 IS THE FIRST EXECUTABLE SLICE OF LOT C.

It does not validate Spring Framework, Apache Log4j or JUnit as real project correspondences, and does not implement repository, organization, foundation, governance, geography or trust-analysis resolution.
