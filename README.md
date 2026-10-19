# MAYA
Monitoring Agent for Your Artifacts
Analyse de confiance du patrimoine logiciel, gouvernance, supply chain, géopolitique, dépendances critiques

## Import SBOM (première tranche canonique)

Le **seul format de fichier pris en charge par le parcours d'import actuel** est **CycloneDX JSON** (objet JSON avec `bomFormat: "CycloneDX"` et `specVersion`). Les champs `components` et `dependencies`, lorsqu'ils existent, doivent être des tableaux. Le rapport indique explicitement `validationLevel: structural` : ce contrôle des champs interprétés **n'est pas une validation complète contre le schéma officiel CycloneDX**.

L'import conserve en mémoire le document JSON original, les composants (y compris les composants imbriqués et `metadata.component` comme racine), les `bom-ref`, PURL, CPE, licences, `externalReferences` et relations `dependencies[].ref → dependencies[].dependsOn`. Les références absentes ou ambiguës sont conservées et signalées. Le modèle canonique est distinct de la vue `packages` utilisée par l'interface et son scoring inchangé. La vue de compatibilité reproduit volontairement le périmètre historique : composants de premier niveau avec nom, dédoublonnés par `name@version` (première occurrence conservée). Les doublons et composants imbriqués restent tous dans le canonique. Les règles de priorité historiques des licences sont conservées, y compris la concaténation lorsqu'elle était utilisée.

### Statuts du rapport

- **success** : document CycloneDX JSON valide, sans erreur ni avertissement d'import.
- **partial** : document exploitable mais avec avertissements (par exemple référence de dépendance non résolue ou enregistrement invalide conservé uniquement dans les données brutes).
- **failed** : échec de lecture, JSON mal formé ou structure CycloneDX invalide. Aucun document canonique n'est utilisé pour l'affichage.

Le rapport indique le format, la version, le niveau de validation, les composants lus et créés, `dependencyDeclarationsRead` (déclarations lues), `dependencyRelationsCreated` (relations exploitables créées), `invalidDependencyDeclarations` (déclarations non exploitables), les relations résolues, les références non résolues, les avertissements et les erreurs. Chaque déclaration invalide conserve `raw`, `sourcePath` et `reason` dans `document.invalidDependencyDeclarations`. Les doublons de `bom-ref` sont signalés même sans dépendances.

### Limites connues

- SPDX, CycloneDX XML, CSV, XLSX et JSON générique **non pris en charge** par ce parcours.
- Validation structurelle minimale, **pas de validation complète contre un schéma CycloneDX**.
- Aucun stockage persistant, backend, compilation ni dépendance tierce ; les données sont perdues au rechargement de la page.
- Les composants canoniques sont conservés sans déduplication ; `metadata.component`, les composants imbriqués et les composants sans nom restent dans le canonique, mais sont exclus de la projection historique. Les doublons `name@version` sont dédoublonnés **uniquement dans la vue historique**, pour préserver les résultats antérieurs.
- Les dépendances sont conservées dans le modèle mais **ne modifient pas les formules de scoring existantes**.
- Les licences multiples et références externes sont conservées dans le canonique ; l'interface historique n'affiche qu'une licence.
- Les enrichissements futurs `github`, `organization`, `maintainers` et `country` sont réservés mais vides.
- Les données imbriquées non prises en charge restent dans `raw` ; le rapport signale certaines structures incorrectes.

### Tests

Depuis la racine du dépôt, avec Node.js récent :

```sh
node --test tests/cyclonedx.test.js
```

Aucun `npm install` n'est nécessaire.

### Essai manuel avec GitHub Pages

GitHub Pages publie généralement la branche configurée (souvent `main`). Pour tester cette branche sans fusion, configurez temporairement **Settings → Pages → Build and deployment → Deploy from a branch**, sélectionnez `feature/canonical-cyclonedx-import` et `/(root)`, puis enregistrez. Attendez la publication et ouvrez `https://ldchloe.github.io/MAYA/`.

