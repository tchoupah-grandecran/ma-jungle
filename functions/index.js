const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore } = require("firebase-admin/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

exports.dailyWateringReminder = onSchedule({
  schedule: "0 9 * * *", 
  timeZone: "Europe/Paris",
  region: "europe-west1",
}, async (event) => {
  const db = getFirestore();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const usersSnapshot = await db.collection("users").where("fcmToken", "!=", null).get();
    const uniqueTokensMap = new Map();
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.fcmToken) {
        uniqueTokensMap.set(data.fcmToken, data.familyId);
      }
    });

    for (const [fcmToken, familyId] of uniqueTokensMap) {
      const plantsSnapshot = await db.collection("plants")
        .where("familyId", "==", familyId)
        .get();

      const plants = plantsSnapshot.docs.map(doc => doc.data());
      const latePlants = [];
      const todayPlants = [];

      plants.forEach(plant => {
        const nextWatering = new Date(plant.lastWatering);
        nextWatering.setDate(nextWatering.getDate() + plant.frequency);
        nextWatering.setHours(0, 0, 0, 0);

        if (nextWatering < today) {
          latePlants.push(plant);
        } else if (nextWatering.getTime() === today.getTime()) {
          todayPlants.push(plant);
        }
      });

      let title = "Mission Arrosage 💧";
      let body = "";

      // --- LOGIQUE AVEC GESTION DES PLURIELS ---

      if (latePlants.length > 0) {
        const s = latePlants.length > 1 ? "s" : "";
        const messages = [
          `Alerte sécheresse ! ${latePlants.length} amie${s} ${latePlants.length > 1 ? 'sont' : 'est'} en retard. Vite, aux arrosoirs ! 🚨`,
          `J'en connais qui vont finir déshydratée${s}... Arrose vite tes plantes en retard ! 🥀`,
          `Oups ! Tu as oublié quelque${s} amie${s}... Il y a des urgences dans la jungle ! 🏃💨`
        ];
        body = messages[Math.floor(Math.random() * messages.length)];
        title = "Urgence Jungle ! ⚠️";

      } else if (todayPlants.length > 1) {
        const randomPlant = todayPlants[Math.floor(Math.random() * todayPlants.length)];
        const messages = [
          `${randomPlant.name} et ses amies ont soif... C'est l'heure de la tournée générale ! 🍻`,
          `Il y a du monde au balcon ! ${todayPlants.length} plantes attendent leur verre d'eau. 🌿`,
          `La jungle s'impatiente... ${randomPlant.name} & co ont soif ! 💧`
        ];
        body = messages[Math.floor(Math.random() * messages.length)];

      } else if (todayPlants.length === 1) {
        const p = todayPlants[0];
        const roomName = p.room ? ` dans le ${p.room.toLowerCase()}` : "";
        const messages = [
          `${p.name} a soif ! Un petit verre d'eau et elle sera ravie. ✨`,
          `C'est le jour d'${p.name}${roomName} ! 🌱 Pense à l'hydrater.`,
          `Toc toc ! ${p.name} réclame un peu d'attention (et d'eau) ! 💦`
        ];
        body = messages[Math.floor(Math.random() * messages.length)];
      }

      if (body) {
        const message = {
          notification: { title, body },
          token: fcmToken,
        };

        try {
          await admin.messaging().send(message);
        } catch (sendError) {
          console.error(`Erreur d'envoi :`, sendError.code);
        }
      }
    }
  } catch (error) {
    console.error("Erreur générale :", error);
  }
});