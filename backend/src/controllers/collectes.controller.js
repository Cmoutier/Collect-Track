const { PrismaClient } = require('@prisma/client');
const { calculerStatut, estJourCollecte, heureEnMinutesParis } = require('../services/conformite.service');
const alerteService = require('../services/alerte.service');

const prisma = new PrismaClient();

exports.scan = async (req, res) => {
  try {
    const { qrCode, facteurId } = req.body;
    if (!qrCode) return res.status(400).json({ error: 'QR Code manquant' });

    // Vérifier si le système est en pause
    const pauseParam = await prisma.parametre.findUnique({ where: { cle: 'systeme_en_pause' } });
    if (pauseParam?.valeur === 'true') {
      return res.status(503).json({ error: 'Système en pause', systemePause: true });
    }

    // Récupérer le client
    const client = await prisma.client.findUnique({
      where: { qrCode },
      include: { facteurDefaut: true },
    });
    if (!client) return res.status(404).json({ error: 'Client introuvable' });
    if (!client.actif) return res.status(400).json({ error: 'Client inactif' });

    const now = new Date();

    // Vérifier le jour de collecte (section 5.3)
    if (!estJourCollecte(client.joursCollecte, now)) {
      return res.status(400).json({
        error: 'Collecte non prévue aujourd\'hui',
        joursCollecte: client.joursCollecte,
      });
    }

    // Vérifier si déjà scanné aujourd'hui (même client, même jour)
    const dejaScanne = await prisma.collecte.findFirst({
      where: { clientId: client.id, dateCollecte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
    });
    if (dejaScanne && !req.body.force) {
      const heureExistante = new Date(dejaScanne.heureCollecte).toLocaleTimeString('fr-FR', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
      });
      return res.status(409).json({
        alreadyScanned: true,
        clientNom: client.nom,
        heureExistante,
        error: `${client.nom} a déjà été scanné aujourd'hui à ${heureExistante}`,
      });
    }

    // Déterminer le facteur
    const idFacteur = facteurId ? parseInt(facteurId) : (client.facteurDefautId || req.user.id);
    const facteurExiste = await prisma.user.findFirst({
      where: { id: idFacteur, actif: true, role: 'facteur' },
    });
    if (!facteurExiste) return res.status(400).json({ error: 'Facteur invalide' });

    // Récupérer marge depuis les paramètres si non définie sur le client
    const margeMinutes = client.margeMinutes;

    // Calculer le statut
    const statut = calculerStatut(now, client.heureDebut, client.heureFin, margeMinutes);

    // Enregistrer la collecte
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const collecte = await prisma.collecte.create({
      data: {
        clientId: client.id,
        facteurId: idFacteur,
        dateCollecte: today,
        heureCollecte: now,
        statut,
      },
      include: {
        client: { select: { nom: true, adresse: true, ville: true } },
        facteur: { select: { nom: true, prenom: true } },
      },
    });

    // Déclencher alertes si nécessaire
    if (statut === 'hors_marge' || statut === 'incident') {
      await alerteService.creerAlerte(collecte, statut);
    }

    // Marquer dans tournée si existe
    await prisma.tourneeClient.updateMany({
      where: {
        clientId: client.id,
        tournee: { facteurId: idFacteur, date: today },
      },
      data: { scanne: true },
    });

    // Info de debug horaire (aide au diagnostic)
    const hScanMin = heureEnMinutesParis(now);
    const hScanStr = `${String(Math.floor(hScanMin / 60)).padStart(2, '0')}:${String(hScanMin % 60).padStart(2, '0')}`;

    res.json({
      collecte,
      statut,
      message: statut === 'conforme'
        ? 'Collecte enregistrée ✓'
        : statut === 'hors_marge'
        ? 'Collecte hors plage horaire'
        : 'Incident détecté',
      horaire: {
        heureScan:   hScanStr,
        heureDebut:  client.heureDebut,
        heureFin:    client.heureFin,
        marge:       client.margeMinutes,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.marquerIncident = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { notes } = req.body;

    const collecte = await prisma.collecte.findUnique({ where: { id } });
    if (!collecte) return res.status(404).json({ error: 'Collecte introuvable' });

    const updated = await prisma.collecte.update({
      where: { id },
      data: { statut: 'incident', notes: notes || collecte.notes },
    });

    await alerteService.creerAlerte(updated, 'incident');
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.uploadPhotos = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const collecte = await prisma.collecte.findUnique({ where: { id } });
    if (!collecte) return res.status(404).json({ error: 'Collecte introuvable' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Aucune photo reçue' });
    }

    const photos = await prisma.$transaction(
      req.files.map((f) =>
        prisma.photo.create({ data: { collecteId: id, filename: f.filename } })
      )
    );

    res.json({ photos });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.clientPreview = async (req, res) => {
  try {
    const { qrCode } = req.query;
    if (!qrCode) return res.status(400).json({ error: 'QR Code manquant' });
    const client = await prisma.client.findUnique({
      where: { qrCode },
      select: { id: true, nom: true, adresse: true, ville: true, heureDebut: true, heureFin: true, margeMinutes: true, actif: true },
    });
    if (!client) return res.status(404).json({ error: 'Client introuvable' });
    if (!client.actif) return res.status(400).json({ error: 'Client inactif' });
    res.json(client);
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.supprimer = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const collecte = await prisma.collecte.findUnique({ where: { id } });
    if (!collecte) return res.status(404).json({ error: 'Collecte introuvable' });
    await prisma.collecte.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.liste = async (req, res) => {
  try {
    const { page = 1, limit = 20, statut, clientId, facteurId, dateDebut, dateFin } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (statut) where.statut = statut;
    if (clientId) where.clientId = parseInt(clientId);
    if (facteurId) where.facteurId = parseInt(facteurId);
    if (dateDebut || dateFin) {
      where.dateCollecte = {};
      if (dateDebut) where.dateCollecte.gte = new Date(dateDebut);
      if (dateFin) where.dateCollecte.lte = new Date(dateFin);
    }

    const [collectes, total] = await Promise.all([
      prisma.collecte.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { heureCollecte: 'desc' },
        include: {
          client: { select: { nom: true, adresse: true, ville: true } },
          facteur: { select: { nom: true, prenom: true } },
          photos: true,
        },
      }),
      prisma.collecte.count({ where }),
    ]);

    res.json({ collectes, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.detail = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const collecte = await prisma.collecte.findUnique({
      where: { id },
      include: {
        client: true,
        facteur: { select: { nom: true, prenom: true, email: true } },
        photos: true,
        alertes: true,
      },
    });
    if (!collecte) return res.status(404).json({ error: 'Collecte introuvable' });
    res.json(collecte);
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.tourneeAujourdhui = async (req, res) => {
  try {
    const facteurId = req.user.id;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Jour ISO Paris pour filtrer les jours de collecte
    const { jourISOParis } = require('../services/conformite.service');
    const jourISO = jourISOParis(now);

    // Clients du facteur prévus aujourd'hui, triés par ordre
    const clients = await prisma.client.findMany({
      where: {
        facteurDefautId: facteurId,
        actif: true,
        OR: [
          { joursCollecte: { isEmpty: true } },
          { joursCollecte: { has: jourISO } },
        ],
      },
      select: { id: true, nom: true, adresse: true, ville: true, qrCode: true, heureDebut: true, heureFin: true, margeMinutes: true, joursCollecte: true, ordre: true },
      orderBy: { ordre: 'asc' },
    });

    // Pour chaque client, vérifier s'il a été scanné aujourd'hui
    const clientsAvecStatut = await Promise.all(
      clients.map(async (c) => {
        const collecte = await prisma.collecte.findFirst({
          where: { clientId: c.id, dateCollecte: today },
          select: { id: true, statut: true, heureCollecte: true },
          orderBy: { heureCollecte: 'desc' },
        });
        return { ...c, collecteToday: collecte || null };
      })
    );

    res.json({ clients: clientsAvecStatut });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
