const router = require('express').Router();
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');
const ctrl = require('../controllers/dashboard.controller');

router.get('/stats', auth, role('manager', 'admin'), ctrl.stats);
router.get('/historique', auth, role('manager', 'admin'), ctrl.historique);
router.get('/alertes', auth, role('manager', 'admin'), ctrl.alertes);
router.put('/alertes/:id/traiter', auth, role('manager', 'admin'), ctrl.traiterAlerte);

module.exports = router;
