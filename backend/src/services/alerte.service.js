const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function getParam(cle) {
  const p = await prisma.parametre.findUnique({ where: { cle } });
  return p?.valeur;
}

async function envoyerEmail(sujet, corps) {
  const actif = await getParam('alerte_email_active');
  if (actif !== 'true') return;

  const dest = await getParam('alerte_email_dest');
  if (!dest) return;

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'Collect&Track <noreply@collectandtrack.fr>',
      to: dest,
      subject: `[Collect&Track] ${sujet}`,
      html: corps,
    });
  } catch (e) {
    console.error('[Alerte] Erreur envoi email:', e.message);
  }
}

async function creerAlerte(collecte, type) {
  try {
    const paramActif = await getParam(`alerte_${type}`);
    if (paramActif === 'false') return;

    const clientNom = collecte.client?.nom || `Client #${collecte.clientId}`;
    const facteurNom = collecte.facteur
      ? `${collecte.facteur.prenom} ${collecte.facteur.nom}`
      : `Facteur #${collecte.facteurId}`;
    const heure = new Date(collecte.heureCollecte).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    let message = '';
    if (type === 'hors_marge') {
      message = `Collecte hors plage horaire — ${clientNom} à ${heure} par ${facteurNom}`;
    } else if (type === 'incident') {
      message = `Incident signalé — ${clientNom} à ${heure} par ${facteurNom}`;
    } else if (type === 'manquant') {
      message = `Collecte manquante — ${clientNom} (attendue aujourd'hui)`;
    }

    const alerte = await prisma.alerte.create({
      data: { collecteId: collecte.id || null, type, message },
    });

    await envoyerEmail(
      message,
      `<p>${message}</p><p>Collecte ID : ${collecte.id || 'N/A'}</p><p>Date : ${new Date().toLocaleString('fr-FR')}</p>`
    );

    await prisma.alerte.update({ where: { id: alerte.id }, data: { emailEnvoye: true } });
  } catch (e) {
    console.error('[Alerte] Erreur création alerte:', e.message);
  }
}

async function verifierCollectesManquantes() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const jourISO = today.getDay() === 0 ? 7 : today.getDay();

    // Clients actifs dont aujourd'hui est un jour de collecte
    const clients = await prisma.client.findMany({
      where: {
        actif: true,
        joursCollecte: { has: jourISO },
      },
    });

    for (const client of clients) {
      // Vérifier si une collecte existe aujourd'hui
      const collecte = await prisma.collecte.findFirst({
        where: { clientId: client.id, dateCollecte: today },
      });

      if (!collecte) {
        // Créer une alerte manquant
        const already = await prisma.alerte.findFirst({
          where: {
            type: 'manquant',
            message: { contains: `Client #${client.id}` },
            createdAt: { gte: today },
          },
        });
        if (!already) {
          await creerAlerte(
            { id: null, clientId: client.id, facteurId: null, heureCollecte: new Date(),
              client: { nom: client.nom }, facteur: null },
            'manquant'
          );
        }
      }
    }
  } catch (e) {
    console.error('[Alerte] Erreur vérif manquants:', e.message);
  }
}

module.exports = { creerAlerte, verifierCollectesManquantes };
