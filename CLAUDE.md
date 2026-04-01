# Collect&Track — Contexte projet

## Identité

- **Nom** : Collect&Track
- **Client** : STEP POST (filiale de STEP, société eco-postale française)
- **Objectif** : Application de traçabilité des collectes de courrier. Les facteurs scannent un QR Code chez chaque client pour enregistrer leur passage. Le système vérifie la conformité horaire et alerte en cas d'anomalie.

---

## URLs de déploiement

| Service | URL |
|---------|-----|
| **Frontend** (Render Static Site) | https://collect-track-frontend.onrender.com |
| **Backend** (Render Web Service) | https://collect-track-backend.onrender.com |
| **Base de données** (Supabase PostgreSQL) | `aws-1-eu-west-1.pooler.supabase.com` — projet `iraootvkkpmrhbzglvta` |

**Compte admin par défaut** : `admin@collectandtrack.fr` / `Admin1234!`

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | Node.js + Express.js |
| Frontend | React 18 + Vite |
| Base de données | PostgreSQL via Prisma ORM |
| Auth | JWT + bcrypt (salt rounds: 12) |
| État frontend | Zustand |
| HTTP client | Axios |
| Scan QR | html5-qrcode |
| Génération QR | qrcode (npm) |
| Export Excel | exceljs |
| Upload photos | multer |
| Cron jobs | node-cron |
| Emails | nodemailer |
| Police | Inter (Google Fonts) |

---

## Structure du projet (monorepo)

```
collect-and-track/
├── CLAUDE.md
├── .gitignore
├── README.md
│
├── backend/
│   ├── server.js                  # Point d'entrée, montage routes, cron jobs
│   ├── package.json
│   ├── .env / .env.example
│   ├── prisma/
│   │   ├── schema.prisma          # Modèles : User, Client, Collecte, Photo, Alerte, Tournee, TourneeClient, Parametre
│   │   ├── seed.js                # Admin par défaut + 10 paramètres système
│   │   └── migrations/
│   │       └── 20260401000000_add_client_ordre/migration.sql  # Ajout colonne ordre sur Client
│   ├── uploads/                   # Photos uploadées (multer)
│   └── src/
│       ├── middlewares/
│       │   ├── auth.js            # Vérifie JWT sur toutes les routes sauf /api/auth/login
│       │   └── role.js            # Vérifie le rôle (admin / manager / facteur)
│       ├── routes/                # auth, collectes, dashboard, admin, export
│       ├── controllers/           # auth, collectes, dashboard, admin, export
│       └── services/
│           ├── conformite.service.js   # Calcul statut conforme/hors_marge/incident (exports: calculerStatut, estJourCollecte, heureEnMinutesParis, jourISOParis)
│           ├── alerte.service.js       # Création alertes + envoi email groupé manquants
│           ├── rapport.service.js      # Rapport journalier automatique
│           └── qrcode.service.js       # Génération QR Code PNG/base64
│
└── frontend/
    ├── index.html
    ├── vite.config.js             # Proxy /api → localhost:3001 en dev
    ├── package.json               # build = vite build && cp dist/index.html dist/404.html
    ├── public/
    │   └── _redirects             # /* /index.html 200 — SPA routing sur Render
    └── src/
        ├── main.jsx
        ├── App.jsx                # Router, PrivateRoute, redirect selon rôle
        ├── styles/
        │   └── theme.js           # Design system STEP POST (couleurs, typo, spacing)
        ├── api/
        │   └── axios.js           # Instance axios, baseURL avec /api, intercepteurs JWT
        ├── store/
        │   └── useAuthStore.js    # Zustand : login, logout, fetchMe
        ├── components/
        │   ├── Layout.jsx         # Header sticky (logo + nav + profil), police Inter
        │   └── PrivateRoute.jsx   # Protection routes par rôle
        └── pages/
            ├── Login.jsx
            ├── facteur/
            │   ├── Scan.jsx       # Scanner QR, confirmation avant envoi, liste tournée du jour temps réel
            │   ├── Tournee.jsx    # Liste clients du jour + progression
            │   └── Incident.jsx   # Signalement incident + upload photos
            ├── manager/
            │   ├── Dashboard.jsx  # Stats cliquables, conformité, alertes + modal résolution
            │   └── Historique.jsx # Liste filtrée, pagination, export Excel, suppression, résolution
            └── admin/
                ├── Admin.jsx      # Onglets Users / Clients / Paramètres
                └── tabs/
                    ├── UsersTab.jsx
                    ├── ClientsTab.jsx     # Réordonnancement ↑/↓ de la tournée
                    └── ParametresTab.jsx
```

---

## Rôles utilisateurs

