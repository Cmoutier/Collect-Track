const prisma = require('../lib/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.actif) return res.status(401).json({ error: 'Identifiants invalides' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Identifiants invalides' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, nom: user.nom, prenom: user.prenom },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      token,
      user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, nom: true, prenom: true, email: true, role: true, actif: true },
    });
    if (!user || !user.actif) return res.status(401).json({ error: 'Utilisateur inactif' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { ancienPassword, nouveauPassword } = req.body;
    if (!ancienPassword || !nouveauPassword) return res.status(400).json({ error: 'Champs requis' });
    if (nouveauPassword.length < 8) return res.status(400).json({ error: 'Mot de passe trop court (min 8 caractères)' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(ancienPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Ancien mot de passe incorrect' });

    const hash = await bcrypt.hash(nouveauPassword, SALT_ROUNDS);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hash } });
    res.json({ message: 'Mot de passe modifié' });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
