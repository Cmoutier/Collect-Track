const router = require('express').Router();
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');
const ctrl = require('../controllers/admin.controller');
const qrCtrl = require('../services/qrcode.service');

// Utilisateurs
router.get('/users', auth, role('admin'), ctrl.listUsers);
router.post('/users', auth, role('admin'), ctrl.createUser);
router.put('/users/:id', auth, role('admin'), ctrl.updateUser);
router.delete('/users/:id', auth, role('admin'), ctrl.deleteUser);

// Clients
router.get('/clients', auth, role('admin', 'manager'), ctrl.listClients);
router.post('/clients', auth, role('admin', 'manager'), ctrl.createClient);
router.put('/clients/:id', auth, role('admin', 'manager'), ctrl.updateClient);
router.delete('/clients/:id', auth, role('admin'), ctrl.deleteClient);
router.get('/clients/:id/qrcode', auth, role('admin', 'manager'), ctrl.getQrCode);

// Paramètres
router.get('/parametres', auth, role('admin'), ctrl.listParametres);
router.put('/parametres/:cle', auth, role('admin'), ctrl.updateParametre);
router.post('/test-email', auth, role('admin'), ctrl.testEmail);
router.post('/trigger/manquants', auth, role('admin'), ctrl.triggerManquants);
router.post('/trigger/rapport', auth, role('admin'), ctrl.triggerRapport);

module.exports = router;
