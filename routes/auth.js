import express from 'express';
import bcrypt from 'bcryptjs';
import generator from 'generate-password';
import { createRequire } from 'module';
import { sendWelcomeEmail } from '../services/notificationService.js';

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

// Ruta para mostrar el formulario de registro
router.get('/register', (req, res) => {
  res.render('register'); // Asumiendo que tienes una vista register.ejs
});

// Ruta para procesar el formulario de registro
router.post('/register', async (req, res) => {
  console.log('Datos recibidos en /register:', req.body)
  const { first_name, last_name, email, phone } = req.body;

  // Validaciones básicas
  if (!first_name || !last_name || !email || !phone) {
    return res.status(400).render('register', { error: 'Todos los campos (Nombres, Apellidos, Correo, Teléfono) son obligatorios.' });
  }

  try {
    // Verificar si el email ya existe
    let existingUser = await db('users').where({ email: email }).first();
    if (existingUser) {
      return res.status(400).render('register', { error: 'El correo electrónico ya está en uso.' });
    }

    // Generar username a partir del email y asegurar unicidad
    let generatedUsername = email.split('@')[0];
    let usernameIsUnique = false;
    let counter = 0;
    while (!usernameIsUnique) {
      const tempUsername = counter === 0 ? generatedUsername : `${generatedUsername}${counter}`;
      existingUser = await db('users').where({ username: tempUsername }).first();
      if (!existingUser) {
        generatedUsername = tempUsername;
        usernameIsUnique = true;
      } else {
        counter++;
      }
    }
    
    // Generar contraseña
    const generatedPassword = generator.generate({
      length: 12,
      numbers: true,
      symbols: false, // Puedes ajustar esto si quieres símbolos
      uppercase: true,
      lowercase: true,
      strict: true,
    });

    // Hashear la contraseña generada
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Generar profile_slug a partir del username único
    // Asegurarse de que sea apto para URL y único (aunque username ya debería serlo)
    // Podríamos añadir una lógica más robusta para asegurar unicidad del slug si es necesario,
    // pero por ahora, basarlo en el username único es un buen comienzo.
    const profile_slug = generatedUsername.toLowerCase()
                                      .replace(/\s+/g, '-') // reemplazar espacios con guiones
                                      .replace(/[^\w-]+/g, ''); // remover caracteres no alfanuméricos excepto guiones

    // Crear el nuevo usuario
    const newUser = {
      username: generatedUsername,
      email,
      password_hash: hashedPassword,
      first_name,
      last_name,
      phone: phone || null, // Guardar null si el teléfono está vacío
      role: 'client', // Rol por defecto para nuevos registros
      tokens_used: 0,
      profile_slug: profile_slug 
    };

    const [insertedId] = await db('users').insert(newUser).returning('id'); // Obtener el ID insertado
    
    // Es importante tener el newUser completo con el ID y el profile_slug para el correo si es necesario
    // y para consistencia, aunque sendWelcomeEmail no usa profile_slug actualmente.
    // Si newUser no se actualiza automáticamente con el ID por el ORM/driver, se podría hacer un select.
    // Pero para el slug, ya lo tenemos.

    // Enviar correo de bienvenida
    try {
      await sendWelcomeEmail({ 
        email: newUser.email, 
        first_name: newUser.first_name, 
        username: newUser.username 
      }, generatedPassword);
    } catch (emailError) {
      // El error ya se loguea dentro de sendWelcomeEmail
      // Continuar con el flujo de registro incluso si el correo falla
      console.error("Fallo el envío del correo de bienvenida, pero el usuario fue creado:", emailError.message);
    }

    // Redirigir al login con un mensaje de éxito (idealmente con connect-flash)
    // Por ahora, redirigimos con un query param
    res.redirect('/login?registration=success');

  } catch (error) {
    console.error('Error durante el registro:', error);
    res.status(500).render('register', { error: 'Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.' });
  }
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
          last_name: user.last_name,
          phone: user.phone,
          tokens_used: user.tokens_used,
          profile_slug: user.profile_slug,
          created_at: user.created_at 
        };
        // Redirigir según el rol del usuario
        if (user.role === 'admin' || user.role === 'client') {
          // Tanto admin como client son redirigidos a /admin
          return res.redirect('/admin');
        } else {
          // Para cualquier otro rol no manejado
          console.log(`User ${username} logged in with unhandled/unauthorized role: ${user.role}`);
          req.session.destroy(); // Destruir sesión
          return res.redirect('/login?error=unauthorized_role'); // Informar error de rol no autorizado
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
