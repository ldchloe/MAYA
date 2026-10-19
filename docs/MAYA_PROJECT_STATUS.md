# MAYA – Vision, Architecture et Roadmap

## 1. Vision

MAYA est une plateforme d'analyse de confiance du patrimoine logiciel.

L'objectif est de partir d'un SBOM (CycloneDX ou SPDX) pour produire une analyse explicable et reproductible des :

- risques techniques ;
- risques de gouvernance ;
- risques liés à la supply chain logicielle ;
- risques géopolitiques ;
- dépendances critiques.

L'approche est européano-centrée et vise à mettre en évidence les dépendances vis-à-vis d'acteurs, d'organisations, de juridictions ou d'infrastructures extra-européennes.

Les analyses doivent toujours être fondées sur des preuves consultables, des données sourcées et des règles explicites.

MAYA ne doit jamais confondre :

- les faits observés ;
- les preuves ;
- les décisions ;
- les interprétations ;
- les scores.

---

# 2. ADR (Architecture Decision Records)

## ADR-01
Le SBOM canonique est séparé de toute donnée enrichie.

## ADR-02
Toutes les assertions reposent sur au moins une preuve.

## ADR-03
Les entités Project, Repository, Organization et Foundation sont distinctes.

## ADR-04
Aucune entité ne doit être fusionnée sur la seule similarité des noms.

## ADR-05
La collecte externe est réalisée hors navigateur et produit un enrichissement versionné.

## ADR-06
Aucune propagation automatique de pays, juridiction ou géographie.

## ADR-07
Les états Unknown et Conflicted sont considérés comme des résultats valides.

## ADR-08
Toutes les décisions doivent être auditables, explicables et reproductibles.

---

# 3. Modèle canonique

Le modèle canonique représente fidèlement le contenu du SBOM sans enrichissement externe.

## Entités principales

### SbomDocument

Représente le document source :

- contenu original ;
- empreinte SHA-256 ;
- format ;
- version ;
- métadonnées ;
- rapport d'import.

### SbomComponent

Représente un composant déclaré :

- nom ;
- version ;
- type ;
- groupe ;
- licences ;
- identifiants ;
- propriétés ;
- données source.

### SbomService

Représente un service CycloneDX :

- endpoints ;
- provider ;
- trust boundary ;
- métadonnées ;
- références externes.

### SbomDependency

Représente une relation du graphe :

- composant → composant ;
- composant → service ;
- service → composant ;
- service → service.

### SbomIdentifier

Conserve :

- PURL ;
- CPE ;
- bom-ref ;
- SPDX ID ;
- autres identifiants.

### SbomLicense

Conserve :

- licence déclarée ;
- licence conclue ;
- expressions SPDX ;
- références.

### SbomExternalReference

Conserve :

- repository ;
- documentation ;
- VCS ;
- distribution ;
- issue tracker ;
- références diverses.

## Principe fondamental

Le modèle canonique est immuable.

Aucune donnée enrichie ne modifie le contenu d'origine.

---

# 4. Modèle d'enrichissement

Le modèle d'enrichissement ajoute des informations externes sans altérer le SBOM.

## ComponentEnrichment

Point d'entrée principal.

Associe à un composant :

- un projet ;
- un repository ;
- des assertions ;
- des preuves ;
- des conflits ;
- des décisions.

## Project

Représente un projet logiciel.

Exemples :

- Spring Framework ;
- Kubernetes ;
- OpenSSL ;
- Terraform.

Un projet peut produire plusieurs paquets.

## Repository

Représente un dépôt source.

Exemples :

- GitHub ;
- GitLab ;
- Bitbucket.

Le repository n'est pas automatiquement le dépôt officiel.

## Evidence

Entité centrale du système.

Une preuve contient :

- la source ;
- la date ;
- la méthode ;
- la valeur observée ;
- le niveau de confiance.

Types de preuve :

- declarative ;
- observed ;
- verified ;
- derived.

Les preuves sont immuables.

