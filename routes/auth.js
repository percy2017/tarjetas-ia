import express from 'express';
import bcrypt from 'bcryptjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const db = require('../db.cjs'); // Importar db.cjs

const router = express.Router();

const redirectIfLoggedIn = (req, res, next) => {
  if (req.session && req.session.loggedIn) {
    res.redirect('/admin');
  } else {
    next();
  }
};

router.get('/login', redirectIfLoggedIn, (req, res) => {
  res.render('login');
});

router.post('/login', async (req, res) => { // Convertida a async
  const { username, password } = req.body;

  if (!username || !password) {
    // Podrías añadir un mensaje de error aquí, ej. con connect-flash
    return res.redirect('/login');
  }

  try {
    const user = await db('users').where({ username: username }).first();

    if (user) {
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (isValidPassword) {
        req.session.loggedIn = true;
        req.session.user = {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatar_url: user.avatar_url,
          first_name: user.first_name,
          last_name: user.last_name
        };
        // Redirigir al admin solo si el rol es admin
        if (user.role === 'admin') {
          return res.redirect('/admin');
        } else {
          // Aquí podrías redirigir a un dashboard de cliente o a la landing si no es admin
          // Por ahora, si no es admin, también podría ser un error de login para esta ruta
          // o simplemente redirigir a login con un mensaje.
          // Para simplificar, si no es admin, no permitimos acceso al /admin
          // Idealmente, tendrías rutas separadas o una lógica más robusta.
          console.log(`User ${username} logged in but is not an admin. Role: ${user.role}`);
          // Por ahora, si no es admin, lo deslogueamos y redirigimos a login.
          // O podrías tener una página de "no autorizado" o redirigir a otro lado.
          req.session.destroy(); // Destruir sesión si no es admin intentando acceder a /admin
          return res.redirect('/login?error=not_admin'); // Añadir un query param para mostrar error
        }
      }
    }

    // Si el usuario no existe o la contraseña no es válida
    // Podrías añadir un mensaje de error aquí
    console.log(`Login failed for user: ${username}`);
    return res.redirect('/login?error=invalid_credentials'); // Añadir query param
  } catch (error) {
    console.error('Error during login:', error);
    // Podrías añadir un mensaje de error genérico
    return res.redirect('/login?error=server_error'); // Añadir query param
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    }
    res.redirect('/login');
  });
});

export default router;
