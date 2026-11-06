const router = require('express').Router();
const checkBearerToken = require('../middleware/checkBearerToken');
const { uploadPersonalImages } = require('../utils/contributionUpload');

router.post('/images', checkBearerToken, uploadPersonalImages);

module.exports = router;
