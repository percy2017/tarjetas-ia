import express from 'express';
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

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === 'password') {
    req.session.loggedIn = true;
    res.redirect('/admin');
  } else {
    res.redirect('/login');
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
