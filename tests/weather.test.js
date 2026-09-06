import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateWeatherAdjustment } from '../src/services/weather.js';

function day(overrides = {}) {
  return {
    temperatureMax: 22,
    humidityMean: 60,
    evapotranspiration: 2,
    liquidPrecipitation: 0,
    ...overrides,
  };
}

test('détecte une canicule réellement consécutive', () => {
  const days = Array.from({length: 6}, () => day({
    temperatureMax: 36,
    humidityMean: 35,
    evapotranspiration: 5,
  }));

  const result = calculateWeatherAdjustment(days);

  assert.equal(result.factor, 0.55);
  assert.equal(result.label, 'Canicule prolongée');
  assert.equal(result.metrics.consecutiveHotDays, 6);
});

test('ne confond pas des jours chauds isolés avec une vague continue', () => {
  const days = [
    day({temperatureMax: 31}),
    day({temperatureMax: 22}),
    day({temperatureMax: 31}),
    day({temperatureMax: 22}),
    day({temperatureMax: 31}),
    day({temperatureMax: 22}),
  ];

  const result = calculateWeatherAdjustment(days);

  assert.equal(result.metrics.consecutiveHotDays, 1);
  assert.equal(result.factor, 1);
});

test('des métriques absentes ne créent pas un faux incident météo', () => {
  const result = calculateWeatherAdjustment([
    day({
      temperatureMax: null,
      humidityMean: null,
      evapotranspiration: null,
    }),
  ]);

  assert.equal(result.factor, 1);
  assert.equal(result.metrics.avgMaxTemp, null);
});
