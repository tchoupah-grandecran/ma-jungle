const LAT = 47.47;
const LON = -0.56;
const TIMEZONE = 'Europe/Paris';

const SIGNIFICANT_RAIN_MM = 5;
const RAIN_LOOKBACK_DAYS = 92;
const FORECAST_DAYS = 4;
const REQUEST_TIMEOUT_MS = 10_000;

function average(values) {
  const validValues = values.filter(Number.isFinite);

  if (validValues.length === 0) {
    return null;
  }

  return (
    validValues.reduce((sum, value) => sum + value, 0) /
    validValues.length
  );
}

function longestConsecutiveRun(days, predicate) {
  let longestRun = 0;
  let currentRun = 0;

  for (const day of days) {
    if (predicate(day)) {
      currentRun += 1;
      longestRun = Math.max(longestRun, currentRun);
    } else {
      currentRun = 0;
    }
  }

  return longestRun;
}

function getDateKeyInTimezone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function calculateWeatherAdjustment(relevantDays) {
  const avgMaxTemp = average(
    relevantDays.map((day) => day.temperatureMax),
  );
  const avgHumidity = average(
    relevantDays.map((day) => day.humidityMean),
  );
  const avgEvaporation = average(
    relevantDays.map((day) => day.evapotranspiration),
  );

  const consecutiveHotDays = longestConsecutiveRun(
    relevantDays,
    (day) => day.temperatureMax >= 30,
  );
  const consecutiveVeryHotDays = longestConsecutiveRun(
    relevantDays,
    (day) => day.temperatureMax >= 35,
  );
  const consecutiveDryDays = longestConsecutiveRun(
    relevantDays,
    (day) =>
      day.liquidPrecipitation < 1 &&
      Number.isFinite(day.humidityMean) &&
      day.humidityMean < 50,
  );

  let score = 0;

  if (avgEvaporation !== null) {
    if (avgEvaporation >= 4) score += 2;
    else if (avgEvaporation >= 2.5) score += 1;
    else if (avgEvaporation < 1) score -= 1;
  }

  if (avgMaxTemp !== null) {
    if (avgMaxTemp >= 30) score += 1;
    else if (avgMaxTemp < 15) score -= 1;
  }

  if (avgHumidity !== null) {
    if (avgHumidity < 45) score += 1;
    else if (avgHumidity > 75) score -= 1;
  }

  if (consecutiveHotDays >= 3) score += 1;
  if (consecutiveVeryHotDays >= 2) score += 1;
  if (consecutiveDryDays >= 3) score += 1;

  let factor = 1;
  let label = 'Normal';

  if (score >= 5) {
    factor = 0.55;
    label = 'Canicule prolongée';
  } else if (score >= 3) {
    factor = 0.7;
    label = 'Forte chaleur';
  } else if (score >= 1) {
    factor = 0.85;
    label = 'Temps sec';
  } else if (score <= -2) {
    factor = 1.35;
    label = 'Temps frais';
  } else if (score === -1) {
    factor = 1.15;
    label = 'Temps humide';
  }

  return {
    factor,
    label,
    score,
    metrics: {
      avgMaxTemp,
      avgHumidity,
      avgEvaporation,
      consecutiveHotDays,
      consecutiveVeryHotDays,
      consecutiveDryDays,
    },
  };
}

/**
 * Charge une fenêtre longue pour mémoriser les pluies récentes et une fenêtre
 * courte (J-2 à J+3) pour calculer l'impact de la météo sur la fréquence.
 */
export async function getWeatherAdjustmentFactor() {
  const params = new URLSearchParams({
    latitude: String(LAT),
    longitude: String(LON),
    daily: [
      'temperature_2m_max',
      'relative_humidity_2m_mean',
      'et0_fao_evapotranspiration',
      'rain_sum',
      'showers_sum',
    ].join(','),
    timezone: TIMEZONE,
    past_days: String(RAIN_LOOKBACK_DAYS),
    forecast_days: String(FORECAST_DAYS),
  });

  const controller = new AbortController();
  const timeout = globalThis.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params}`,
      {
        cache: 'no-store',
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new Error(`Erreur API météo : ${response.status}`);
    }

    const data = await response.json();
    const daily = data.daily;

    if (!daily?.time?.length) {
      throw new Error('Données météo incomplètes');
    }

    const days = daily.time.map((date, index) => {
      const rain = daily.rain_sum?.[index];
      const showers = daily.showers_sum?.[index];

      return {
        date,
        temperatureMax:
          daily.temperature_2m_max?.[index] ?? null,
        humidityMean:
          daily.relative_humidity_2m_mean?.[index] ?? null,
        evapotranspiration:
          daily.et0_fao_evapotranspiration?.[index] ?? null,
        liquidPrecipitation:
          (Number.isFinite(rain) ? rain : 0) +
          (Number.isFinite(showers) ? showers : 0),
      };
    });

    const todayKey = getDateKeyInTimezone(
      new Date(),
      TIMEZONE,
    );
    const todayIndex = days.findIndex(
      (day) => day.date === todayKey,
    );

    if (todayIndex < 0) {
      throw new Error('Jour courant absent des données météo');
    }

    const relevantDays = days.slice(
      Math.max(0, todayIndex - 2),
      todayIndex + 4,
    );

    const adjustment = calculateWeatherAdjustment(relevantDays);
    const significantRainDays = days
      .filter(
        (day) =>
          day.liquidPrecipitation > SIGNIFICANT_RAIN_MM,
      )
      .map((day) => ({
        date: day.date,
        precipitation: day.liquidPrecipitation,
      }));

    return {
      ...adjustment,
      fetchedAt: new Date().toISOString(),
      significantRainDays,
      days: relevantDays,
    };
  } catch (error) {
    const message =
      error?.name === 'AbortError'
        ? 'La requête météo a expiré'
        : 'Impossible de calculer l’ajustement météo';

    throw new Error(message, { cause: error });
  } finally {
    globalThis.clearTimeout(timeout);
  }
}
