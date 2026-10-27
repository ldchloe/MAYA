# H01 — Explainable Trust Assessment (MVP)

## Scope and non-regression
H01 is an additive, deterministic, offline interpretation layer. It does not modify canonical SBOM, legacy scoring, or Lots A–G. Production ingestion should call `assessVerifiedProject({subjectId,technical,governance,geographic,events,criticality})`: supplied D/E/F/G result objects are reverified by their original validators before mapping. No network acquisitions. Unverified geography and governance cannot be supplied as asserted facts through this adapter.

## Versioned policy
- `config/h01-risk-policy.json` version H01-RISK-1; six risk dimensions, 0–5, weights summing to 100, confidence thresholds, explicit risk transformations.
- `config/h01-geopolitical-policy.json` version H01-EUROPE-1; offline descriptive EU / EEA / EUROPE_NON_EU / NON_EU / UNKNOWN allowlists. Not an exhaustive world country list; unrecognized codes are UNKNOWN. EU/EEA classification is not a political risk judgement.
- TECHNICAL_RISK 20; GOVERNANCE_RISK 20; SUPPLY_CHAIN_RISK 20; CONCENTRATION_RISK 15; GEOPOLITICAL_RISK 15; CRITICALITY_RISK 10.
- Verified licence resolution or governance evidence has zero observed penalty under the versioned MVP policy, **not** a claim of zero real-world risk.
- Verified release events map to zero incident penalty; documented supply-chain incident maps to 3 and compromise maps to 5 in the policy. The production G01 verifier currently only admits two real JUnit releases; controlled test-only compromise fixtures are never admitted as historical facts.
- Verified legal jurisdiction US maps to descriptive NON_EU, and this policy assigns an observed 2/5 contribution to that dimension. This is a configurable *analytical assumption*, not an objective statement that US is inherently risky.
- No verified criticality input implies UNKNOWN. Explicit criticality requires an evidence reference.

## Score and coverage
For VERIFIED dimensions only, penalty = dimensionWeight × riskScore/5. Trust Score = 100 − sum(penalties), clamped 0–100. An UNKNOWN or CONFLICTED dimension contributes **no** risk penalty, but also does not count as verified; the output contains explicit warnings. If no dimension is verified, trustScore is **null**, not 100.

Evidence coverage = 100 × sum(weights of VERIFIED applicable dimensions) / sum(weights of all applicable dimensions). NOT_APPLICABLE is excluded; UNKNOWN and CONFLICTED count as uncovered. Confidence: HIGH >= 80; MEDIUM >= 50; otherwise LOW. Coverage and score are independent, and score must always be read alongside coverage.

`assessTrust` is a pure engine for trusted/controlled inputs. Direct caller-provided riskScore requires decision or evidence provenance; production code should use `assessVerifiedProject` to enforce existing Lot validators.

## Portfolio and reporting
`assessSbom` provides component assessments, overall score (mean of scored components; null if none), overall coverage, risk drivers, unknown warnings, five concentration metrics with denominators, EU/EEA/Europe-non-EU/non-EU/UNKNOWN exposure, verified critical dependencies, recent verified events, and a COMEX-ready `executiveSummary`. Missing attribution is not treated as a positive affiliation. Concentration input fields must be sourced by callers from verified upstream relationships; they are not inferred by this module.

## Replay and gates
Canonical IDs and SHA-256 digests commit input, policy, engine version and results. Identical inputs/policy produce identical results; policy version changes produce different assessment IDs and digests. Node tests cover 0–5/0–100 bounds, unknown, conflict, NOT_APPLICABLE, source tampering, offline E/F/G replay on JUnit/Spring/Log4j, synthetic supply-chain fixtures, policy change, region classification, portfolio determinism. Historical scoring remains unchanged. H-CLOSE-20 requires full green CI before merge.
