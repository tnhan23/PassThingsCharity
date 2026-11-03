const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getHaversineDistanceKm } = require('../utils/geoDistance');

test('getHaversineDistanceKm calculates accurate GPS distance', () => {
  // District 1 (10.776889, 106.700806) to Thu Duc (10.8500, 106.7700)
  const dist = getHaversineDistanceKm(10.776889, 106.700806, 10.8500, 106.7700);
  assert.ok(typeof dist === 'number');
  assert.ok(dist > 5 && dist < 15, `Distance ${dist} km should be roughly 11 km`);

  // Same coordinates should be 0 km
  const sameDist = getHaversineDistanceKm(10.776889, 106.700806, 10.776889, 106.700806);
  assert.equal(sameDist, 0);

  // Invalid coordinates return null
  assert.equal(getHaversineDistanceKm('abc', 106, 10, 106), null);
});
