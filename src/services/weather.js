// Coordonnées par défaut (ex: Angers, France)
const LAT = 47.47; 
const LON = -0.56;

/**
 * Récupère les indices météo et calcule un facteur d'ajustement.
 * @returns {Promise<number>} - Multiplicateur (ex: 0.7 = arrosage plus fréquent, 1.3 = arrosage espacé)
 */
export async function getWeatherAdjustmentFactor() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=temperature_2m_max,relative_humidity_2m_mean,et0_fao_evapotranspiration&timezone=Europe/Paris&forecast_days=3`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Erreur API Meteo');
    const data = await response.json();

    // On fait la moyenne des prévisions sur les 3 prochains jours pour l'anticipation
    const avgMaxTemp = data.daily.temperature_2m_max.reduce((a, b) => a + b, 0) / 3;
    const avgHumidity = data.daily.relative_humidity_2m_mean.reduce((a, b) => a + b, 0) / 3;
    const avgEvap = data.daily.et0_fao_evapotranspiration.reduce((a, b) => a + b, 0) / 3;

    let score = 0;

    // 1. Analyse de l'Évapotranspiration (Demande en eau globale de l'air)
    if (avgEvap > 4) score += 2;      // Très fort dessèchement
    else if (avgEvap > 2.5) score += 1; // Dessèchement modéré
    else if (avgEvap < 1) score -= 1;   // Temps très lourd/frais, peu d'évaporation

    // 2. Sécurité Température
    if (avgMaxTemp > 30) score += 1;
    if (avgMaxTemp < 15) score -= 1;

    // 3. Sécurité Humidité de l'air
    if (avgHumidity < 45) score += 1;
    if (avgHumidity > 75) score -= 1;

    // Traduction du score en facteur multiplicateur pour l'intervalle de jours
    // Score positif = Il fait chaud/sec -> l'intervalle diminue (ex: de 8 jours à 5 jours)
    // Score négatif = Il fait froid/humide -> l'intervalle augmente (ex: de 8 jours à 11 jours)
    if (score >= 3) return 0.5;       // Moitié de temps en moins (Canicule)
    if (score === 2) return 0.75;      // -25% de temps en moins
    if (score === 1) return 0.85;      // -15% de temps en moins
    if (score <= -2) return 1.4;       // +40% de temps en plus (Froid/Pluie)
    if (score === -1) return 1.2;      // +20% de temps en plus
    
    return 1; // Conditions normales
  } catch (error) {
    console.error("Impossible de calculer l'ajustement météo, retour au mode nominal :", error);
    return 1; 
  }
}