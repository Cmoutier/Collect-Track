const router = require('express').Router();
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');
const ctrl = require('../controllers/collectes.controller');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Statut système (pause) — accessible à tous les rôles
router.get('/statut', auth, ctrl.statutSysteme);

// Scan QR Code (tous les rôles authentifiés)
router.post('/scan', auth, ctrl.scan);

// Preview client par QR Code (sans enregistrement) — doit être avant /:id
router.get('/preview', auth, ctrl.clientPreview);

// Tournée du facteur — doit être avant /:id
router.get('/tournee/today', auth, ctrl.tourneeAujourdhui);

// Liste des collectes (manager/admin)
router.get('/', auth, role('manager', 'admin'), ctrl.liste);

// Marquer incident
router.put('/:id/incident', auth, ctrl.marquerIncident);

// Upload photo sur une collecte
router.post('/:id/photos', auth, upload.array('photos', 5), ctrl.uploadPhotos);

// Supprimer une collecte (manager/admin)
router.delete('/:id', auth, role('manager', 'admin'), ctrl.supprimer);

// Détail d'une collecte
router.get('/:id', auth, role('manager', 'admin'), ctrl.detail);

module.exports = router;