## Assertion

Une affirmation vérifiable.

Exemples :

- ce dépôt est officiel ;
- ce projet correspond à ce composant ;
- cette licence est applicable.

Une assertion sans preuve est interdite.

## Conflict

Conserve les contradictions :

- plusieurs dépôts ;
- plusieurs licences ;
- plusieurs projets ;
- plusieurs identités.

## Decision

Journalise :

- ce qui a été retenu ;
- ce qui a été écarté ;
- pourquoi.

Toutes les décisions doivent être reproductibles.

---

# 5. Invariants

## INV-01
Le document canonique n'est jamais modifié.

## INV-02
Chaque enrichissement référence un composant existant.

## INV-03
Toute assertion possède au moins une preuve valide.

## INV-04
Une preuve créée ne peut plus être modifiée.

## INV-05
Les conflits sont conservés.

## INV-06
Les informations inconnues restent null.

## INV-07
Les décisions sont reproductibles.

## INV-08
Les identifiants sont uniques.

## INV-09
Aucune association n'est créée sur une simple similarité de nom.

## INV-10
Aucun score de gouvernance, supply chain ou géopolitique n'est produit sans données explicites.

## INV-11
Le scoring historique reste inchangé.

## INV-12
Le socle d'enrichissement fonctionne sans accès réseau.

---

# 6. Règles géopolitiques

Les inférences suivantes sont interdites :

- déduire un pays à partir d'un namespace ;
- déduire une nationalité à partir d'un nom ;
- déduire une juridiction à partir d'un domaine Internet ;
- déduire une géographie à partir d'une forge logicielle ;
- déduire un risque géopolitique à partir de la langue d'un projet.

Les futures analyses géopolitiques devront être fondées uniquement sur des relations documentées et vérifiables.

---

# 7. Roadmap

## Sprint terminé

### Canonical CycloneDX Import

✅ Import CycloneDX JSON

✅ Composants

✅ Services

✅ Dépendances

✅ Licences

✅ Identifiants

✅ Références externes

✅ Graphe de dépendances

✅ Compatibilité du scoring historique

---

## Lot A — Foundation Layer

✅ ComponentEnrichment

✅ Project

✅ Repository

✅ Evidence

✅ Assertion

✅ Conflict

✅ Decision

✅ Confiance déterministe

✅ Versionnement

Lot A done on Oct 19th 2026

---

## Lot B — Identity Resolution

⬜ PURL

⬜ Namespace

⬜ npm

⬜ PyPI

⬜ Maven Central

⬜ NuGet

⬜ crates.io

⬜ Go Packages

---

## Lot C — Project Resolution

⬜ Correspondance paquet → projet

⬜ Correspondance projet → repository

⬜ Monorepos

⬜ Forks

⬜ Miroirs

---

## Lot D — Technical Metadata

⬜ Langages

⬜ Licences

⬜ Expressions SPDX

⬜ Conflits de licences

---

## Lot E — Governance Layer

⬜ Organization

⬜ Foundation

⬜ Maintainer

⬜ Relations de gouvernance

---

## Lot F — Geographic Facts

⬜ CountryRelationship

⬜ Juridictions

⬜ Hébergement

⬜ Localisation documentée

---

## Lot G — Trust Events

⬜ Changement de propriétaire

⬜ Changement de licence

⬜ Acquisition

⬜ Changement de repository

⬜ Changement de fondation

⬜ Incident supply chain

⬜ Compromission

---

## Lot H — Trust Analysis

⬜ TrustAssessment

⬜ Gouvernance

⬜ Supply Chain

⬜ Concentration

⬜ Géopolitique

⬜ Dépendances critiques

⬜ Score de confiance sur 100

---

# Vision cible

SBOM
↓
Modèle canonique
↓
Enrichissement
↓
Preuves
↓
Décisions
↓
Gouvernance
↓
Supply Chain
↓
Géopolitique
↓
Confiance
↓
Rapports COMEX et Excel d'analyse
