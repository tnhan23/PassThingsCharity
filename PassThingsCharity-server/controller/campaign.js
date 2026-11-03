const Campaign = require('../models/campaign');
const CampaignItem = require('../models/campaignItem');
const CampaignStation = require('../models/campaignStation');
const ItemType = require('../models/itemType');
const Station = require('../models/station');
const Organization = require('../models/organization');
const mongoose = require('mongoose');

const MIN_CAMPAIGN_DURATION_MS = 5 * 24 * 60 * 60 * 1000;
const MAX_CAMPAIGN_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Calculate Haversine distance in kilometers between two GPS coordinates
 */
function getHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Create a new Campaign (Admin / Station Manager)
 */
async function createCampaign(req, res, next) {
  try {
    const { title, description, startDate, endDate, organizationId } = req.body || {};

    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Campaign title is required.' });
    }

    if (typeof startDate !== 'string' || !startDate.trim()
      || typeof endDate !== 'string' || !endDate.trim()) {
      return res.status(400).json({ error: 'Start date and End date are required.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format for start or end date.' });
    }

    if (start >= end) {
      return res.status(400).json({ error: 'End date must be strictly after start date.' });
    }
    if (end - start < MIN_CAMPAIGN_DURATION_MS || end - start > MAX_CAMPAIGN_DURATION_MS) {
      return res.status(400).json({
        error: 'Campaign duration must be between 5 and 7 days (120 to 168 hours).',
      });
    }

    if (!mongoose.isValidObjectId(organizationId)) {
      return res.status(400).json({ error: 'Valid Organization ID is required.' });
    }

    const orgExists = await Organization.findById(organizationId);
    if (!orgExists) {
      return res.status(404).json({ error: 'Organization not found.' });
    }

    const campaign = await Campaign.create({
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      startDate: start,
      endDate: end,
      organizationId,
      createdBy: req.user._id,
      status: 'DRAFT',
    });

    return res.status(201).json({
      message: 'Campaign created in DRAFT status.',
      campaign,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get List of Campaigns (Public / Filterable)
 */
async function getAllCampaigns(req, res, next) {
  try {
    const { status, organizationId, search } = req.query;
    const filter = { status: { $ne: 'DRAFT' } };

    if (status) {
      if (typeof status !== 'string') {
        return res.status(400).json({ error: 'Invalid Campaign status filter.' });
      }
      const formattedStatus = status.trim().toUpperCase();
      const publicStatuses = ['PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
      if (!publicStatuses.includes(formattedStatus)) {
        return res.status(400).json({
          error: `Status must be one of: ${publicStatuses.join(', ')}.`,
        });
      }
      filter.status = formattedStatus;
    }

    if (organizationId) {
      if (!mongoose.isValidObjectId(organizationId)) {
        return res.status(400).json({ error: 'Invalid Organization ID filter.' });
      }
      filter.organizationId = organizationId;
    }

    if (search !== undefined) {
      if (typeof search !== 'string' || search.length > 100) {
        return res.status(400).json({ error: 'Search must be a string of at most 100 characters.' });
      }
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (escapedSearch) {
        filter.title = { $regex: escapedSearch, $options: 'i' };
      }
    }

    const campaigns = await Campaign.find(filter)
      .populate('organizationId', 'name code address')
      .populate('createdBy', 'fullName username')
      .sort({ createdAt: -1 });

    return res.status(200).json({ campaigns });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get Single Campaign Details (with items and participating stations)
 */
async function getCampaignById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid Campaign ID.' });
    }

    const campaign = await Campaign.findById(id)
      .populate('organizationId', 'name code address phone email')
      .populate('createdBy', 'fullName username');

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }
    if (campaign.status === 'DRAFT') {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    // Fetch associated targeted items
    const items = await CampaignItem.find({ campaignId: id }).populate({
      path: 'itemTypeId',
      select: 'name unit categoryId',
      populate: { path: 'categoryId', select: 'name' },
    });

    // Fetch associated stations
    const stations = await CampaignStation.find({ campaignId: id }).populate({
      path: 'stationId',
      select: 'name address latitude longitude openingTime closingTime isActive',
    });

    return res.status(200).json({
      campaign,
      items,
      stations: stations.map((s) => s.stationId),
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Update Campaign Details
 */
async function updateCampaign(req, res, next) {
  try {
    const { id } = req.params;
    const { title, description, startDate, endDate } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid Campaign ID.' });
    }

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
      return res.status(400).json({ error: 'Campaign title must be a non-empty string.' });
    }
    if (title !== undefined) {
      campaign.title = title.trim();
    }

    if (description !== undefined && typeof description !== 'string') {
      return res.status(400).json({ error: 'Campaign description must be a string.' });
    }
    if (description !== undefined) {
      campaign.description = description.trim();
    }

    if (startDate !== undefined) {
      if (typeof startDate !== 'string' || !startDate.trim()) {
        return res.status(400).json({ error: 'Invalid start date.' });
      }
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return res.status(400).json({ error: 'Invalid start date.' });
      }
      campaign.startDate = start;
    }

    if (endDate !== undefined) {
      if (typeof endDate !== 'string' || !endDate.trim()) {
        return res.status(400).json({ error: 'Invalid end date.' });
      }
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return res.status(400).json({ error: 'Invalid end date.' });
      }
      campaign.endDate = end;
    }

    if (campaign.startDate >= campaign.endDate) {
      return res.status(400).json({ error: 'End date must be after start date.' });
    }
    const duration = campaign.endDate - campaign.startDate;
    if (duration < MIN_CAMPAIGN_DURATION_MS || duration > MAX_CAMPAIGN_DURATION_MS) {
      return res.status(400).json({
        error: 'Campaign duration must be between 5 and 7 days (120 to 168 hours).',
      });
    }

    await campaign.save();
    return res.status(200).json({
      message: 'Campaign updated successfully.',
      campaign,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Update Campaign Status (State Transitions: DRAFT -> PUBLISHED -> ACTIVE -> COMPLETED / CANCELLED)
 */
async function updateCampaignStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid Campaign ID.' });
    }

    const validStatuses = ['DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
    const formattedStatus = typeof status === 'string' ? status.trim().toUpperCase() : '';

    if (!validStatuses.includes(formattedStatus)) {
      return res.status(400).json({
        error: `Status must be one of: ${validStatuses.join(', ')}.`,
      });
    }

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const allowedTransitions = {
      DRAFT: ['PUBLISHED', 'CANCELLED'],
      PUBLISHED: ['ACTIVE', 'CANCELLED'],
      ACTIVE: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
    };
    if (campaign.status !== formattedStatus
      && !allowedTransitions[campaign.status].includes(formattedStatus)) {
      return res.status(409).json({
        error: `Campaign cannot transition from ${campaign.status} to ${formattedStatus}.`,
      });
    }

    campaign.status = formattedStatus;
    await campaign.save();

    return res.status(200).json({
      message: `Campaign status updated to ${formattedStatus}.`,
      campaign,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Add / Configure Item Requirement for a Campaign
 */
async function addCampaignItem(req, res, next) {
  try {
    const { id } = req.params; // campaignId
    const { itemTypeId, targetQuantity, priority } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid Campaign ID.' });
    }

    if (!mongoose.isValidObjectId(itemTypeId)) {
      return res.status(400).json({ error: 'Valid Item Type ID is required.' });
    }

    const numTarget = Number(targetQuantity);
    if (!Number.isFinite(numTarget) || numTarget < 1) {
      return res.status(400).json({ error: 'Target quantity must be a positive number.' });
    }

    const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];
    const formattedPriority = priority === undefined
      ? 'MEDIUM'
      : typeof priority === 'string' && validPriorities.includes(priority.trim().toUpperCase())
        ? priority.trim().toUpperCase()
        : '';
    if (!formattedPriority) {
      return res.status(400).json({
        error: `Priority must be one of: ${validPriorities.join(', ')}.`,
      });
    }

    const campaignExists = await Campaign.findById(id);
    if (!campaignExists) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const itemTypeExists = await ItemType.findById(itemTypeId);
    if (!itemTypeExists) {
      return res.status(404).json({ error: 'Item Type not found.' });
    }
    if (!itemTypeExists.isActive) {
      return res.status(409).json({ error: 'Inactive Item Types cannot be added to a Campaign.' });
    }

    const campaignItem = await CampaignItem.findOneAndUpdate(
      { campaignId: id, itemTypeId },
      {
        targetQuantity: numTarget,
        priority: formattedPriority,
      },
      { upsert: true, returnDocument: 'after' }
    );

    const populated = await CampaignItem.findById(campaignItem._id).populate({
      path: 'itemTypeId',
      select: 'name unit',
    });

    return res.status(200).json({
      message: 'Campaign item requirement set successfully.',
      campaignItem: populated,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Remove an Item Requirement from a Campaign
 */
async function removeCampaignItem(req, res, next) {
  try {
    const { id, itemId } = req.params;

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(itemId)) {
      return res.status(400).json({ error: 'Invalid Campaign ID or Item Requirement ID.' });
    }

    const deleted = await CampaignItem.findOneAndDelete({ _id: itemId, campaignId: id });
    if (!deleted) {
      return res.status(404).json({ error: 'Campaign item requirement not found.' });
    }

    return res.status(200).json({ message: 'Campaign item requirement removed.' });
  } catch (error) {
    return next(error);
  }
}

/**
 * Assign a Station to participate in a Campaign
 */
async function assignStationToCampaign(req, res, next) {
  try {
    const { id } = req.params; // campaignId
    const { stationId } = req.body || {};

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(stationId)) {
      return res.status(400).json({ error: 'Valid Campaign ID and Station ID are required.' });
    }

    const campaignExists = await Campaign.findById(id);
    if (!campaignExists) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const stationExists = await Station.findById(stationId);
    if (!stationExists) {
      return res.status(404).json({ error: 'Station not found.' });
    }
    if (!stationExists.isActive) {
      return res.status(409).json({ error: 'Inactive Stations cannot be assigned to a Campaign.' });
    }

    const campaignStation = await CampaignStation.findOneAndUpdate(
      { campaignId: id, stationId },
      { assignedAt: new Date() },
      { upsert: true, returnDocument: 'after' }
    );

    return res.status(200).json({
      message: 'Station assigned to campaign successfully.',
      campaignStation,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Remove Station from Campaign
 */
async function removeStationFromCampaign(req, res, next) {
  try {
    const { id, stationId } = req.params;

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(stationId)) {
      return res.status(400).json({ error: 'Invalid Campaign ID or Station ID.' });
    }

    const deleted = await CampaignStation.findOneAndDelete({ campaignId: id, stationId });
    if (!deleted) {
      return res.status(404).json({ error: 'Assigned station not found for this campaign.' });
    }

    return res.status(200).json({ message: 'Station removed from campaign.' });
  } catch (error) {
    return next(error);
  }
}

/**
 * Public API: Find active participating stations for a Campaign (with optional userLat & userLng distance calculation)
 */
async function findStationsForCampaign(req, res, next) {
  try {
    const { id } = req.params;
    const { userLat, userLng } = req.query;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid Campaign ID.' });
    }

    const campaign = await Campaign.findById(id).select('status');
    if (!campaign || campaign.status === 'DRAFT') {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const campaignStations = await CampaignStation.find({ campaignId: id }).populate({
      path: 'stationId',
      select: 'name address latitude longitude openingTime closingTime isActive organizationId managerId',
      populate: { path: 'organizationId', select: 'name code' },
    });

    const activeStations = campaignStations
      .map((cs) => cs.stationId)
      .filter((st) => st && st.isActive);

    const latNum = parseFloat(userLat);
    const lngNum = parseFloat(userLng);
    const hasUserCoordinates = !isNaN(latNum) && !isNaN(lngNum);

    let stationsList = activeStations.map((st) => {
      const stObj = st.toObject();
      if (hasUserCoordinates && stObj.latitude && stObj.longitude) {
        const stLat = parseFloat(stObj.latitude);
        const stLng = parseFloat(stObj.longitude);
        if (!isNaN(stLat) && !isNaN(stLng)) {
          stObj.distanceKm = getHaversineDistanceKm(latNum, lngNum, stLat, stLng);
        }
      }
      return stObj;
    });

    if (hasUserCoordinates) {
      stationsList.sort((a, b) => {
        if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
          return a.distanceKm - b.distanceKm;
        }
        return 0;
      });
    }

    return res.status(200).json({
      campaignId: id,
      totalStations: stationsList.length,
      stations: stationsList,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createCampaign,
  getAllCampaigns,
  getCampaignById,
  updateCampaign,
  updateCampaignStatus,
  addCampaignItem,
  removeCampaignItem,
  assignStationToCampaign,
  removeStationFromCampaign,
  findStationsForCampaign,
};
