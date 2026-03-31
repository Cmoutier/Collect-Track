# Collect&Track — Contexte projet

## Identité

- **Nom** : Collect&Track
- **Client** : STEP POST (filiale de STEP, société eco-postale française)
- **Objectif** : Application de traçabilité des collectes de courrier. Les facteurs scannent un QR Code chez chaque client pour enregistrer leur passage. Le système vérifie la conformité horaire et alerte en cas d'anomalie.

---

## URLs de déploiement

| Service | URL |
|---------|-----|
| **Frontend** (Render Static Site) | https://collect-track-frontend.onrender.com *(à confirmer)* |
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
│   │   ├── schema.prisma          # 7 modèles : User, Client, Collecte, Photo, Alerte, Tournee, Parametre
│   │   └── seed.js                # Admin par défaut + 10 paramètres système
│   ├── uploads/                   # Photos uploadées (multer)
│   └── src/
│       ├── middlewares/
│       │   ├── auth.js            # Vérifie JWT sur toutes les routes sauf /api/auth/login
│       │   └── role.js            # Vérifie le rôle (admin / manager / facteur)
│       ├── routes/                # auth, collectes, dashboard, admin, export
│       ├── controllers/           # auth, collectes, dashboard, admin, export
│       └── services/
│           ├── conformite.service.js   # Calcul statut conforme/hors_marge/incident
│           ├── alerte.service.js       # Création alertes + envoi email
│           ├── rapport.service.js      # Rapport journalier automatique
│           └── qrcode.service.js       # Génération QR Code PNG/base64
│
└── frontend/
    ├── index.html
    ├── vite.config.js             # Proxy /api → localhost:3001 en dev
    ├── package.json
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
            │   ├── Scan.jsx       # Scanner QR, sélection facteur, feedback coloré
            │   ├── Tournee.jsx    # Liste clients du jour + progression
            │   └── Incident.jsx   # Signalement incident + upload photos
            ├── manager/
            │   ├── Dashboard.jsx  # Stats, taux conformité, évolution 7j, alertes
            │   └── Historique.jsx # Liste filtrée, pagination, export Excel
            └── admin/
                ├── Admin.jsx      # Onglets Users / Clients / Paramètres
                └── tabs/
                    ├── UsersTab.jsx
                    ├── ClientsTab.jsx
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

> **Important** : le calcul utilise `Intl.DateTimeFormat` avec `timeZone: 'Europe/Paris'` pour être indépendant du fuseau UTC du serveur Render.

### Jours de collecte (`estJourCollecte`)

- `joursCollecte` : tableau d'entiers ISO (1=Lundi … 7=Dimanche)
- Le scan est refusé si le jour courant (heure Paris) n'est pas dans le tableau
- Tableau vide = aucune restriction

### Sélection du facteur au scan

1. Liste déroulante de tous les facteurs actifs
2. Pré-sélection : paramètre `facteur_defaut_id` s'il est défini
3. Sinon : utilisateur connecté s'il est facteur
4. Aucun blocage si aucun facteur par défaut

### Statut incident

Le statut `incident` peut être positionné de deux façons :
- **Automatiquement** par le calcul de conformité (hors plage étendue)
- **Manuellement** via `PUT /api/collectes/:id/incident` (appel séparé depuis la page Incident)

---

## Paramètres système (table `Parametre`)

| Clé | Description |
|-----|-------------|
| `marge_defaut_minutes` | Marge horaire par défaut (minutes) |
| `alerte_email_active` | Activer les alertes email (`true`/`false`) |
| `alerte_email_dest` | Destinataires alertes, séparés par virgules |
| `alerte_hors_marge` | Alerter pour hors marge |
| `alerte_incident` | Alerter pour incident |
| `alerte_manquant` | Alerter pour collecte manquante |
| `heure_verif_manquant` | Heure cron vérification manquants (HH:MM) |
| `facteur_defaut_id` | ID facteur pré-sélectionné au scan |
| `rapport_auto_actif` | Rapport journalier automatique |
| `rapport_heure` | Heure envoi rapport journalier (HH:MM) |

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

# Frontend — build production
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
- **Logo** : `frontend/public/assets/logo.jpg` (header + login)
  - Fichier source haute qualité : `frontend/src/assets/Logo vert - STEP POST - RVB.jpg`

---

## Points d'attention / bugs connus résolus

| Problème | Solution |
|----------|----------|
| Export Excel / téléchargement QR Code échouaient (401) | Remplacé `<a href>` par `axios` avec `responseType: 'blob'` |
| Import cassé dans `qrcode.service.js` | Suppression de `const { v4 } = require('crypto')` |
| Calcul conformité faux sur Render (UTC vs Paris) | `Intl.DateTimeFormat` avec `timeZone: 'Europe/Paris'` |
| `baseURL` axios utilisait `/api` relatif en prod | Fallback hardcodé vers l'URL Render complète + `/api` |
| Alertes email : un seul destinataire possible | Parsing virgule/point-virgule dans `alerte.service.js` et `rapport.service.js` |