| Rôle | Accès |
|------|-------|
| `facteur` | Scan QR, tournée du jour, signaler incident |
| `manager` | Dashboard, historique, export Excel, traiter alertes |
| `admin` | Tout + gestion utilisateurs / clients / paramètres système |

---

## Règles métier critiques

### Conformité horaire (`conformite.service.js`)

Chaque client a une plage `heureDebut`→`heureFin` et une `margeMinutes`.

| Heure du scan (heure Paris) | Statut |
|-----------------------------|--------|
| Dans `[heureDebut, heureFin]` | `conforme` ✅ |
| Dans `[heureDebut - marge, heureFin + marge]` | `hors_marge` ⚠️ |
| En dehors | `incident` 🚨 |

> **Important** : le calcul utilise `Intl.DateTimeFormat` avec `timeZone: 'Europe/Paris'` pour être indépendant du fuseau UTC du serveur Render. Toutes les fonctions temporelles (heureEnMinutesParis, jourISOParis) sont exportées depuis `conformite.service.js`.

### Jours de collecte (`estJourCollecte`)

- `joursCollecte` : tableau d'entiers ISO (1=Lundi … 7=Dimanche)
- Le scan est refusé si le jour courant (heure Paris) n'est pas dans le tableau
- Tableau vide = aucune restriction

### Ordre de tournée

- Chaque `Client` a un champ `ordre Int @default(0)` définissant son rang dans la tournée quotidienne
- Les clients s'affichent triés par `ordre ASC` dans l'admin et sur la page Scan du facteur
- Un nouveau client reçoit automatiquement `ordre = count(clients)` (placé en fin de liste)
- Migration : `prisma/migrations/20260401000000_add_client_ordre/migration.sql`

### Sélection du facteur au scan

1. Liste déroulante de tous les facteurs actifs
2. Pré-sélection : paramètre `facteur_defaut_id` s'il est défini
3. Sinon : utilisateur connecté s'il est facteur
4. Aucun blocage si aucun facteur par défaut

### Statut incident

Le statut `incident` peut être positionné de deux façons :
- **Automatiquement** par le calcul de conformité (hors plage étendue)
- **Manuellement** via `PUT /api/collectes/:id/incident` (appel séparé depuis la page Incident)

### Détection doublon de scan

Avant d'enregistrer un scan, le backend vérifie si le même client a déjà une collecte aujourd'hui. Si oui, retourne HTTP 409 avec `{ alreadyScanned: true, heureExistante }`. Le frontend propose une confirmation avant de forcer avec `{ force: true }`.

### Résolution d'alerte

Quand un manager traite une alerte, il peut saisir un commentaire de résolution. Ce texte est sauvegardé dans `Collecte.notes` (préfixé `"Résolution : "`). Il apparaît automatiquement dans l'historique avec un bandeau vert.

---

## Flux scan QR (page Scan.jsx)

1. Facteur clique "Démarrer le scan" → caméra s'ouvre
2. QR Code détecté → caméra s'arrête, appel `GET /collectes/preview?qrCode=xxx`
3. Nom du client + plage horaire s'affichent → bouton "Confirmer le scan"
4. Sur confirmation → `POST /collectes/scan`
   - Si 409 (doublon) → dialog de confirmation avant force
   - Si succès → résultat coloré (vert/orange/rouge) + heure Paris + plage attendue si non conforme
5. La liste de tournée du jour se rafraîchit automatiquement après chaque scan

---

## Routes API principales

### Collectes (`/api/collectes`)
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/scan` | Enregistrer un scan QR |
| GET | `/preview?qrCode=xxx` | Infos client sans enregistrement (avant confirmation) |
| GET | `/tournee/today` | Clients du jour avec statut de scan (triés par ordre) |
| PUT | `/:id/incident` | Marquer en incident |
| DELETE | `/:id` | Supprimer une collecte (manager/admin) |
| POST | `/:id/photos` | Upload photos |

### Dashboard (`/api/dashboard`)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/stats` | Compteurs du jour |
| GET | `/historique` | Liste filtrée avec alertes |
| GET | `/alertes` | Alertes actives |
| PUT | `/alertes/:id/traiter` | Traiter alerte + sauvegarder résolution dans collecte.notes |

---

## Paramètres système (table `Parametre`)

| Clé | Défaut | Description |
|-----|--------|-------------|
| `marge_defaut_minutes` | `15` | Marge horaire par défaut (minutes) |
| `alerte_email_active` | `true` | Activer les alertes email |
| `alerte_email_dest` | — | Destinataires alertes (virgule ou point-virgule) |
| `alerte_hors_marge` | `true` | Alerter pour hors marge |
| `alerte_incident` | `true` | Alerter pour incident |
| `alerte_manquant` | `true` | Alerter pour collecte manquante |
| `heure_verif_manquant` | `17:30` | Heure cron vérification manquants — **à changer en admin si déjà installé** |
| `facteur_defaut_id` | — | ID facteur pré-sélectionné au scan |
| `rapport_auto_actif` | `false` | Rapport journalier automatique |
| `rapport_heure` | `07:00` | Heure envoi rapport journalier (HH:MM) |

