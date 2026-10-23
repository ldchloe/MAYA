# MAYA — Rapport de clôture du Lot B (MVP Maven)

Date de décision : **23 octobre 2026**. Statut : **CLOSED / accepté**. Rapport B-06 accepté, sans extension du périmètre Maven.

## Objectifs initiaux

Résoudre une identité de package Maven depuis un SBOM CycloneDX canonique sans mutation du SBOM ; valider / reconstruire les PURL et coordonnées ; observer Maven Central à la portée package ou version ; archiver les réponses et la provenance ; appliquer les contrats probatoires et les décisions existantes du Lot A ; tester au moins trois SBOM réels distincts avec rejeu hors réseau.

## Livrables réalisés

- **B-01 / #15 :** PackageIdentity stable, indépendante de la version, extraction Maven depuis le modèle canonique.
- **B-02 / #16 :** validation, normalisation et reconstruction PURL, provenance et contradictions conservées.
- **B-03 / #17 :** acquisition Maven Central package/version et distinction Found / NotFoundObserved / erreurs techniques.
- **B-04 / #18 :** MavenObservation liée à une acquisition relue depuis archive, intégrité SHA-256, URL POM traitées comme observations, Evidence et provenance.
- **B-05 / #19 :** intégration ComponentEnrichment + Evidence / Assertion / Decision du Lot A, statuts Resolved / Unknown / Conflicted, non-mutation du SBOM, rejeu hors réseau.
- **B-06 / #20 :** trois SBOM réels de projets différents exécutés ; recettes Maven Central réelles, archivage, décisions et rejeu hors réseau.

**Intégration Git :** [PR #25](https://github.com/ldchloe/MAYA/pull/25), fusionnée dans `main` le 23/10/2026, commit `da62cf5b6ee592112006685d2cea86b1f7547b22`. PR [#21](https://github.com/ldchloe/MAYA/pull/21), [#22](https://github.com/ldchloe/MAYA/pull/22), [#23](https://github.com/ldchloe/MAYA/pull/23), [#24](https://github.com/ldchloe/MAYA/pull/24) fermées sans fusion directe car reprises dans la branche d'intégration. La branche historique B-02 diverge encore de main (trois commits propres) : ne pas refusionner mécaniquement.

**Tickets clos :** [#15](https://github.com/ldchloe/MAYA/issues/15), [#16](https://github.com/ldchloe/MAYA/issues/16), [#17](https://github.com/ldchloe/MAYA/issues/17), [#18](https://github.com/ldchloe/MAYA/issues/18), [#19](https://github.com/ldchloe/MAYA/issues/19), [#20](https://github.com/ldchloe/MAYA/issues/20) et ticket parent [#7](https://github.com/ldchloe/MAYA/issues/7).

## Corpus opérationnel et preuves

| Source réelle | Fixture versionnée | Coordonnée contrôlée | Résultat |
| --- | --- | --- | --- |
| Apache Camel Kamelets | `tests/fixtures/b06-apache-camel-kamelets.json` | `com.amazon.redshift:redshift-jdbc42:2.3.0` | Found → Resolved, archive SHA-256, rejeu offline |
| SCANOSS Java | `tests/fixtures/b06-scanoss-java.json` | `junit:junit:4.13.1` | Found → Resolved, archive SHA-256, rejeu offline |
| Europeana Corelib | `tests/fixtures/b06-europeana-corelib.json` | `junit:junit:4.13.2` | Found → Resolved, archive SHA-256, rejeu offline |

**Chaîne validée par SBOM :** import CycloneDX → composant canonique → identité / PURL → Maven Central live → archivage / SHA-256 → MavenObservation → Evidence / Assertion / Decision → ComponentEnrichment Lot A → replay hors réseau → contrôle SBOM inchangé.

Preuves : [journal B-06 détaillé #20](https://github.com/ldchloe/MAYA/issues/20#issuecomment-6361781723), [test d'intégration sur branche d'intégration](https://github.com/ldchloe/MAYA/blob/main/tests/b06-real-sboms.test.js), [recette opérationnelle complémentaire](B06_OPERATIONAL_VALIDATION_2026-10-23.md), [CI 58/58 Maven et 167/167 ensemble](https://github.com/ldchloe/MAYA/actions/runs/39932158374), [CI post-fusion main réussie](https://github.com/ldchloe/MAYA/actions/runs/39941824219). Tests B-05 : [rapport #19](https://github.com/ldchloe/MAYA/issues/19#issuecomment-6361781082).

## Limites effectivement constatées

- **PURL Maven :** prise en charge partielle des qualifiers, notamment `?type=jar` rejeté sous `INVALID_MAVEN_PURL` dans le diagnostic B-06 ; les coordonnées natives contradictoires ne sont jamais choisies arbitrairement (`INCOMPATIBLE_DECLARATIONS`).
- **Corpus :** trois SBOM réels de trois projets distincts, mais **un composant Maven représentatif par SBOM**, pas une vérification exhaustive des dépendances.
- **Archive :** backend mémoire utilisé pour les tests ; la durabilité d'un stockage persistant n'est pas validée.
- **Réseau :** tests opérationnels live nécessitent Maven Central ; le rejeu relit des archives dans la même exécution sans accès réseau.
- **POM :** extraction conservatrice des URL publiques (certains POM complexes/ambigus peuvent ne pas exposer de lien exploitable). Une URL observée n'établit pas un projet/dépôt officiel.
- **Intégrité :** SHA-256 vérifie une archive locale sans garantir l'authenticité de la source.
- **Périmètre :** Maven uniquement ; aucune extension aux autres écosystèmes, ni résolution Project/Repository, ni modification du Lot A.

## Dette technique assumée

Examiner un backend d'archive persistant avant exploitation durable ; isoler les tests unitaires déterministes des recettes réseau live ; actualiser le workflow CI hérité `b01-node.yml` ; préserver les journaux B-06 et les empreintes de fixtures. Aucune de ces évolutions n'est ajoutée au Lot B clos.

## Décision finale

**Lot A : terminé (inchangé). Lot B : MVP Maven terminé, opérationnellement validé et officiellement clôturé.** Aucun nouveau développement Maven ni nouvelle issue Lot B. La base commune est `main` après fusion de #25, avec CI post-fusion réussie. Les limites restent visibles et ne doivent pas être transformées en garanties plus larges.

## Lot C — préparation minimale

**Prérequis remplis :** PackageIdentity Maven stable, PURL/coordonnées, observation Found avec scope, contenu POM archivé et empreinte, Evidence/Assertion/Decision/ComponentEnrichment Lot A, fixtures réelles et rejeu offline.

**Données déjà disponibles :** identité package/version, PURL déclaré / normalisé / reconstruit, `sourceRef`, `archiveId`, `contentHash`, `observedAt`, outcome et URL publiques POM facultatives (`homepageUrl`, `scmUrl`, `sourceRepositoryUrl`, `issueTrackerUrl`). Aucune de ces URL n'est une validation d'officialité.

**Premier ticket :** [C-01 / #26](https://github.com/ldchloe/MAYA/issues/26) déjà créé et ouvert : candidature PackageIdentity → Project à partir d'une référence POM explicite archivée, sans promouvoir automatiquement un projet officiel.

**Dépendances externes à préparer :** disponibilité de Maven Central pour de nouvelles observations, sources de projet vérifiables indépendamment avant toute affirmation d'officialité, stockage durable d'archives si exploitation persistante attendue. Aucun provider externe nouveau et aucune conception détaillée dans cette clôture.
