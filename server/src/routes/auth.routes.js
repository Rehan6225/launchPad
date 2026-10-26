const { Router } = require('express');
const { HttpError, required } = require('../utils/http');
const { checkCredentials, issueToken } = require('../utils/auth');

const router = Router();

router.post('/login', (req, res) => {
  const body = req.body || {};
  required(body, ['username', 'password']);
  if (!checkCredentials(body.username, body.password)) {
    throw new HttpError(401, 'Invalid username or password.');
  }
  res.json({ token: issueToken(body.username), username: body.username });
});

module.exports = router;
