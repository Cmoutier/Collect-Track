const prisma = require('../lib/prisma');
const { envoyerEmail } = require('./alerte.service');

async function envoyerRapportJournalier() {
  try {
    const pause = await prisma.parametre.findUnique({ where: { cle: 'systeme_en_pause' } });
    if (pause?.valeur === 'true') {
      console.log('[Rapport] Système en pause — rapport ignoré');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const [total, conformes, horsMarge, incidents, manquantes, alertesNonTraitees] = await Promise.all([
      prisma.collecte.count({ where: { dateCollecte: yesterday } }),
      prisma.collecte.count({ where: { dateCollecte: yesterday, statut: 'conforme' } }),
      prisma.collecte.count({ where: { dateCollecte: yesterday, statut: 'hors_marge' } }),
      prisma.collecte.count({ where: { dateCollecte: yesterday, statut: 'incident' } }),
      prisma.alerte.count({ where: { type: 'manquant', createdAt: { gte: yesterday, lt: today } } }),
      prisma.alerte.count({ where: { traitee: false } }),
    ]);

    const tauxConformite = total > 0 ? Math.round((conformes / total) * 100) : 0;

    const html = `
      <h2>Rapport journalier Collect&Track — ${yesterday.toLocaleDateString('fr-FR')}</h2>
      <table border="1" cellpadding="8" style="border-collapse:collapse">
        <tr><td><b>Total collectes</b></td><td>${total}</td></tr>
        <tr><td><b>Conformes</b></td><td style="color:green">${conformes}</td></tr>
        <tr><td><b>Hors marge</b></td><td style="color:orange">${horsMarge}</td></tr>
        <tr><td><b>Incidents</b></td><td style="color:red">${incidents}</td></tr>
        <tr><td><b>Collectes manquantes</b></td><td style="color:red">${manquantes}</td></tr>
        <tr><td><b>Taux de conformité</b></td><td>${tauxConformite}%</td></tr>
        <tr><td><b>Alertes non traitées</b></td><td>${alertesNonTraitees}</td></tr>
      </table>
    `;

    await envoyerEmail(`Rapport du ${yesterday.toLocaleDateString('fr-FR')}`, html);
    console.log('[Rapport] Rapport journalier envoyé');
  } catch (e) {
    console.error('[Rapport] Erreur:', e.message);
  }
}

module.exports = { envoyerRapportJournalier };
