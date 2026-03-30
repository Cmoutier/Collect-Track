const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Paramètres système
  const parametres = [
    { cle: 'marge_defaut_minutes', valeur: '15', description: 'Marge horaire par défaut en minutes avant/après la plage de collecte' },
    { cle: 'alerte_email_active', valeur: 'true', description: 'Activer les alertes par email' },
    { cle: 'alerte_email_dest', valeur: process.env.ALERTE_EMAIL_DEST || 'manager@example.com', description: 'Email destinataire des alertes' },
    { cle: 'alerte_hors_marge', valeur: 'true', description: 'Envoyer une alerte pour les collectes hors marge' },
    { cle: 'alerte_incident', valeur: 'true', description: 'Envoyer une alerte pour les incidents' },
    { cle: 'alerte_manquant', valeur: 'true', description: 'Envoyer une alerte pour les collectes manquantes' },
    { cle: 'heure_verif_manquant', valeur: '20:00', description: 'Heure de vérification des collectes manquantes (HH:MM)' },
    { cle: 'facteur_defaut_id', valeur: '', description: 'ID du facteur sélectionné par défaut au scan' },
    { cle: 'rapport_auto_actif', valeur: 'false', description: 'Activer les rapports automatiques journaliers' },
    { cle: 'rapport_heure', valeur: '07:00', description: 'Heure d\'envoi du rapport journalier (HH:MM)' },
  ];

  for (const p of parametres) {
    await prisma.parametre.upsert({
      where: { cle: p.cle },
      update: {},
      create: p,
    });
  }
  console.log('Paramètres créés.');

  // Compte admin par défaut
  const hash = await bcrypt.hash('Admin1234!', 12);
  await prisma.user.upsert({
    where: { email: 'admin@collectandtrack.fr' },
    update: {},
    create: {
      nom: 'Admin',
      prenom: 'Système',
      email: 'admin@collectandtrack.fr',
      password: hash,
      role: 'admin',
    },
  });
  console.log('Compte admin créé : admin@collectandtrack.fr / Admin1234!');

  console.log('Seed terminé.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
