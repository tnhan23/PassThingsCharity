const express = require('express');
const router = express.Router();
const {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
  createItemType,
  getItemTypes,
  updateItemType,
  deleteItemType,
} = require('../controller/itemCatalog');
const checkBearerToken = require('../middleware/checkBearerToken');
const checkRole = require('../middleware/checkRole');

// Categories
router.get('/categories', getAllCategories);
router.post(
  '/categories',
  checkBearerToken,
  checkRole(['ADMIN', 'STATION_MANAGER']),
  createCategory
);
router.patch(
  '/categories/:id',
  checkBearerToken,
  checkRole(['ADMIN', 'STATION_MANAGER']),
  updateCategory
);
router.delete(
  '/categories/:id',
  checkBearerToken,
  checkRole(['ADMIN', 'STATION_MANAGER']),
  deleteCategory
);

// Item Types
router.get('/items', getItemTypes);
router.post(
  '/items',
  checkBearerToken,
  checkRole(['ADMIN', 'STATION_MANAGER']),
  createItemType
);
router.patch(
  '/items/:id',
  checkBearerToken,
  checkRole(['ADMIN', 'STATION_MANAGER']),
  updateItemType
);
router.delete(
  '/items/:id',
  checkBearerToken,
  checkRole(['ADMIN', 'STATION_MANAGER']),
  deleteItemType
);

module.exports = router;
