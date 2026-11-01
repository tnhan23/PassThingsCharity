const router = require('express').Router();
const checkBearerToken = require('../middleware/checkBearerToken');
const checkImageRole = require('../middleware/checkImageRole');
const { uploadNewResourceImage, uploadResourceImage } = require('../controller/resourceImage');

// Concrete routes are listed separately in Swagger; controllers stay shared.
for (const resource of ['users', 'organizations', 'stations', 'campaigns', 'item-categories', 'item-types', 'achievements']) {
  const selectResource = (req, res, next) => {
    req.params.resource = resource;
    next();
  };
  router.post(`/${resource}/image`, checkBearerToken, selectResource, checkImageRole, uploadNewResourceImage);
  router.post(`/${resource}/:id/image`, checkBearerToken, selectResource, checkImageRole, uploadResourceImage);
}

module.exports = router;
