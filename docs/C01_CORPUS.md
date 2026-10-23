# MAYA C-01.1B — corpus Maven réel et rejeu offline

Ce sous-lot est strictement limité aux POM bruts, à la provenance et à l'intégrité. Aucune décision Project n'est produite.

## Versions figées

| groupId | artifactId | version |
|---|---|---|
| junit | junit | 4.13.2 |
| org.springframework | spring-core | 6.1.3 |
| org.apache.logging.log4j | log4j-core | 2.23.1 |

Origine : `https://repo.maven.apache.org/maven2/`, avec chemin Maven dérivé des coordonnées explicites.

## Acquisition contrôlée (opération réseau, manuelle uniquement)

```sh
node scripts/acquire-c01-fixtures.js --acquire
```

Le script télécharge les trois POM, conserve leurs octets sans transformation, écrit leurs empreintes SHA-256, leur longueur, l'URL et la date UTC explicite dans `tests/fixtures/c01/manifest.json`. Les fichiers sont créés exclusivement avec `wx` : tout fichier existant provoque un refus d'écrasement. L'acquisition doit être faite une seule fois dans un environnement autorisé à accéder à Maven Central, puis les archives et le manifeste doivent être commités ensemble.

## Vérification et rejeu sans réseau

```sh
node scripts/acquire-c01-fixtures.js --verify
node --test tests/c01-project-corpus.test.js
```

Le vérificateur relit exclusivement les octets locaux, vérifie coordonnées, URL, chemins, longueurs et SHA-256. Le rejeu ne consulte pas Maven Central et ne crée aucune interprétation Project. La chaîne de preuve est : POM brut → SHA-256 → manifeste → fixture → rejeu offline.

## État d'acquisition

**Archives réelles non acquises dans cette livraison.** L'environnement d'exécution n'a pas pu résoudre `repo.maven.apache.org`. Les tests du corpus échoueront tant que les trois POM et le manifeste réel ne seront pas archivés. Ne pas remplacer les POM par des données synthétiques. Ne pas déclarer ce lot prêt pour revue sans acquisition et tests verts.
