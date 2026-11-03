# H01 v2 — collecte et vérification des preuves externes

Cette fonctionnalité est expérimentale et **ne modifie pas les scores H01-RISK-1**.

## Statuts
- `DECLARED_UNVERIFIED` : affirmation extraite du SBOM, sans source externe correspondante.
- `INTEGRITY_CHECKED` : contenu archivé présent, SHA-256 exact et citation présente ; cela **ne prouve pas** que le contenu est authentique ou officiel.
- `INDEPENDENTLY_VERIFIED` : une source archivée sur un hôte autorisé correspond à une identité de paquet/version/PURL explicitement validée par l'opérateur, et une valeur correspondante a été trouvée.
- `CONFLICTED` : source archivée admissible avec valeur différente.
- `UNKNOWN` : source non exploitable ou absence d'information.

**Limites :** l'allowlist de domaines n'est pas une preuve d'autorité éditoriale. Un dépôt GitHub ou GitLab peut être contrôlé par un tiers. La confirmation d'identité `confirmedByOperator` est une attestation opérateur, pas une vérification cryptographique de l'éditeur. Le statut indépendant représente une corroboration externe sous ces hypothèses, pas une certification de provenance logicielle. Aucun score de risque n'est modifié par ces résultats.

## Collecter explicitement des archives
Créer `requests.json` avec des objets de la forme :

```json
[
  {
    "componentId": "occurrence-id-from-canonical-export",
    "dimension": "technical",
    "field": "license",
    "value": "GPL-2.0-only",
    "selector": "exact excerpt containing GPL-2.0-only",
    "sourceUrl": "https://gnupg.org/...",
    "identity": {
      "name": "gpgv",
      "version": "1.4.7",
      "purl": null,
      "confirmedByOperator": true
    }
  }
]
```

**Attention :** la dimension des déclarations A01 est `technical` ou `governance`. Le collecteur et le vérificateur utilisent tous deux `technical` pour les déclarations de licence. Ne jamais attribuer une identité de paquet sur la seule base du nom ou du PURL ; confirmer l'URL du projet et la version manuellement avant collecte.

```sh
node js/h01-acquire-cli.js requests.json evidence-archive
node js/reporting-cli.js sbom.json --output report.xlsx --audit-json maya-audit.json --evidence-manifest evidence-archive/manifest.json --mode offline
```

Le répertoire `evidence-archive/sources/` contient les copies horodatées avec empreintes SHA-256. Les requêtes HTTPS ne suivent pas les redirections et sont limitées aux hôtes explicitement autorisés. Les archives restent sur disque : l'export JSON contient leurs métadonnées, non leur contenu. Les chemins sont relatifs au manifeste.

Pour afficher les contrôles, importer le JSON régénéré dans la prévisualisation. Les anciennes évaluations H01 sont conservées pour comparaison.

## Vérifications humaines encore requises
La source peut être contrôlée par un tiers, la licence peut varier selon la version et la citation peut manquer de contexte. Avant d'utiliser ces résultats pour une décision de conformité, vérifier l'autorité de l'éditeur, la correspondance exacte avec le composant, la version, la date et le contexte de la citation.
