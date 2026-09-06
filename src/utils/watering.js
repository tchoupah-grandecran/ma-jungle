import {
  addDays,
  isAfter,
  isBefore,
  isEqual,
  isValid,
  startOfDay,
} from 'date-fns';

const DEFAULT_WEATHER_FACTOR = 1;

function toLocalDay(value) {
  if (value instanceof Date) {
    return isValid(value) ? startOfDay(value) : null;
  }

  if (typeof value === 'string') {
    const dayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (dayMatch) {
      const [, year, month, day] = dayMatch;
      const date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
      );

      return isValid(date) ? startOfDay(date) : null;
    }
  }

  const date = new Date(value);
  return isValid(date) ? startOfDay(date) : null;
}

function getWeatherFactor(weatherProfile) {
  // Accepte encore un nombre afin que les anciennes données/appels ne cassent pas.
  const candidate =
    typeof weatherProfile === 'number'
      ? weatherProfile
      : weatherProfile?.factor;

  return Number.isFinite(candidate)
    ? candidate
    : DEFAULT_WEATHER_FACTOR;
}

function getSignificantRainDates(weatherProfile) {
  if (!Array.isArray(weatherProfile?.significantRainDays)) {
    return [];
  }

  return weatherProfile.significantRainDays
    .map((rainDay) =>
      toLocalDay(rainDay?.date ?? rainDay?.dateObject),
    )
    .filter(Boolean)
    .sort((first, second) => first - second);
}

function getManualWateringDate(plant) {
  return toLocalDay(plant?.lastWatering) ?? startOfDay(new Date());
}

/**
 * Les plantes extérieures subissent tout l'effet météo. Pour les plantes
 * intérieures, l'effet est volontairement limité à 30 %.
 */
export function getEffectiveWeatherFactor(
  plant,
  weatherProfile,
) {
  const weatherFactor = getWeatherFactor(weatherProfile);

  return plant?.isOutdoor
    ? weatherFactor
    : 1 + (weatherFactor - 1) * 0.3;
}

/**
 * Fréquence d'arrosage ajustée, avec un minimum d'un jour.
 */
export function getDynamicFrequency(plant, weatherProfile) {
  const rawBaseFrequency =
    plant?.baseFrequency ?? plant?.frequency ?? 1;

  const baseFrequency = Math.max(
    1,
    Number(rawBaseFrequency) || 1,
  );

  const effectiveFactor = getEffectiveWeatherFactor(
    plant,
    weatherProfile,
  );

  return Math.max(
    1,
    Math.round(baseFrequency * effectiveFactor),
  );
}

/**
 * Pour une plante extérieure, la pluie significative la plus récente
 * remplace un arrosage manuel lorsqu'elle est postérieure à celui-ci.
 */
export function getEffectiveLastWateringDate(
  plant,
  weatherProfile,
  referenceDate = new Date(),
) {
  const manualWateringDate = getManualWateringDate(plant);

  if (!plant?.isOutdoor) {
    return manualWateringDate;
  }

  const today = startOfDay(referenceDate);

  const latestPastRain = getSignificantRainDates(weatherProfile)
    .filter(
      (rainDate) =>
        isBefore(rainDate, today) || isEqual(rainDate, today),
    )
    .at(-1);

  return latestPastRain &&
    isAfter(latestPastRain, manualWateringDate)
    ? latestPastRain
    : manualWateringDate;
}

/**
 * Indique si une pluie d'au moins 5 mm remplace l'arrosage aujourd'hui.
 */
export function isRainWateringToday(
  plant,
  weatherProfile,
  referenceDate = new Date(),
) {
  if (!plant?.isOutdoor) {
    return false;
  }

  const today = startOfDay(referenceDate);

  return getSignificantRainDates(weatherProfile).some((rainDate) =>
    isEqual(rainDate, today),
  );
}

/**
 * Calcule le prochain arrosage. Une pluie significative passée devient le
 * dernier arrosage effectif. Une pluie prévue avant l'échéance repousse aussi
 * l'échéance ; le calcul sera corrigé au prochain rafraîchissement si la
 * prévision évolue.
 */
export function getNextWaterDate(
  plant,
  weatherProfile,
  referenceDate = new Date(),
) {
  const dynamicFrequency = getDynamicFrequency(
    plant,
    weatherProfile,
  );

  const effectiveLastWatering =
    getEffectiveLastWateringDate(
      plant,
      weatherProfile,
      referenceDate,
    );

  let nextWateringDate = addDays(
    effectiveLastWatering,
    dynamicFrequency,
  );

  if (!plant?.isOutdoor) {
    return nextWateringDate;
  }

  const today = startOfDay(referenceDate);

  for (const rainDate of getSignificantRainDates(weatherProfile)) {
    const isTodayOrLater =
      isAfter(rainDate, today) || isEqual(rainDate, today);

    const happensBeforeCurrentDueDate =
      isBefore(rainDate, nextWateringDate) ||
      isEqual(rainDate, nextWateringDate);

    if (isTodayOrLater && happensBeforeCurrentDueDate) {
      nextWateringDate = addDays(
        rainDate,
        dynamicFrequency,
      );
    }
  }

  return nextWateringDate;
}

/**
 * Une plante a soif lorsque son échéance est aujourd'hui ou déjà dépassée.
 */
export function isPlantThirsty(
  plant,
  weatherProfile,
  referenceDate = new Date(),
) {
  const today = startOfDay(referenceDate);
  const nextWateringDate = startOfDay(
    getNextWaterDate(plant, weatherProfile, referenceDate),
  );

  return !isAfter(nextWateringDate, today);
}
