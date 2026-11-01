const router = require('express').Router();
const checkBearerToken = require('../middleware/checkBearerToken');
const { uploadPersonalImages } = require('../utils/contributionUpload');

router.post('/images', checkBearerToken, uploadPersonalImages);
router.post('/:resource/:id/image', checkBearerToken, require('../controller/resourceImage').uploadResourceImage);

module.exports = router;
