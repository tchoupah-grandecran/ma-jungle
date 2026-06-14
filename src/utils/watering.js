import { addDays } from 'date-fns';

/**
 * Calcule l'impact du facteur météo selon que la plante est en intérieur ou extérieur.
 * Les plantes d'intérieur ne subissent que 30% de l'effet météo.
 * @param {object} plant
 * @param {number} weatherFactor
 * @returns {number} facteur effectif à appliquer
 */
export function getEffectiveWeatherFactor(plant, weatherFactor) {
  return plant.isOutdoor ? weatherFactor : 1 + (weatherFactor - 1) * 0.3;
}

/**
 * Calcule la fréquence d'arrosage dynamique (ajustée météo) en jours.
 * @param {object} plant - doit contenir baseFrequency (ou frequency en fallback)
 * @param {number} weatherFactor
 * @returns {number} fréquence ajustée, minimum 1 jour
 */
export function getDynamicFrequency(plant, weatherFactor) {
  const base = plant.baseFrequency ?? plant.frequency;
  const factor = getEffectiveWeatherFactor(plant, weatherFactor);
  return Math.max(1, Math.round(base * factor));
}

/**
 * Calcule la date du prochain arrosage en tenant compte de la météo.
 * @param {object} plant
 * @param {number} weatherFactor
 * @returns {Date}
 */
export function getNextWaterDate(plant, weatherFactor) {
  const dynamicFrequency = getDynamicFrequency(plant, weatherFactor);
  return addDays(new Date(plant.lastWatering), dynamicFrequency);
}

/**
 * Détermine si une plante a soif (prochain arrosage dépassé ou aujourd'hui).
 * @param {object} plant
 * @param {number} weatherFactor
 * @returns {boolean}
 */
export function isPlantThirsty(plant, weatherFactor) {
  return getNextWaterDate(plant, weatherFactor) <= new Date();
}