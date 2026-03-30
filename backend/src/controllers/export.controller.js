const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');

const prisma = new PrismaClient();

exports.exportExcel = async (req, res) => {
  try {
    const { dateDebut, dateFin, statut, facteurId, clientId } = req.query;

    const where = {};
    if (statut) where.statut = statut;
    if (facteurId) where.facteurId = parseInt(facteurId);
    if (clientId) where.clientId = parseInt(clientId);
    if (dateDebut || dateFin) {
      where.dateCollecte = {};
      if (dateDebut) where.dateCollecte.gte = new Date(dateDebut);
      if (dateFin) where.dateCollecte.lte = new Date(dateFin);
    }

    const collectes = await prisma.collecte.findMany({
      where,
      orderBy: { heureCollecte: 'desc' },
      include: {
        client: { select: { nom: true, adresse: true, codePostal: true, ville: true } },
        facteur: { select: { nom: true, prenom: true } },
      },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Collect&Track';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Collectes');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Heure', key: 'heure', width: 10 },
      { header: 'Client', key: 'client', width: 25 },
      { header: 'Adresse', key: 'adresse', width: 30 },
      { header: 'Ville', key: 'ville', width: 15 },
      { header: 'Facteur', key: 'facteur', width: 20 },
      { header: 'Statut', key: 'statut', width: 15 },
      { header: 'Notes', key: 'notes', width: 30 },
    ];

    // Style header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    const statutColors = {
      conforme: 'FF22C55E',
      hors_marge: 'FFF97316',
      incident: 'FFEF4444',
      manquant: 'FF6B7280',
    };

    for (const c of collectes) {
      const row = sheet.addRow({
        id: c.id,
        date: new Date(c.dateCollecte).toLocaleDateString('fr-FR'),
        heure: new Date(c.heureCollecte).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        client: c.client.nom,
        adresse: `${c.client.adresse}, ${c.client.codePostal}`,
        ville: c.client.ville,
        facteur: `${c.facteur.prenom} ${c.facteur.nom}`,
        statut: c.statut,
        notes: c.notes || '',
      });

      const color = statutColors[c.statut] || 'FFFFFFFF';
      row.getCell('statut').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
      if (c.statut !== 'conforme') {
        row.getCell('statut').font = { color: { argb: 'FFFFFFFF' }, bold: true };
      }
    }

    sheet.autoFilter = { from: 'A1', to: 'I1' };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="collectes-${new Date().toISOString().split('T')[0]}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur export' });
  }
};

exports.exportRapport = async (req, res) => {
  // Rapport JSON structuré (le frontend peut l'imprimer)
  try {
    const { dateDebut, dateFin } = req.query;
    const debut = dateDebut ? new Date(dateDebut) : new Date(new Date().setDate(new Date().getDate() - 7));
    const fin = dateFin ? new Date(dateFin) : new Date();

    const [total, conformes, horsMarge, incidents] = await Promise.all([
      prisma.collecte.count({ where: { dateCollecte: { gte: debut, lte: fin } } }),
      prisma.collecte.count({ where: { dateCollecte: { gte: debut, lte: fin }, statut: 'conforme' } }),
      prisma.collecte.count({ where: { dateCollecte: { gte: debut, lte: fin }, statut: 'hors_marge' } }),
      prisma.collecte.count({ where: { dateCollecte: { gte: debut, lte: fin }, statut: 'incident' } }),
    ]);

    // Top clients avec incidents
    const topIncidents = await prisma.collecte.groupBy({
      by: ['clientId'],
      where: { dateCollecte: { gte: debut, lte: fin }, statut: { in: ['incident', 'hors_marge'] } },
      _count: true,
      orderBy: { _count: { clientId: 'desc' } },
      take: 5,
    });

    const clientIds = topIncidents.map((t) => t.clientId);
    const clientsInfo = await prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, nom: true },
    });

    const topAvecNom = topIncidents.map((t) => ({
      ...t,
      client: clientsInfo.find((c) => c.id === t.clientId)?.nom || '',
    }));

    res.json({
      periode: { debut: debut.toISOString(), fin: fin.toISOString() },
      total, conformes, horsMarge, incidents,
      tauxConformite: total > 0 ? Math.round((conformes / total) * 100) : null,
      topIncidents: topAvecNom,
    });
  } catch (e) {
    res.status(500).json({ error: 'Erreur rapport' });
  }
};
