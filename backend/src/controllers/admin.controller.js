const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { genererCodeQR, genererBufferQR } = require('../services/qrcode.service');

const prisma = new PrismaClient();
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

// ─── USERS ───────────────────────────────────────────────

exports.listUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, nom: true, prenom: true, email: true, role: true, actif: true, createdAt: true },
      orderBy: { nom: 'asc' },
    });
    res.json(users);
  } catch (e) { res.status(500).json({ error: 'Erreur serveur' }); }
};

exports.createUser = async (req, res) => {
  try {
    const { nom, prenom, email, password, role } = req.body;
    if (!nom || !prenom || !email || !password || !role) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(400).json({ error: 'Email déjà utilisé' });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { nom, prenom, email, password: hash, role },
      select: { id: true, nom: true, prenom: true, email: true, role: true, actif: true },
    });
    res.status(201).json(user);
  } catch (e) { res.status(500).json({ error: 'Erreur serveur' }); }
};

exports.updateUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nom, prenom, email, role, actif, password } = req.body;
    const data = {};
    if (nom !== undefined) data.nom = nom;
    if (prenom !== undefined) data.prenom = prenom;
    if (email !== undefined) data.email = email;
    if (role !== undefined) data.role = role;
    if (actif !== undefined) data.actif = actif;
    if (password) data.password = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.update({
      where: { id }, data,
      select: { id: true, nom: true, prenom: true, email: true, role: true, actif: true },
    });
    res.json(user);
  } catch (e) { res.status(500).json({ error: 'Erreur serveur' }); }
};

exports.deleteUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: 'Impossible de supprimer son propre compte' });
    await prisma.user.update({ where: { id }, data: { actif: false } });
    res.json({ message: 'Utilisateur désactivé' });
  } catch (e) { res.status(500).json({ error: 'Erreur serveur' }); }
};

// ─── CLIENTS ─────────────────────────────────────────────

exports.listClients = async (req, res) => {
  try {
    const { actif } = req.query;
    const where = actif !== undefined ? { actif: actif === 'true' } : {};
    const clients = await prisma.client.findMany({
      where,
      include: { facteurDefaut: { select: { id: true, nom: true, prenom: true } } },
      orderBy: [{ ordre: 'asc' }, { nom: 'asc' }],
    });
    res.json(clients);
  } catch (e) { res.status(500).json({ error: 'Erreur serveur' }); }
};

exports.createClient = async (req, res) => {
  try {
    const { nom, adresse, codePostal, ville, joursCollecte, heureDebut, heureFin, margeMinutes, facteurDefautId, notes, ordre } = req.body;
    if (!nom || !adresse || !codePostal || !ville || !heureDebut || !heureFin) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }
    const qrCode = genererCodeQR();
    // Ordre par défaut : à la fin de la liste existante
    const countClients = await prisma.client.count();
    const client = await prisma.client.create({
      data: {
        nom, adresse, codePostal, ville, qrCode,
        joursCollecte: joursCollecte || [1, 2, 3, 4, 5],
        heureDebut, heureFin,
        margeMinutes: margeMinutes || 15,
        facteurDefautId: facteurDefautId ? parseInt(facteurDefautId) : null,
        notes,
        ordre: ordre !== undefined ? parseInt(ordre) : countClients,
      },
    });
    res.status(201).json(client);
  } catch (e) { res.status(500).json({ error: 'Erreur serveur' }); }
};

exports.updateClient = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nom, adresse, codePostal, ville, joursCollecte, heureDebut, heureFin, margeMinutes, facteurDefautId, actif, notes, ordre } = req.body;
    const data = {};
    if (nom !== undefined) data.nom = nom;
    if (adresse !== undefined) data.adresse = adresse;
    if (codePostal !== undefined) data.codePostal = codePostal;
    if (ville !== undefined) data.ville = ville;
    if (joursCollecte !== undefined) data.joursCollecte = joursCollecte;
    if (heureDebut !== undefined) data.heureDebut = heureDebut;
    if (heureFin !== undefined) data.heureFin = heureFin;
    if (margeMinutes !== undefined) data.margeMinutes = parseInt(margeMinutes);
    if (facteurDefautId !== undefined) data.facteurDefautId = facteurDefautId ? parseInt(facteurDefautId) : null;
    if (actif !== undefined) data.actif = actif;
    if (notes !== undefined) data.notes = notes;
    if (ordre !== undefined) data.ordre = parseInt(ordre);

    const client = await prisma.client.update({ where: { id }, data });
    res.json(client);
  } catch (e) { res.status(500).json({ error: 'Erreur serveur' }); }
};

exports.deleteClient = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.client.update({ where: { id }, data: { actif: false } });
    res.json({ message: 'Client désactivé' });
  } catch (e) { res.status(500).json({ error: 'Erreur serveur' }); }
};

exports.getQrCode = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) return res.status(404).json({ error: 'Client introuvable' });

    const buffer = await genererBufferQR(client.qrCode);
    res.set('Content-Type', 'image/png');
    res.set('Content-Disposition', `attachment; filename="qr-${client.nom.replace(/\s/g, '_')}.png"`);
    res.send(buffer);
  } catch (e) { res.status(500).json({ error: 'Erreur serveur' }); }
};

// ─── TEST EMAIL ──────────────────────────────────────────

exports.testEmail = async (req, res) => {
  try {
    const { envoyerEmail } = require('../services/alerte.service');
    const now = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
    await envoyerEmail(
      'Email de test Collect&Track',
      `<div style="font-family:Arial,sans-serif;max-width:600px">
        <h2 style="color:#2B6E44">Test de configuration email</h2>
        <p>Cet email confirme que la configuration SMTP de <strong>Collect&amp;Track</strong> fonctionne correctement.</p>
        <p style="color:#666;font-size:13px">Envoyé le ${now}</p>
      </div>`
    );
    res.json({ message: 'Email de test envoyé' });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Erreur envoi email' });
  }
};

// ─── PARAMÈTRES ──────────────────────────────────────────

exports.listParametres = async (req, res) => {
  try {
    const params = await prisma.parametre.findMany({ orderBy: { cle: 'asc' } });
    res.json(params);
  } catch (e) { res.status(500).json({ error: 'Erreur serveur' }); }
};

exports.updateParametre = async (req, res) => {
  try {
    const { cle } = req.params;
    const { valeur } = req.body;
    if (valeur === undefined) return res.status(400).json({ error: 'Valeur requise' });
    const param = await prisma.parametre.update({ where: { cle }, data: { valeur: String(valeur) } });
    res.json(param);
  } catch (e) { res.status(500).json({ error: 'Erreur serveur' }); }
};
