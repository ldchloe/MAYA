# C01-I03 — Integrated Documentary Snapshot Acceptance

## Contract DD-C01-06

`acceptDocumentarySnapshot(envelope)` returns exactly one of `ACCEPTED`, `REJECTED` or `INDETERMINATE`. The returned documentary acceptance record is not a business Decision and never selects a ProjectIdentity.

The documentary envelope extends the existing C01-I01 contract with `qualificationProof` (the complete C01-I02 canonical proof) and `resolutionResult` (the frozen C01-I01 boundary result). These attachments do not change the historical payload contract or its digest. The producer first qualifies the payload, persists the expected documentary Conflicts, refreshes the envelope digests, creates the completeness proof and computes the eligible resolution result.

Acceptance result fields: contractDomain, contractVersion, snapshotId, payloadDigest, validationContextDigest, qualificationResultDigest, eligibilityResultDigest, resolutionResultDigest, acceptanceStatus, reasonCodes, acceptanceDigest. The final digest commits to the preceding fields, using existing canonical SHA-256 primitives. No execution timestamp is introduced.

## Acceptance controls

1. Dispatch validates domain, version, envelope and integrity.
2. The existing C01-I01 boundary validates corpus, EvidenceRelations, supersession, eligibility and exact resolver output.
3. C01-I02 qualification builds the documentary examinations.
4. The independent C01-I02 completeness verifier validates the supplied proof against the admitted corpus and stored documentary Conflicts.
5. C01-I01 `verifyResult` checks the supplied resolution result exactly, including eligible groups and Decisions.
6. Acceptance returns a deterministic status, reason codes and digest. No input object is deleted, corrected or mutated.

An examination whose result is `INDETERMINATE` is covered and can be accepted. A missing proof is `REJECTED`, except when the producer explicitly declares `qualificationVerificationStatus: 'UNAVAILABLE'` and the independently checked envelope and corpus are valid; this documented inability to conclude is `INDETERMINATE`. This marker cannot override any known violation.

## Closed reason codes

DOMAIN_INVALID, ENVELOPE_INVALID, PAYLOAD_INTEGRITY_INVALID, CONTEXT_INTEGRITY_INVALID, CORPUS_INVALID, QUALIFICATION_INVALID, COMPLETENESS_INVALID, COMPLETENESS_INDETERMINATE, ELIGIBILITY_INVALID, RESOLUTION_MISMATCH, UNEXPECTED_DECISION, MISSING_DECISION, NON_ELIGIBLE_ASSERTION_TRANSMITTED, SUPERSESSION_INVALID.

Reasons are deduplicated and sorted. `verifyAcceptanceResult(envelope,result)` independently checks the claimed acceptance record by recomputing it; lower-level results alone are never valid acceptance records.

## Scope and limitations

C01-I03 orchestrates the existing C01-I01 and C01-I02 implementations. The historical Store, schema 1.0.0, policy 1.0.0, engine 2.0.0 and canonical SBOM remain unchanged. No network dependency or project inference is introduced.

The acceptance contract is limited to the fixture documentary domain and its declared qualification rules. The next business increment must use archived, cross-checked evidence for PackageIdentity → ProjectIdentity and must not infer a mapping from names, namespaces, URLs, repositories or similarity.
