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

// Cron : vérification des collectes manquantes
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function planifierCronManquants() {
  const param = await prisma.parametre.findUnique({ where: { cle: 'heure_verif_manquant' } });
  const heure = param?.valeur || '20:00';
  const [h, m] = heure.split(':');
  const cronExpr = `${m} ${h} * * *`;
  cron.schedule(cronExpr, async () => {
    console.log('[CRON] Vérification collectes manquantes...');
    await alerteService.verifierCollectesManquantes();
  }, { timezone: 'Europe/Paris' });
  console.log(`[CRON] Vérification manquants planifiée à ${heure}`);
}

// Cron : rapport journalier
async function planifierCronRapport() {
  const actif = await prisma.parametre.findUnique({ where: { cle: 'rapport_auto_actif' } });
  if (actif?.valeur !== 'true') return;
  const param = await prisma.parametre.findUnique({ where: { cle: 'rapport_heure' } });
  const heure = param?.valeur || '07:00';
  const [h, m] = heure.split(':');
  cron.schedule(`${m} ${h} * * *`, async () => {
    console.log('[CRON] Envoi rapport journalier...');
    const rapportService = require('./src/services/rapport.service');
    await rapportService.envoyerRapportJournalier();
  }, { timezone: 'Europe/Paris' });
  console.log(`[CRON] Rapport journalier planifié à ${heure}`);
}

app.listen(PORT, async () => {
  console.log(`Backend Collect&Track démarré sur le port ${PORT}`);
  await planifierCronManquants();
  await planifierCronRapport();
});
