const LAT = 47.47;
const LON = -0.56;
const TIMEZONE = "Europe/Paris";
const SIGNIFICANT_RAIN_MM = 5;

function average(values) {
  const validValues = values.filter(Number.isFinite);
  if (validValues.length === 0) return null;
  return validValues.reduce((sum, value) => sum + value, 0) /
    validValues.length;
}

function longestConsecutiveRun(days, predicate) {
  let longest = 0;
  let current = 0;

  for (const day of days) {
    if (predicate(day)) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }

  return longest;
}

function getDateKey(date, timeZone = TIMEZONE) {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map(({type, value}) => [type, value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function addDaysToKey(dateKey, numberOfDays) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + numberOfDays);
  return date.toISOString().slice(0, 10);
}

function calculateAdjustment(days) {
  const avgMaxTemp = average(days.map((day) => day.temperatureMax));
  const avgHumidity = average(days.map((day) => day.humidityMean));
  const avgEvaporation = average(
    days.map((day) => day.evapotranspiration),
  );
  const consecutiveHotDays = longestConsecutiveRun(
    days,
    (day) => day.temperatureMax >= 30,
  );
  const consecutiveVeryHotDays = longestConsecutiveRun(
    days,
    (day) => day.temperatureMax >= 35,
  );
  const consecutiveDryDays = longestConsecutiveRun(
    days,
    (day) => day.liquidPrecipitation < 1 &&
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

  if (score >= 5) return {factor: 0.55, label: "Canicule prolongée"};
  if (score >= 3) return {factor: 0.7, label: "Forte chaleur"};
  if (score >= 1) return {factor: 0.85, label: "Temps sec"};
  if (score <= -2) return {factor: 1.35, label: "Temps frais"};
  if (score === -1) return {factor: 1.15, label: "Temps humide"};

  return {factor: 1, label: "Normal"};
}

async function getWeatherProfile(referenceDate = new Date()) {
  const params = new URLSearchParams({
    latitude: String(LAT),
    longitude: String(LON),
    daily: [
      "temperature_2m_max",
      "relative_humidity_2m_mean",
      "et0_fao_evapotranspiration",
      "rain_sum",
      "showers_sum",
    ].join(","),
    timezone: TIMEZONE,
    past_days: "92",
    forecast_days: "4",
  });

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params}`,
    {signal: AbortSignal.timeout(10_000)},
  );

  if (!response.ok) {
    throw new Error(`Erreur API météo : ${response.status}`);
  }

  const {daily} = await response.json();
  if (!daily?.time?.length) throw new Error("Données météo incomplètes");

  const days = daily.time.map((date, index) => ({
    date,
    temperatureMax: daily.temperature_2m_max?.[index] ?? null,
    humidityMean: daily.relative_humidity_2m_mean?.[index] ?? null,
    evapotranspiration:
      daily.et0_fao_evapotranspiration?.[index] ?? null,
    liquidPrecipitation:
      (daily.rain_sum?.[index] ?? 0) +
      (daily.showers_sum?.[index] ?? 0),
  }));

  const todayKey = getDateKey(referenceDate);
  const todayIndex = days.findIndex((day) => day.date === todayKey);
  if (todayIndex < 0) throw new Error("Jour courant absent de la météo");

  const relevantDays = days.slice(
    Math.max(0, todayIndex - 2),
    todayIndex + 4,
  );

  return {
    ...calculateAdjustment(relevantDays),
    significantRainDays: days
      .filter((day) => day.liquidPrecipitation > SIGNIFICANT_RAIN_MM)
      .map((day) => ({
        date: day.date,
        precipitation: day.liquidPrecipitation,
      })),
  };
}

function getDynamicFrequency(plant, weatherProfile) {
  const baseFrequency = Math.max(
    1,
    Number(plant.baseFrequency ?? plant.frequency) || 1,
  );
  const factor = Number.isFinite(weatherProfile?.factor) ?
    weatherProfile.factor : 1;
  const effectiveFactor = plant.isOutdoor ?
    factor : 1 + (factor - 1) * 0.3;

  return Math.max(1, Math.round(baseFrequency * effectiveFactor));
}

function getNextWaterDateKey(
  plant,
  weatherProfile,
  referenceDate = new Date(),
) {
  const todayKey = getDateKey(referenceDate);
  const manualWateringKey = getDateKey(new Date(plant.lastWatering));
  const frequency = getDynamicFrequency(plant, weatherProfile);
  const rainDates = plant.isOutdoor ?
    (weatherProfile?.significantRainDays ?? [])
      .map((day) => day.date)
      .sort() : [];

  const latestPastRain = rainDates
    .filter((dateKey) => dateKey <= todayKey)
    .at(-1);

  const effectiveLastWatering =
    latestPastRain && latestPastRain > manualWateringKey ?
      latestPastRain : manualWateringKey;

  let nextWateringKey = addDaysToKey(
    effectiveLastWatering,
    frequency,
  );

  for (const rainDate of rainDates) {
    if (rainDate >= todayKey && rainDate <= nextWateringKey) {
      nextWateringKey = addDaysToKey(rainDate, frequency);
    }
  }

  return nextWateringKey;
}

module.exports = {
  getDateKey,
  getDynamicFrequency,
  getNextWaterDateKey,
  getWeatherProfile,
};
