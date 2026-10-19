# MAYA
Monitoring Agent for Your Artifacts

## Import SBOM (première tranche canonique)

Le **seul format de fichier pris en charge par le parcours d'import actuel** est **CycloneDX JSON** (objet JSON avec `bomFormat: "CycloneDX"` et `specVersion`). Les champs `components` et `dependencies`, lorsqu'ils existent, doivent être des tableaux.

L'import conserve en mémoire le document JSON original, les composants (y compris les composants imbriqués et `metadata.component` comme racine), les `bom-ref`, PURL, CPE, licences, `externalReferences` et relations `dependencies[].ref → dependencies[].dependsOn`. Les références absentes ou ambiguës sont conservées et signalées. Le modèle canonique est distinct de la vue `packages` utilisée par l'interface et son scoring inchangé.

### Statuts du rapport

- **success** : document CycloneDX JSON valide, sans erreur ni avertissement d'import.
- **partial** : document exploitable mais avec avertissements (par exemple référence de dépendance non résolue ou enregistrement invalide conservé uniquement dans les données brutes).
- **failed** : échec de lecture, JSON mal formé ou structure CycloneDX invalide. Aucun document canonique n'est utilisé pour l'affichage.

Le rapport indique le format, la version, les composants lus et créés, les relations déclarées et résolues, les références non résolues, les avertissements et les erreurs.

### Limites connues

- SPDX, CycloneDX XML, CSV, XLSX et JSON générique **non pris en charge** par ce parcours.
- Validation structurelle minimale, **pas de validation complète contre un schéma CycloneDX**.
- Aucun stockage persistant, backend, compilation ni dépendance tierce ; les données sont perdues au rechargement de la page.
- Les composants canoniques sont conservés sans déduplication ; `metadata.component` est conservé comme racine mais exclu de la projection de scoring, pour préserver les résultats historiques.
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
3. Dans les résultats, vérifiez que les deux lignes `same @ 1` sont distinctes et sélectionnables ; le composant `unversioned` affiche `Inconnue` uniquement dans l'interface.
4. Importez `tests/fixtures/cyclonedx-invalid.json` : statut `failed`, aucune donnée affichée.
5. Vérifiez ensuite le bouton de démonstration, la recherche, les filtres, le réglage des poids et l'export.
6. Restaurez la branche de publication initiale dans **Settings → Pages** après l'essai si nécessaire.

Le déploiement GitHub Pages n'est pas déclenché automatiquement par la création de la branche.
