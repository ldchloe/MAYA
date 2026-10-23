# B-06 — corpus de validation opérationnelle (2026-10-23)

Révision de référence : `46441f32bcc4d55493141d10070ecb814c45a853`. Aucun changement de code fonctionnel.

| Cas | Fixture versionnée | Source immuable | CycloneDX | Composant | PURL |
|---|---|---|---|---|---|
| Spring Core | `tests/fixtures/b06-spring-feroz-sbom.json` | https://github.com/feroz-hub/sbom/blob/b97f7a825e950df29fb9a86e2fc42e84a320ae7c/samples/inputsbom.json | 1.6 | spring-core 5.2.0.RELEASE | `pkg:maven/org.springframework/spring-core@5.2.0.RELEASE` |
| Log4j Core | `tests/fixtures/b06-europeana-corelib.json` | https://github.com/europeana/corelib/blob/main/bom.json ; copie figée dans MAYA | 1.7 | log4j-core 2.25.3 | `pkg:maven/org.apache.logging.log4j/log4j-core@2.25.3` |
| JUnit | `tests/fixtures/b06-scanoss-java.json` | https://github.com/scanoss/scanoss.java/blob/main/SBOM.json ; copie figée dans MAYA | 1.4 | junit 4.13.1 | `pkg:maven/junit/junit` (version native 4.13.1) |

Exécution : `tests/b06-operational-proof.test.js`, dans le workflow existant `B-01 Node validation` (push sur `main`). Les trois lignes `B06_OPERATIONAL_JOURNAL` fournissent les références complètes : SHA-256 SBOM, componentId, PackageIdentity, PURL, URL Maven, archiveId, contentHash, MavenObservation, Evidence, Assertion, Decision, replay, non-mutation.

Exécution initiale de diagnostic : PURL avec qualificateur `?type=jar` rejeté (`INVALID_MAVEN_PURL`) ; second SBOM Spring avec champ natif `name=org.springframework:spring-core` contradictoire rejeté (`INCOMPATIBLE_DECLARATIONS`). Aucune correction de code : choix d'un SBOM réel dont les coordonnées déclarées et natives sont cohérentes. Ces deux limitations de couverture sont documentées, non masquées.

Les trois cas du corpus final doivent produire `Found`, `Resolved`, `replay=Resolved`, `sbomUnchanged=true`. Les identifiants d'archive et de décision peuvent varier entre exécutions si l'horodatage varie ; la reproductibilité testée porte sur le statut, la provenance, l'intégrité du contenu et la sélection d'assertion au rejeu.
