# Collect&Track

Application de traçabilité des collectes de courrier. Les facteurs scannent un QR Code chez chaque client pour enregistrer leur passage. Le système vérifie la conformité horaire et alerte en cas d'anomalie.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | Node.js + Express.js |
| Frontend | React 18 + Vite |
| Base de données | PostgreSQL via Prisma ORM |
| Auth | JWT + bcrypt |
| État frontend | Zustand |
| HTTP | Axios |
| Scan QR | html5-qrcode |
| Génération QR | qrcode (npm) |
| Export Excel | exceljs |
| Upload photos | multer |
| Cron jobs | node-cron |
| Emails | nodemailer |

---

## Installation locale

### Prérequis
- Node.js 18+
- PostgreSQL 14+ (ou compte Supabase)

### 1. Cloner et configurer

```bash
git clone <repo>
cd collect-and-track
```

### 2. Backend

```bash
cd backend
npm install

# Copier et renseigner les variables d'environnement
cp .env.example .env
# Éditer .env : DATABASE_URL, JWT_SECRET, SMTP_*

# Générer le client Prisma + migrer + seeder
npm run setup
# ou étape par étape :
# npx prisma generate
# npx prisma migrate deploy
# node prisma/seed.js

# Démarrer en développement
npm run dev
```

Le backend tourne sur `http://localhost:3001`.

**Compte admin par défaut :**
- Email : `admin@collectandtrack.fr`
- Mot de passe : `Admin1234!`

### 3. Frontend

```bash
cd frontend
npm install

# (optionnel) Créer .env si backend sur un port différent
# VITE_API_URL=http://localhost:3001/api

npm run dev
```

Le frontend tourne sur `http://localhost:5173`.

---

## Rôles utilisateurs

| Rôle | Accès |
|------|-------|
| `facteur` | Scan QR, tournée du jour, signaler incident |
| `manager` | Dashboard, historique, export Excel, alertes |
| `admin` | Tout + gestion utilisateurs/clients/paramètres |

---

## Règles métier

### Conformité horaire

Pour chaque client, une plage de collecte est définie (`heureDebut` → `heureFin`) avec une marge en minutes.

| Heure du scan | Statut |
|---------------|--------|
| Dans `[heureDebut, heureFin]` | ✅ `conforme` |
| Dans `[heureDebut - marge, heureFin + marge]` | ⚠️ `hors_marge` |
| Hors de la plage étendue | 🚨 `incident` |

### Jours de collecte

Les jours sont stockés en format ISO : 1=Lundi, 2=Mardi, ..., 7=Dimanche.
Le scan est refusé si aujourd'hui n'est pas dans `joursCollecte`.

### Sélection du facteur au scan

1. Liste déroulante affichant tous les facteurs actifs
2. Pré-sélection du facteur par défaut (paramètre `facteur_defaut_id`) si défini
3. Si l'utilisateur connecté est un facteur, il est pré-sélectionné à défaut
4. Aucun blocage si pas de facteur par défaut

---

## Déploiement (Render + Supabase)

### Base de données — Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Récupérer l'URL de connexion PostgreSQL (Settings > Database > Connection string > URI)
3. L'utiliser comme `DATABASE_URL` dans les variables d'environnement Render

### Backend — Render Web Service

1. Créer un **Web Service** sur [render.com](https://render.com)
2. Connecter le repo GitHub
3. Paramètres :
   - **Root directory** : `backend`
   - **Build command** : `npm install && npx prisma generate && npx prisma migrate deploy && node prisma/seed.js`
   - **Start command** : `node server.js`
4. Variables d'environnement à définir sur Render :

```
DATABASE_URL=postgresql://...supabase...
JWT_SECRET=<secret-32-chars-minimum>
JWT_EXPIRES_IN=24h
BCRYPT_SALT_ROUNDS=12
FRONTEND_URL=https://collect-and-track.onrender.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
ALERTE_EMAIL_DEST=manager@example.com
```

### Frontend — Render Static Site

1. Créer un **Static Site** sur Render
2. Connecter le repo GitHub
3. Paramètres :
   - **Root directory** : `frontend`
   - **Build command** : `npm install && npm run build`
   - **Publish directory** : `dist`
4. Variables d'environnement :

```
VITE_API_URL=https://collect-and-track-backend.onrender.com/api
```

---

## API — Endpoints principaux

### Auth
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/login` | Connexion |
| GET | `/api/auth/me` | Profil courant |
| PUT | `/api/auth/password` | Changer mot de passe |

### Collectes
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/collectes/scan` | Enregistrer un scan |
| PUT | `/api/collectes/:id/incident` | Marquer incident |
| POST | `/api/collectes/:id/photos` | Upload photos |
| GET | `/api/collectes/tournee/today` | Tournée du jour |

### Dashboard (manager/admin)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/dashboard/stats` | Statistiques |
| GET | `/api/dashboard/historique` | Liste filtrée |
| GET | `/api/dashboard/alertes` | Alertes |
| PUT | `/api/dashboard/alertes/:id/traiter` | Traiter alerte |

### Admin
| Méthode | Route | Description |
|---------|-------|-------------|
| GET/POST | `/api/admin/users` | Liste/créer utilisateurs |
| PUT/DELETE | `/api/admin/users/:id` | Modifier/désactiver |
| GET/POST | `/api/admin/clients` | Liste/créer clients |
| PUT/DELETE | `/api/admin/clients/:id` | Modifier/désactiver |
| GET | `/api/admin/clients/:id/qrcode` | Télécharger QR Code PNG |
| GET/PUT | `/api/admin/parametres` | Paramètres système |

### Export
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/export/excel` | Export Excel (.xlsx) |

---

## Structure du projet

```
collect-and-track/
├── backend/
│   ├── server.js
│   ├── .env(.example)
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── uploads/          (photos uploadées)
│   └── src/
│       ├── middlewares/  (auth.js, role.js)
│       ├── routes/       (auth, collectes, dashboard, admin, export)
│       ├── controllers/  (idem)
│       └── services/     (conformite, alerte, rapport, qrcode)
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── api/          (axios.js)
        ├── store/        (useAuthStore.js)
        ├── components/   (Layout, PrivateRoute)
        └── pages/
            ├── Login.jsx
            ├── facteur/  (Scan, Tournee, Incident)
            ├── manager/  (Dashboard, Historique)
            └── admin/    (Admin + tabs: Users, Clients, Parametres)
```
