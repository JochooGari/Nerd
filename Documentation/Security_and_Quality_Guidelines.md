# Sécurité, qualité et pratiques d’implémentation

## Sécurité
- Pas de secrets en code ni dans Git; utiliser des variables d’environnement `.env`/système.
- Ne jamais loguer mots de passe, clés, tokens ou données sensibles.
- Hasher les mots de passe (jamais en clair).
- HTTPS obligatoire pour tout trafic réseau.
- Valider/filtrer les entrées utilisateur (anti-injection, XSS, SQLi). Ne jamais faire confiance au front-end; revérifier côté serveur.
- Tokens d’accès à durée courte; RBAC (permissions minimales).
- Chiffrer les données sensibles au repos (DB, fichiers).
- Ne pas exposer les versions internes (headers HTTP).
- Désactiver les features inutiles (surface d’attaque minimale).
- Tenir à jour les dépendances; vérifier la réputation des libs.
- Rate limiting sur endpoints sensibles (notamment login).
- Forcer des mots de passe forts.

## Qualité & Clean Code
- 1 fichier = 1 responsabilité; séparer UI / logique métier / API.
- Fonctions courtes (< 30 lignes), 1 rôle, noms explicites (éviter x, y).
- Docstring pour chaque fonction créée.
- 1 test unitaire par fonction publique.
- Gérer les erreurs avec logs (sans informations sensibles).
- DRY, KISS, YAGNI, SOLID; refactor régulier; pas d’optimisation prématurée.
- Mettre à jour `docs` (ce dossier) à chaque changement notable.

## Données & Modèle
- Favoriser un schéma étoile clair (dimensions/faits) pour Power BI.
- Définir les extractions brutes (sans transformation) côté DWH lorsque demandé; tracer les mappings sources→cible.
- Documenter les règles de calcul des agrégations (si introduites) et les dépendances.

