require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

const authRoutes = require('./src/routes/auth.routes');
const collectesRoutes = require('./src/routes/collectes.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const adminRoutes = require('./src/routes/admin.routes');
const exportRoutes = require('./src/routes/export.routes');
const alerteService = require('./src/services/alerte.service');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS strict
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les uploads (photos)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/collectes', collectesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/export', exportRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ─── CRON ────────────────────────────────────────────────────────────────────

const prisma = require('./src/lib/prisma');

// Références aux tâches cron actives (permettent de les stopper/replanifier)
const cronTasks = { manquants: null, rapport: null };

function planifierManquants(heure) {
  if (cronTasks.manquants) { cronTasks.manquants.stop(); }
  const [h, m] = heure.split(':');
  cronTasks.manquants = cron.schedule(`${m} ${h} * * *`, async () => {
    console.log('[CRON] Vérification collectes manquantes...');
    await alerteService.verifierCollectesManquantes();
  }, { timezone: 'Europe/Paris' });
  console.log(`[CRON] Vérification manquants planifiée à ${heure}`);
}

function planifierRapport(heure) {
  if (cronTasks.rapport) { cronTasks.rapport.stop(); }
  const [h, m] = heure.split(':');
  cronTasks.rapport = cron.schedule(`${m} ${h} * * *`, async () => {
    console.log('[CRON] Envoi rapport journalier...');
    const rapportService = require('./src/services/rapport.service');
    await rapportService.envoyerRapportJournalier();
  }, { timezone: 'Europe/Paris' });
  console.log(`[CRON] Rapport journalier planifié à ${heure}`);
}

// Replanifie un cron après changement de paramètre dans l'admin
async function replanifierCron(cle) {
  if (cle === 'heure_verif_manquant') {
    const param = await prisma.parametre.findUnique({ where: { cle } });
    planifierManquants(param?.valeur || '17:30');
  } else if (cle === 'rapport_heure' || cle === 'rapport_auto_actif') {
    const [actif, heure] = await Promise.all([
      prisma.parametre.findUnique({ where: { cle: 'rapport_auto_actif' } }),
      prisma.parametre.findUnique({ where: { cle: 'rapport_heure' } }),
    ]);
    if (cronTasks.rapport) { cronTasks.rapport.stop(); cronTasks.rapport = null; }
    if (actif?.valeur === 'true') planifierRapport(heure?.valeur || '07:00');
  }
}

// Exposé pour le contrôleur admin
module.exports = { replanifierCron };

async function demarrerCrons() {
  const [paramManq, actif, paramRapport] = await Promise.all([
    prisma.parametre.findUnique({ where: { cle: 'heure_verif_manquant' } }),
    prisma.parametre.findUnique({ where: { cle: 'rapport_auto_actif' } }),
    prisma.parametre.findUnique({ where: { cle: 'rapport_heure' } }),
  ]);
  planifierManquants(paramManq?.valeur || '17:30');
  if (actif?.valeur === 'true') planifierRapport(paramRapport?.valeur || '07:00');
}

app.listen(PORT, async () => {
  console.log(`Backend Collect&Track démarré sur le port ${PORT}`);
  await demarrerCrons();
});
