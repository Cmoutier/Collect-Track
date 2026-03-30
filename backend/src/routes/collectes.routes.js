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

// Scan QR Code (tous les rôles authentifiés)
router.post('/scan', auth, ctrl.scan);

// Marquer incident
router.put('/:id/incident', auth, ctrl.marquerIncident);

// Upload photo sur une collecte
router.post('/:id/photos', auth, upload.array('photos', 5), ctrl.uploadPhotos);

// Liste des collectes (manager/admin)
router.get('/', auth, role('manager', 'admin'), ctrl.liste);

// Détail d'une collecte
router.get('/:id', auth, role('manager', 'admin'), ctrl.detail);

// Tournée du facteur (facteur)
router.get('/tournee/today', auth, ctrl.tourneeAujourdhui);

module.exports = router;
