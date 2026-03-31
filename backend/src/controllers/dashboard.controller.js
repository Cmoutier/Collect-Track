const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.stats = async (req, res) => {
  try {
    const { dateDebut, dateFin } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const debut = dateDebut ? new Date(dateDebut) : today;
    const fin = dateFin ? new Date(dateFin) : new Date(today.getTime() + 86400000);

    const [total, conformes, horsMarge, incidents, alertesActives] = await Promise.all([
      prisma.collecte.count({ where: { dateCollecte: { gte: debut, lt: fin } } }),
      prisma.collecte.count({ where: { dateCollecte: { gte: debut, lt: fin }, statut: 'conforme' } }),
      prisma.collecte.count({ where: { dateCollecte: { gte: debut, lt: fin }, statut: 'hors_marge' } }),
      prisma.collecte.count({ where: { dateCollecte: { gte: debut, lt: fin }, statut: 'incident' } }),
      prisma.alerte.count({ where: { traitee: false } }),
    ]);

    const tauxConformite = total > 0 ? Math.round((conformes / total) * 100) : null;

    // Évolution sur 7 jours
    const evolution = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dNext = new Date(d);
      dNext.setDate(dNext.getDate() + 1);
      const [t, c] = await Promise.all([
        prisma.collecte.count({ where: { dateCollecte: { gte: d, lt: dNext } } }),
        prisma.collecte.count({ where: { dateCollecte: { gte: d, lt: dNext }, statut: 'conforme' } }),
      ]);
      evolution.push({ date: d.toISOString().split('T')[0], total: t, conformes: c });
    }

    res.json({ total, conformes, horsMarge, incidents, tauxConformite, alertesActives, evolution });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.historique = async (req, res) => {
  try {
    const { page = 1, limit = 50, statut, clientId, facteurId, dateDebut, dateFin, search } = req.query;
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
    if (search) {
      where.OR = [
        { client: { nom: { contains: search, mode: 'insensitive' } } },
        { facteur: { nom: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [collectes, total] = await Promise.all([
      prisma.collecte.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { heureCollecte: 'desc' },
        include: {
          client: { select: { nom: true, adresse: true, ville: true } },
          facteur: { select: { nom: true, prenom: true } },
          photos: { select: { id: true, filename: true } },
        },
      }),
      prisma.collecte.count({ where }),
    ]);

    res.json({ collectes, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.alertes = async (req, res) => {
  try {
    const { traitee, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (traitee !== undefined) where.traitee = traitee === 'true';

    const [alertes, total] = await Promise.all([
      prisma.alerte.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          collecte: {
            include: {
              client: { select: { nom: true } },
              facteur: { select: { nom: true, prenom: true } },
            },
          },
        },
      }),
      prisma.alerte.count({ where }),
    ]);

    res.json({ alertes, total });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.traiterAlerte = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { resolution } = req.body;

    const alerte = await prisma.alerte.update({
      where: { id },
      data: { traitee: true },
    });

    // Sauvegarder la résolution dans les notes de la collecte liée
    if (resolution && resolution.trim() && alerte.collecteId) {
      const collecte = await prisma.collecte.findUnique({ where: { id: alerte.collecteId } });
      if (collecte) {
        const newNotes = collecte.notes
          ? `${collecte.notes}\n\nRésolution : ${resolution.trim()}`
          : `Résolution : ${resolution.trim()}`;
        await prisma.collecte.update({
          where: { id: alerte.collecteId },
          data: { notes: newNotes },
        });
      }
    }

    res.json(alerte);
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
