const {onSchedule} = require("firebase-functions/v2/scheduler");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {initializeApp} = require("firebase-admin/app");
const {getMessaging} = require("firebase-admin/messaging");

const {
  getDateKey,
  getNextWaterDateKey,
  getWeatherProfile,
} = require("./watering");

initializeApp();

const DEFAULT_FAMILY_ID = "NOTRE_JUNGLE_PARTAGEE";
const INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

function getNotificationCopy(latePlants, todayPlants) {
  if (latePlants.length > 0) {
    const plural = latePlants.length > 1 ? "s" : "";
    const verb = latePlants.length > 1 ? "sont" : "est";
    const messages = [
      `Alerte sécheresse ! ${latePlants.length} amie${plural} ${verb} en retard. Vite, aux arrosoirs ! 🚨`,
      `J'en connais qui vont finir déshydratées... Arrose vite tes plantes en retard ! 🥀`,
      `Oups ! Il y a ${latePlants.length} urgence${plural} dans la jungle ! 🏃💨`,
    ];

    return {
      title: "Urgence Jungle ! ⚠️",
      body: messages[Math.floor(Math.random() * messages.length)],
    };
  }

  if (todayPlants.length > 1) {
    const randomPlant =
      todayPlants[Math.floor(Math.random() * todayPlants.length)];
    const messages = [
      `${randomPlant.name} et ses amies ont soif... C'est l'heure de la tournée générale ! 🍻`,
      `Il y a du monde au balcon ! ${todayPlants.length} plantes attendent leur verre d'eau. 🌿`,
      `La jungle s'impatiente... ${randomPlant.name} et ses amies ont soif ! 💧`,
    ];

    return {
      title: "Mission Arrosage 💧",
      body: messages[Math.floor(Math.random() * messages.length)],
    };
  }

  if (todayPlants.length === 1) {
    const plant = todayPlants[0];
    const roomName = plant.room ?
      ` dans le ${plant.room.toLowerCase()}` : "";
    const messages = [
      `${plant.name} a soif ! Un petit verre d'eau et elle sera ravie. ✨`,
      `C'est le jour de ${plant.name}${roomName} ! 🌱 Pense à l'hydrater.`,
      `Toc toc ! ${plant.name} réclame un peu d'attention et d'eau ! 💦`,
    ];

    return {
      title: "Mission Arrosage 💧",
      body: messages[Math.floor(Math.random() * messages.length)],
    };
  }

  return null;
}

function collectRecipients(usersSnapshot) {
  const families = new Map();

  usersSnapshot.forEach((userDocument) => {
    const user = userDocument.data();
    const familyId = user.familyId || DEFAULT_FAMILY_ID;
    const tokens = [
      ...(Array.isArray(user.fcmTokens) ? user.fcmTokens : []),
      ...(user.fcmToken ? [user.fcmToken] : []),
    ].filter(Boolean);

    if (!families.has(familyId)) {
      families.set(familyId, new Map());
    }

    const tokenOwners = families.get(familyId);
    for (const token of tokens) {
      if (!tokenOwners.has(token)) tokenOwners.set(token, []);
      tokenOwners.get(token).push({
        reference: userDocument.ref,
        isLegacyToken: user.fcmToken === token,
      });
    }
  });

  return families;
}

async function removeInvalidToken(token, owners) {
  await Promise.all(owners.map(({reference, isLegacyToken}) => {
    const update = {
      fcmTokens: FieldValue.arrayRemove(token),
    };

    if (isLegacyToken) update.fcmToken = FieldValue.delete();
    return reference.set(update, {merge: true});
  }));
}

async function sendNotification(copy, tokenOwners) {
  const entries = [...tokenOwners.entries()];

  for (let index = 0; index < entries.length; index += 500) {
    const batch = entries.slice(index, index + 500);
    const tokens = batch.map(([token]) => token);
    const response = await getMessaging().sendEachForMulticast({
      notification: copy,
      tokens,
    });

    await Promise.all(response.responses.map((result, responseIndex) => {
      if (result.success || !INVALID_TOKEN_CODES.has(result.error?.code)) {
        return Promise.resolve();
      }

      const [token, ownerReferences] = batch[responseIndex];
      return removeInvalidToken(token, ownerReferences);
    }));
  }
}

exports.dailyWateringReminder = onSchedule({
  schedule: "0 9 * * *",
  timeZone: "Europe/Paris",
  region: "europe-west1",
}, async () => {
  const db = getFirestore();
  const todayKey = getDateKey(new Date());

  let weatherProfile;
  try {
    weatherProfile = await getWeatherProfile();
  } catch (error) {
    console.error("Météo indisponible, utilisation du rythme nominal :", error);
    weatherProfile = {factor: 1, significantRainDays: []};
  }

  const usersSnapshot = await db.collection("users").get();
  const recipientsByFamily = collectRecipients(usersSnapshot);

  for (const [familyId, tokenOwners] of recipientsByFamily) {
    if (tokenOwners.size === 0) continue;

    const plantsSnapshot = await db.collection("plants")
      .where("familyId", "==", familyId)
      .get();
    const plants = plantsSnapshot.docs.map((document) => document.data());
    const latePlants = [];
    const todayPlants = [];

    for (const plant of plants) {
      try {
        const nextWateringKey = getNextWaterDateKey(
          plant,
          weatherProfile,
        );

        if (nextWateringKey < todayKey) latePlants.push(plant);
        else if (nextWateringKey === todayKey) todayPlants.push(plant);
      } catch (error) {
        console.error(`Plante ignorée (${plant.name || "sans nom"}) :`, error);
      }
    }

    const copy = getNotificationCopy(latePlants, todayPlants);
    if (copy) await sendNotification(copy, tokenOwners);
  }
});