1. Dans **Import**, sélectionnez `tests/fixtures/cyclonedx-valid.json` (téléchargez d'abord ce fichier depuis le dépôt si nécessaire).
2. Vérifiez que le rapport indique `partial`, CycloneDX JSON, version `1.5`, **3 composants lus**, **5 créés** (racine et composant imbriqué inclus), **3 dépendances déclarées**, **2 résolues**, **1 référence non résolue**.
3. Dans les résultats, vérifiez qu'une seule ligne `same @ 1` est scorée (déduplication historique), et que `unversioned` affiche `Inconnue` uniquement dans l'interface. Les deux occurrences `same @ 1` et le composant imbriqué restent présents dans le modèle canonique.
4. Importez `tests/fixtures/cyclonedx-invalid.json` : statut `failed`, aucune donnée affichée.
5. Vérifiez ensuite le bouton de démonstration, la recherche, les filtres, le réglage des poids et l'export.
6. Restaurez la branche de publication initiale dans **Settings → Pages** après l'essai si nécessaire.

Le déploiement GitHub Pages n'est pas déclenché automatiquement par la création de la branche.

### Garantie de compatibilité et concurrence

Les formules `score()` et `global()` et les pondérations n'ont pas changé. `tests/legacy-scoring.js` fige le comportement de la branche `main`, et les tests comparent les champs projetés, chaque dimension, le score global, la moyenne et le classement. Chaque import possède un identifiant croissant ; les tentatives obsolètes sont ignorées et la réinitialisation invalide les lectures en attente. Une erreur imprévue produit un rapport `failed` sans stack trace affichée ; le diagnostic technique reste dans la console.

### Modèle canonique étendu : services, graphe et provenance

Le modèle CycloneDX JSON conserve désormais les services dans `document.services` (y compris les services imbriqués), avec leurs attributs, `raw` et `sourcePath`. L'index des `bom-ref` couvre les composants (racine et imbriqués compris) et les services. Les dépendances de `document.dependencies` exposent `sourceEndpoint` et `targetEndpoint`, chacun avec `reference`, `resolvedEntityId`, `resolvedEntityType` et `resolutionStatus` (`resolved`, `missing`, `ambiguous`). Une collision entre service et composant reste ambiguë.

Chaque entrée du tableau source `dependencies` possède une entrée dans `document.dependencyDeclarations` avec `raw`, `sourcePath`, `dependsOn` original, `validationStatus` et `resolutionStatus`. Les déclarations valides sans relations sortantes ont `validationStatus: "declared-empty"`; celles comportant des dépendances ont `declared-with-dependencies`. Les entités sans déclaration portent `dependencyGraphStatus: "absent-from-graph"` : cela **ne signifie jamais qu'elles sont indépendantes**. Les déclarations invalides sont aussi accessibles dans `invalidDependencyDeclarations`. Le rapport expose `dependencyDeclarationsRead`, `emptyDependencyDeclarations`, `dependencyRelationsCreated`, `entitiesAbsentFromDependencyGraph`, `invalidDependencyDeclarations`, `missingReferences` et `ambiguousReferences`. Les deux derniers compteurs portent sur les références distinctes.

Les associations `document.partyAssociations` conservent séparément les rôles `supplier`, `manufacturer`, `author`, `publisher`, `provider` et `creator` quand ils sont observés, sans déduction ni fusion d'identités. `document.externalReferences` comprend également les références du document ; `document.compositions` conserve les compositions ; `document.provenance` conserve les informations de provenance reconnues (notamment `pedigree`, `evidence`, `metadata.tools` et `metadata.lifecycles`). Les champs non extraits restent accessibles dans `raw`.

**Limites :** validation uniquement structurelle (`validationLevel: "structural"`), pas de validation exhaustive des schémas CycloneDX ; les données de provenance propres à des extensions restent dans `raw` si elles ne correspondent pas aux champs reconnus ; aucune inférence de pays, juridiction ou identité organisationnelle. La projection historique de scoring reste limitée aux composants de premier niveau, sans changer `score()`, `global()` ou les pondérations.

Pour vérifier la tranche : `node --test tests/cyclonedx.test.js`, puis importer une fixture dans un navigateur depuis la branche déployée sur GitHub Pages.
