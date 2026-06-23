import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db.js';

const jwtSecret = process.env.JWT_SECRET || 'development-secret-change-me';

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export function signAdmin(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    jwtSecret,
    { expiresIn: '12h' },
  );
}

export async function requireAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) {
      return res.status(401).json({ error: 'Missing admin token' });
    }

    const payload = jwt.verify(token, jwtSecret);
    const { rows } = await query('select id, name, email, role from admin_users where id = $1', [payload.sub]);
    if (!rows[0]) {
      return res.status(401).json({ error: 'Admin user not found' });
    }

    req.admin = rows[0];
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired admin token' });
  }
}