---

## Variables d'environnement

### Backend (Render Web Service)

```env
DATABASE_URL=postgresql://postgres.iraootvkkpmrhbzglvta:...@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
JWT_SECRET=<secret 32+ caractères>
JWT_EXPIRES_IN=24h
BCRYPT_SALT_ROUNDS=12
PORT=3001
FRONTEND_URL=https://collect-track-frontend.onrender.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=STEP POST <noreply@steppost.fr>
ALERTE_EMAIL_DEST=manager@steppost.fr
```

### Frontend (Render Static Site)

```env
VITE_API_URL=https://collect-track-backend.onrender.com
```

> **Note Vite** : les variables `VITE_*` doivent être présentes au moment du **build** (pas au runtime). Si elles ne sont pas prises en compte, la `baseURL` dans `axios.js` utilise le fallback hardcodé `https://collect-track-backend.onrender.com/api`.

---

## Commandes utiles

```bash
# Backend — installation + setup BDD
cd backend
npm install
npm run setup           # prisma generate + migrate deploy + seed

# Backend — développement
npm run dev             # nodemon server.js sur port 3001

# Frontend — développement
cd frontend
npm install
npm run dev             # Vite sur port 5173

# Frontend — build production (génère aussi dist/404.html pour le routing SPA)
npm run build
```

### Render — Build & Start commands

| Service | Build command | Start command |
|---------|--------------|---------------|
| Backend | `npm install && npx prisma generate && npx prisma migrate deploy && node prisma/seed.js` | `node server.js` |
| Frontend | `npm install && npm run build` | *(Static Site — publish dir: `dist`)* |

---

## Charte graphique STEP POST

Définie dans `frontend/src/styles/theme.js` :

- **Vert primaire** `#2B6E44` — couleur STEP POST
- **Bleu secondaire** `#1A4480` — couleur corporate STEP
- **Police** : Inter (Google Fonts)
- **Logo** : `frontend/src/assets/Logo vert - STEP POST - RVB.jpg` (importé en ES module dans Layout.jsx et Login.jsx)

---

## Points d'attention / bugs connus résolus

| Problème | Solution |
|----------|----------|
| Export Excel / téléchargement QR Code échouaient (401) | Remplacé `<a href>` par `axios` avec `responseType: 'blob'` |
| Import cassé dans `qrcode.service.js` | Suppression de `const { v4 } = require('crypto')` |
| Calcul conformité faux sur Render (UTC vs Paris) | `Intl.DateTimeFormat` avec `timeZone: 'Europe/Paris'` dans `conformite.service.js` |
| `baseURL` axios utilisait `/api` relatif en prod | Fallback hardcodé `https://collect-track-backend.onrender.com` + `/api` dans `axios.js` |
| Alertes email : un seul destinataire possible | Parsing virgule/point-virgule dans `alerte.service.js` |
| Page blanche sur dashboard | `stats?.tauxConformite !== null` crashait si stats=null → corrigé en `stats && stats.tauxConformite !== null` |
| Rechargement page `/scan` → "Not Found" sur mobile | Fichier `frontend/public/_redirects` + `dist/404.html` généré au build |
| Route `/tournee/today` masquée par `/:id` | Déplacée avant `/:id` dans `collectes.routes.js` |
| Schéma Prisma modifié sans migration → colonnes manquantes en DB | Ne pas modifier `schema.prisma` sans créer un fichier dans `prisma/migrations/` |
| QR Code téléchargé sans nom client | Canvas frontend : QR PNG + nom du client dessiné en dessous avant export |
| Email manquants : un mail par client | Regroupé en un seul email récapitulatif HTML avec tableau des clients non scannés |

---

## Schéma Prisma — points clés

- **Pas de dossier migrations initialement** : le projet a été bootstrappé avec `prisma db push`. Les nouvelles colonnes doivent être ajoutées via `prisma/migrations/<timestamp>_nom/migration.sql` avec `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` pour être idempotentes.
- **`Client.ordre`** : ajouté via migration `20260401000000_add_client_ordre`. Définit l'ordre de passage dans la tournée.
- **`Alerte`** : pas de champ `resolution` en base — la résolution manager est stockée dans `Collecte.notes` (préfixe `"Résolution : "`).
- **Téléchargements authentifiés** : toujours utiliser `axios` avec `responseType: 'blob'` + `URL.createObjectURL()`, jamais `<a href>` direct (pas de JWT dans les headers).
