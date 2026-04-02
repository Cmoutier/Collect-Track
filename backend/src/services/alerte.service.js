const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: parseInt(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
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
  if (!dest || !dest.trim()) return;

  // Supporte plusieurs adresses séparées par des virgules ou des points-virgules
  const destinataires = dest
    .split(/[,;]/)
    .map((e) => e.trim())
    .filter(Boolean);
  if (destinataires.length === 0) return;

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'Collect&Track <noreply@collectandtrack.fr>',
      to: destinataires.join(', '),
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
    const pause = await prisma.parametre.findUnique({ where: { cle: 'systeme_en_pause' } });
    if (pause?.valeur === 'true') {
      console.log('[Alerte] Système en pause — vérification manquants ignorée');
      return;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const jourISO = now.getDay() === 0 ? 7 : now.getDay();

    const paramManquant = await getParam('alerte_manquant');
    if (paramManquant === 'false') return;

    // Clients actifs prévus aujourd'hui
    const clients = await prisma.client.findMany({
      where: {
        actif: true,
        OR: [
          { joursCollecte: { isEmpty: true } },
          { joursCollecte: { has: jourISO } },
        ],
      },
      orderBy: { ordre: 'asc' },
    });

    // Identifier ceux sans collecte aujourd'hui
    const manquants = [];
    for (const client of clients) {
      const collecte = await prisma.collecte.findFirst({
        where: { clientId: client.id, dateCollecte: today },
      });
      if (!collecte) manquants.push(client);
    }

    if (manquants.length === 0) return;

    // Créer une alerte en base par client manquant (pour le dashboard)
    for (const client of manquants) {
      const already = await prisma.alerte.findFirst({
        where: { type: 'manquant', message: { contains: client.nom }, createdAt: { gte: today } },
      });
      if (!already) {
        await prisma.alerte.create({
          data: { type: 'manquant', message: `Collecte manquante — ${client.nom} (attendue aujourd'hui)` },
        });
      }
    }

    // Envoyer UN seul email récapitulatif
    const heure = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
    const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
    const lignes = manquants.map((c) =>
      `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${c.nom}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#666">${c.heureDebut} – ${c.heureFin}</td></tr>`
    ).join('');

    await envoyerEmail(
      `${manquants.length} collecte(s) non effectuée(s) à ${heure}`,
      `<div style="font-family:Arial,sans-serif;max-width:600px">
        <h2 style="color:#2B6E44">Collectes non effectuées</h2>
        <p>Le <strong>${dateStr}</strong> à <strong>${heure}</strong>, ${manquants.length} client(s) n'ont pas été scannés :</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <thead><tr style="background:#f5f5f5">
            <th style="padding:8px 12px;text-align:left">Client</th>
            <th style="padding:8px 12px;text-align:left">Plage horaire</th>
          </tr></thead>
          <tbody>${lignes}</tbody>
        </table>
        <p style="color:#999;font-size:12px">Collect&amp;Track — Rapport automatique</p>
      </div>`
    );
  } catch (e) {
    console.error('[Alerte] Erreur vérif manquants:', e.message);
  }
}

module.exports = { creerAlerte, verifierCollectesManquantes, envoyerEmail };
