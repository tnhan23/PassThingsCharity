const POINT_MILESTONES = [100, 500, 1000];
const DONATION_BASE_POINTS = 20;
const DEFAULT_TASK_POINTS_PER_HOUR = 25;
const NO_SHOW_FIRST_WARNING_COUNT = 1;
const NO_SHOW_PENALTY_POINTS = 10;

function calculateDonationPoints(items, basePoints = DONATION_BASE_POINTS) {
  const itemPoints = items.reduce((total, item) => {
    const pointsPerUnit = Number(item.pointsPerUnit) || 0;
    return total + Math.round(Number(item.quantity) * pointsPerUnit);
  }, 0);

  return basePoints + itemPoints;
}

function calculateTaskPoints(rewardPoints, hoursSpent) {
  const configuredPoints = Number(rewardPoints);
  if (Number.isInteger(configuredPoints) && configuredPoints > 0) {
    return configuredPoints;
  }

  return Math.max(25, Math.round(Number(hoursSpent) * DEFAULT_TASK_POINTS_PER_HOUR));
}

function getReachedPointMilestones(totalPoints) {
  return POINT_MILESTONES.filter((milestone) => totalPoints >= milestone);
}

function getNoShowConsequence(previousConfirmedAbsences, currentBalance) {
  const absenceNumber = Math.max(0, Math.floor(Number(previousConfirmedAbsences) || 0)) + 1;
  if (absenceNumber <= NO_SHOW_FIRST_WARNING_COUNT) {
    return { absenceNumber, action: 'WARNING', penaltyPoints: 0 };
  }

  const balance = Math.max(0, Math.floor(Number(currentBalance) || 0));
  return {
    absenceNumber,
    action: 'PENALTY',
    penaltyPoints: Math.min(NO_SHOW_PENALTY_POINTS, balance),
  };
}

module.exports = {
  POINT_MILESTONES,
  DONATION_BASE_POINTS,
  DEFAULT_TASK_POINTS_PER_HOUR,
  NO_SHOW_FIRST_WARNING_COUNT,
  NO_SHOW_PENALTY_POINTS,
  calculateDonationPoints,
  calculateTaskPoints,
  getReachedPointMilestones,
  getNoShowConsequence,
};
