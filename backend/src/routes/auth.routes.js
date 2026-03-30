const router = require('express').Router();
const auth = require('../middlewares/auth');
const ctrl = require('../controllers/auth.controller');

router.post('/login', ctrl.login);
router.get('/me', auth, ctrl.me);
router.put('/password', auth, ctrl.changePassword);

module.exports = router;
