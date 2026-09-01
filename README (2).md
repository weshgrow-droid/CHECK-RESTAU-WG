# Wesh Grow — Contrôle préparation restaurants

App statique (sans backend) qui affiche les commandes du jour des restaurants
(hors grossistes) depuis le Google Sheet source, et permet à l'équipe de
cocher chaque client comme "prêt". Les checks sont écrits dans un nouvel
onglet du même Sheet.

## Comment ça marche

- **Aucun serveur** : le navigateur de l'utilisateur appelle directement
  l'API Google Sheets avec son propre jeton OAuth.
- **Contrôle d'accès réel** = le partage du Google Sheet. Un compte Google
  qui n'a pas accès en lecture/écriture sur ce Sheet ne pourra rien faire
  dans l'app, même connecté. Google Cloud Console sert seulement à créer les
  identifiants qui permettent à l'app de demander une connexion.
- **État des checks** : nouvel onglet `Checks` (créé automatiquement au
  premier lancement) avec les colonnes `Client | Date | Statut | Coché par | Horodatage`.
  C'est un journal (chaque clic ajoute une ligne), pas une case modifiée sur
  place — ça donne un historique et évite les conflits d'écriture concurrente.

## Étape 1 — Créer le projet Google Cloud

1. Allez sur [console.cloud.google.com](https://console.cloud.google.com)
2. Créez un projet (ou utilisez un projet existant de votre organisation)
3. Menu **APIs et services > Bibliothèque** → cherchez **Google Sheets API** → **Activer**

## Étape 2 — Créer les identifiants OAuth

1. **APIs et services > Écran de consentement OAuth**
   - Type : **Interne** si vous êtes sur Google Workspace (recommandé — limite
     nativement l'accès à votre organisation), sinon **Externe** + mode "Test"
     avec la liste des emails autorisés
   - Renseignez le nom de l'app, email de support, etc.
2. **APIs et services > Identifiants > Créer des identifiants > ID client OAuth**
   - Type d'application : **Application Web**
   - Origines JavaScript autorisées : ajoutez l'URL de votre future page
     GitHub Pages, par ex. `https://votre-org.github.io`
   - Créez, puis copiez le **Client ID** généré (`....apps.googleusercontent.com`)

## Étape 3 — Partager le Google Sheet

Partagez le fichier `Wesh Grow — Ventes hebdo (API)` avec chaque
collaborateur qui doit utiliser l'app, en accès **Lecteur** a minima
(il leur faut aussi le droit d'écrire si vous voulez qu'ils puissent cocher —
donnez alors **Éditeur**, ou restreignez l'écriture au seul onglet `Checks`
via une protection de plage dans Google Sheets une fois qu'il existe).

## Étape 4 — Configurer le code

Ouvrez `config.js` et renseignez :

- `GOOGLE_CLIENT_ID` : le Client ID de l'étape 2
- `ORDERS_SHEET_TAB` : le nom exact de l'onglet contenant les commandes
  (vérifiez-le en bas de l'écran Google Sheets — j'ai mis `Export_CSV` par
  défaut d'après l'aperçu du fichier, à confirmer)
- `ALLOWED_HOSTED_DOMAIN` : votre domaine Workspace (ex. `weshgrow.com`) pour
  une vérification supplémentaire côté interface — optionnel, la vraie
  sécurité vient du partage du Sheet
- `EXCLUDED_CLIENTS` : déjà rempli avec la liste que vous m'avez donnée.
  Complétez-la si de nouveaux grossistes apparaissent (l'app signale en bas
  de page tout client dont le nom ressemble à une entrée existante, pour
  vous aider à repérer les cas à ajouter)

## Étape 5 — Déployer sur GitHub Pages

```bash
git init
git add .
git commit -m "Première version"
git branch -M main
git remote add origin https://github.com/weshgrow-droid/CHECK-RESTAU-WG.git
git push -u origin main
```

Puis sur GitHub : **Settings > Pages > Source : Deploy from a branch**,
branche `main`, dossier `/ (root)`. L'app sera disponible à
`https://weshgrow-droid.github.io/CHECK-RESTAU-WG/`.

> Si votre organisation GitHub est privée et que vous voulez aussi restreindre
> qui peut *ouvrir* la page (pas seulement qui peut lire les données), GitHub
> Pages sur un repo privé nécessite GitHub Enterprise. Sinon, la page est
> publique dans son HTML/JS, mais reste inutilisable sans un compte Google
> ayant accès au Sheet — c'est la même logique que "le code est visible mais
> la porte est fermée à clé".

## Limites connues

- **Pas de mise à jour en temps réel** entre collaborateurs : chacun doit
  cliquer sur "Actualiser" ou recharger la page pour voir les checks des
  autres. Pour une petite équipe qui vérifie les commandes du jour, ça reste
  largement suffisant. Si besoin d'un vrai temps réel plus tard, on peut
  migrer le stockage des checks vers Firestore.
- **Le classement restaurant/grossiste est une liste figée dans le code**
  (`config.js`). Toute évolution demande de modifier ce fichier et de
  redéployer (`git push`). Si la liste change souvent, on peut la déplacer
  dans un onglet du Sheet pour que l'équipe la modifie sans toucher au code.
- **Le nom exact de l'onglet source** (`ORDERS_SHEET_TAB`) doit être vérifié
  manuellement avant le premier lancement.
