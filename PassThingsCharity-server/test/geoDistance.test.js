const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getHaversineDistanceKm, getHaversineDistanceMeters } = require('../utils/geoDistance');

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

test('getHaversineDistanceMeters calculates accurate distance in meters for 50m check-in radius', () => {
  const stationLat = 10.776889;
  const stationLng = 106.700806;

  // Exact location: 0 meters
  assert.equal(getHaversineDistanceMeters(stationLat, stationLng, stationLat, stationLng), 0);

  // Within 50m (~25m away)
  const dist25 = getHaversineDistanceMeters(stationLat, stationLng, stationLat + 0.000225, stationLng);
  assert.ok(dist25 >= 20 && dist25 <= 30, `Distance ${dist25} should be around 25m`);

  // Outside 50m (~100m away)
  const dist100 = getHaversineDistanceMeters(stationLat, stationLng, stationLat + 0.0009, stationLng);
  assert.ok(dist100 >= 95 && dist100 <= 105, `Distance ${dist100} should be around 100m`);
});
