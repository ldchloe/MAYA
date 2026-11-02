# MAYA — Productization Excel MVP

## Quick start

```bash
node js/reporting-cli.js tests/fixtures/b06-scanoss-java.json --output maya-analysis-example.xlsx --mode offline
```

No npm installation is required. Output is a genuine, deterministic Office Open XML workbook with exactly two sheets: **COMEX** and **DETAIL**. It is not a spreadsheet calculation engine; it exports immutable H01 scores, coverage, dimensions and traceability.

## Input support (verified against current repository)

- **CycloneDX JSON**: supported by `js/cyclonedx-json.js` canonical import.
- **CycloneDX XML, SPDX JSON, SPDX XML**: explicitly rejected as unsupported because the current repository has no canonical import adapter for those formats. Never silently reinterpret them as CycloneDX JSON.
- Invalid JSON or invalid canonical SBOM: explicit `INVALID_SBOM` error.
- Structural import warnings are retained in diagnostics, not silently corrected.

## Analysis mode

`--mode offline` (default) consumes only repository-pinned official archives and approved bridge authorities. `--mode online` is accepted but **does not perform acquisitions** until an authorized provider integration is configured; a diagnostic warning states this clearly. No external calls are made by the product coordinator.

## Pipeline

Canonical import → Maven PackageIdentity normalization (B) → explicit approved bridge (C) → technical metadata D → verified governance E → geographic facts F → trust events G → H01 assessment and portfolio → Excel.

C01 project identity is resolved only when an exact Maven coordinate matches a repository-approved archive/bridge and the existing issuer verifies the evidence. Other components stay UNKNOWN. No forge, namespace, domain or name inference.

The H01 engine is unchanged. Excel does not implement risk scoring. Missing evidence yields UNKNOWN, low coverage and potentially a null trust score. The workbook must never portray an unscored component as a trusted one.

## Workbook

**COMEX**: executive score + coverage, confidence, risk drivers, European exposure, governance/structural concentration (numerators, denominators, unknowns), verified critical dependencies, supply-chain incident alerts and data gap warnings. RELEASE events are not treated as incidents.

**DETAIL**: one row per non-root canonical component, with identity, source metadata, governance, separate geographic relationships, H01 six dimensions, score, coverage, confidence, conflicts, evidence/decision IDs and assessment ID. The sheet has freeze panes and filters. Missing values are explicitly UNKNOWN.

The theme uses restrained purple/magenta headings, white backgrounds and neutral grey UNKNOWN styling, inspired by Wavestone without implying endorsement.

## Limitations

The workbook is a deterministic audit snapshot, not a substitute for professional judgement. The currently approved evidence corpus covers only a few exact Maven coordinates; most large real SBOMs will have low coverage. The report is marked **DEMO / TEST DATA** when generated from fixtures. Functional criticality is not inferred. Country classification is descriptive; policy H01 determines any risk contribution.

`inspectWorkbook` validates ZIP entry CRC, workbook structure, sheets, freeze, filters and data readback. No Excel formulas recalculate H01 risk.

## Validation

```bash
node --test tests/reporting-product.test.js
node --test tests/*.test.js
node --check js/reporting-product.js
node --check js/reporting-xlsx.js
node --check js/reporting-cli.js
git diff --check
```

CI generates a demonstrator workbook from the real pinned Europeana CycloneDX fixture and uploads it as a GitHub Actions artifact. The next phase is client-like large-SBOM performance and readability validation.
