const ItemCategory = require('../models/itemCategory');
const ItemType = require('../models/itemType');
const CampaignItem = require('../models/campaignItem');
const mongoose = require('mongoose');

/**
 * Create a new Item Category (Admin / Station Manager)
 */
async function createCategory(req, res, next) {
  try {
    const { name, description } = req.body || {};

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required.' });
    }

    const existing = await ItemCategory.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({ error: 'Category name already exists.' });
    }

    const category = await ItemCategory.create({
      name: name.trim(),
      description: typeof description === 'string' ? description.trim() : '',
    });

    return res.status(201).json({
      message: 'Item Category created successfully.',
      category,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get all Item Categories
 */
async function getAllCategories(req, res, next) {
  try {
    const { activeOnly } = req.query;
    const filter = {};
    if (activeOnly === 'true') {
      filter.isActive = true;
    }

    const categories = await ItemCategory.find(filter).sort({ name: 1 });
    return res.status(200).json({ categories });
  } catch (error) {
    return next(error);
  }
}

/**
 * Update an Item Category (Admin / Station Manager)
 */
async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid Category ID.' });
    }

    const category = await ItemCategory.findById(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ error: 'Category name must be a non-empty string.' });
    }
    if (name !== undefined) {
      const duplicate = await ItemCategory.findOne({ name: name.trim(), _id: { $ne: id } });
      if (duplicate) {
        return res.status(409).json({ error: 'Category name already exists.' });
      }
      category.name = name.trim();
    }

    if (description !== undefined && typeof description !== 'string') {
      return res.status(400).json({ error: 'Category description must be a string.' });
    }
    if (description !== undefined) {
      category.description = description.trim();
    }

    if (isActive !== undefined && typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean.' });
    }
    if (typeof isActive === 'boolean') {
      category.isActive = isActive;
    }

    await category.save();
    return res.status(200).json({
      message: 'Category updated successfully.',
      category,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Delete / Deactivate an Item Category
 */
async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid Category ID.' });
    }

    // Check if any ItemType belongs to this category
    const itemCount = await ItemType.countDocuments({ categoryId: id });
    if (itemCount > 0) {
      return res.status(409).json({
        error: 'Cannot delete category containing existing item types. Deactivate it instead.',
      });
    }

    const deleted = await ItemCategory.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    return res.status(200).json({ message: 'Category deleted successfully.' });
  } catch (error) {
    return next(error);
  }
}

/**
 * Create a new Item Type (Admin / Station Manager)
 */
async function createItemType(req, res, next) {
  try {
    const { categoryId, name, unit, description } = req.body || {};

    if (!mongoose.isValidObjectId(categoryId)) {
      return res.status(400).json({ error: 'Valid Category ID is required.' });
    }

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Item type name is required.' });
    }

    const validUnits = ['KG', 'PAIR', 'BOX', 'PACK'];
    const formattedUnit = typeof unit === 'string' ? unit.trim().toUpperCase() : '';
    if (!validUnits.includes(formattedUnit)) {
      return res.status(400).json({
        error: `Unit must be one of: ${validUnits.join(', ')}.`,
      });
    }

    const categoryExists = await ItemCategory.findById(categoryId);
    if (!categoryExists) {
      return res.status(404).json({ error: 'Associated Category not found.' });
    }

    const itemType = await ItemType.create({
      categoryId,
      name: name.trim(),
      unit: formattedUnit,
      description: typeof description === 'string' ? description.trim() : '',
    });

    const populated = await ItemType.findById(itemType._id).populate('categoryId', 'name');

    return res.status(201).json({
      message: 'Item Type created successfully.',
      itemType: populated,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get Item Types (Supports filtering by categoryId)
 */
async function getItemTypes(req, res, next) {
  try {
    const { categoryId, activeOnly } = req.query;
    const filter = {};

    if (categoryId !== undefined) {
      if (!mongoose.isValidObjectId(categoryId)) {
        return res.status(400).json({ error: 'Invalid Category ID filter.' });
      }
      filter.categoryId = categoryId;
    }

    if (activeOnly === 'true') {
      filter.isActive = true;
    }

    const itemTypes = await ItemType.find(filter)
      .populate('categoryId', 'name')
      .sort({ name: 1 });

    return res.status(200).json({ itemTypes });
  } catch (error) {
    return next(error);
  }
}

/**
 * Update Item Type
 */
async function updateItemType(req, res, next) {
  try {
    const { id } = req.params;
    const { categoryId, name, unit, description, isActive } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid Item Type ID.' });
    }

    const itemType = await ItemType.findById(id);
    if (!itemType) {
      return res.status(404).json({ error: 'Item Type not found.' });
    }

    if (categoryId !== undefined) {
      if (!mongoose.isValidObjectId(categoryId)) {
        return res.status(400).json({ error: 'Invalid Category ID.' });
      }
      const categoryExists = await ItemCategory.findById(categoryId);
      if (!categoryExists) {
        return res.status(404).json({ error: 'Category not found.' });
      }
      itemType.categoryId = categoryId;
    }

    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ error: 'Item type name must be a non-empty string.' });
    }
    if (name !== undefined) {
      itemType.name = name.trim();
    }

    if (unit !== undefined && (typeof unit !== 'string' || !unit.trim())) {
      return res.status(400).json({ error: 'Unit must be a non-empty string.' });
    }
    if (unit !== undefined) {
      const validUnits = ['KG', 'PAIR', 'BOX', 'PACK'];
      const formattedUnit = unit.trim().toUpperCase();
      if (!validUnits.includes(formattedUnit)) {
        return res.status(400).json({ error: `Unit must be one of: ${validUnits.join(', ')}.` });
      }
      itemType.unit = formattedUnit;
    }

    if (description !== undefined && typeof description !== 'string') {
      return res.status(400).json({ error: 'Item type description must be a string.' });
    }
    if (description !== undefined) {
      itemType.description = description.trim();
    }

    if (isActive !== undefined && typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean.' });
    }
    if (typeof isActive === 'boolean') {
      itemType.isActive = isActive;
    }

    await itemType.save();
    const populated = await ItemType.findById(itemType._id).populate('categoryId', 'name');

    return res.status(200).json({
      message: 'Item Type updated successfully.',
      itemType: populated,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Delete Item Type
 */
async function deleteItemType(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid Item Type ID.' });
    }

    const campaignItemCount = await CampaignItem.countDocuments({ itemTypeId: id });
    if (campaignItemCount > 0) {
      return res.status(409).json({
        error: 'Cannot delete item type referenced by a campaign. Deactivate it instead.',
      });
    }

    const deleted = await ItemType.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Item Type not found.' });
    }

    return res.status(200).json({ message: 'Item Type deleted successfully.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
  createItemType,
  getItemTypes,
  updateItemType,
  deleteItemType,
};
