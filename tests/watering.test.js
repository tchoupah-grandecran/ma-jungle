import assert from 'node:assert/strict';
import test from 'node:test';

process.env.TZ = 'Europe/Paris';

const {
  getDynamicFrequency,
  getEffectiveLastWateringDate,
  getNextWaterDate,
  isPlantThirsty,
  isRainWateringToday,
} = await import('../src/utils/watering.js');

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const hotWeather = {
  factor: 0.5,
  significantRainDays: [],
};

test('applique toute la météo dehors et seulement 30 % dedans', () => {
  const outdoorPlant = {
    isOutdoor: true,
    baseFrequency: 10,
  };
  const indoorPlant = {
    isOutdoor: false,
    baseFrequency: 10,
  };

  assert.equal(getDynamicFrequency(outdoorPlant, hotWeather), 5);
  assert.equal(getDynamicFrequency(indoorPlant, hotWeather), 9);
});

test('une pluie passée devient le dernier arrosage extérieur', () => {
  const plant = {
    isOutdoor: true,
    baseFrequency: 7,
    lastWatering: '2026-07-30T12:00:00+02:00',
  };
  const weather = {
    factor: 1,
    significantRainDays: [{date: '2026-08-05'}],
  };
  const referenceDate = new Date('2026-08-06T12:00:00+02:00');

  assert.equal(
    dateKey(getEffectiveLastWateringDate(plant, weather, referenceDate)),
    '2026-08-05',
  );
  assert.equal(
    dateKey(getNextWaterDate(plant, weather, referenceDate)),
    '2026-08-12',
  );
});

test('une pluie prévue puis une seconde pluie repoussent successivement l’échéance', () => {
  const plant = {
    isOutdoor: true,
    baseFrequency: 5,
    lastWatering: '2026-08-01T12:00:00+02:00',
  };
  const weather = {
    factor: 1,
    significantRainDays: [
      {date: '2026-08-06'},
      {date: '2026-08-08'},
    ],
  };
  const referenceDate = new Date('2026-08-06T08:00:00+02:00');

  assert.equal(
    dateKey(getNextWaterDate(plant, weather, referenceDate)),
    '2026-08-13',
  );
  assert.equal(
    isRainWateringToday(plant, weather, referenceDate),
    true,
  );
});

test('une pluie après l’échéance ne masque pas une plante assoiffée', () => {
  const plant = {
    isOutdoor: true,
    baseFrequency: 5,
    lastWatering: '2026-08-01T12:00:00+02:00',
  };
  const weather = {
    factor: 1,
    significantRainDays: [{date: '2026-08-07'}],
  };
  const referenceDate = new Date('2026-08-06T08:00:00+02:00');

  assert.equal(
    dateKey(getNextWaterDate(plant, weather, referenceDate)),
    '2026-08-06',
  );
  assert.equal(isPlantThirsty(plant, weather, referenceDate), true);
});

test('conserve le jour local d’un arrosage ISO fait après minuit à Paris', () => {
  const plant = {
    isOutdoor: false,
    baseFrequency: 1,
    lastWatering: '2026-08-05T22:30:00.000Z',
  };
  const referenceDate = new Date('2026-08-06T08:00:00+02:00');

  assert.equal(
    dateKey(getNextWaterDate(plant, {factor: 1}, referenceDate)),
    '2026-08-07',
  );
});

test('ramène une fréquence invalide au minimum d’un jour', () => {
  const plant = {
    isOutdoor: false,
    baseFrequency: -4,
    lastWatering: '2026-08-06',
  };

  assert.equal(getDynamicFrequency(plant, {factor: 1}), 1);
});
