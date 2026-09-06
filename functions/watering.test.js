const assert = require('node:assert/strict');
const test = require('node:test');

const {
  getDateKey,
  getNextWaterDateKey,
} = require('./watering');

test('le backend utilise bien le jour Europe/Paris', () => {
  assert.equal(
    getDateKey(new Date('2026-08-05T22:30:00.000Z')),
    '2026-08-06',
  );
});

test('le backend chaîne plusieurs pluies comme le client', () => {
  const nextDate = getNextWaterDateKey(
    {
      isOutdoor: true,
      baseFrequency: 5,
      lastWatering: '2026-08-01T12:00:00+02:00',
    },
    {
      factor: 1,
      significantRainDays: [
        {date: '2026-08-06'},
        {date: '2026-08-08'},
      ],
    },
    new Date('2026-08-06T08:00:00+02:00'),
  );

  assert.equal(nextDate, '2026-08-13');
});
