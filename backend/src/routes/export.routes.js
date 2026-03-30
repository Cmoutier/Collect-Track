const router = require('express').Router();
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');
const ctrl = require('../controllers/export.controller');

router.get('/excel', auth, role('manager', 'admin'), ctrl.exportExcel);
router.get('/rapport-pdf', auth, role('manager', 'admin'), ctrl.exportRapport);

module.exports = router;
