const express = require('express');
const { attest, issueChallenge } = require('../middleware/requireAppAttest');

const router = express.Router();

router.get('/challenge', issueChallenge);
router.post('/attest', attest);

module.exports = router;
