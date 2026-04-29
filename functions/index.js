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
    // 1. Récupérer tous les utilisateurs ayant un token
    const usersSnapshot = await db.collection("users").where("fcmToken", "!=", null).get();

    // 2. FILTRE ANTI-DOUBLON : On utilise une Map pour ne garder qu'un token unique
    // Clé : fcmToken, Valeur : familyId
    const uniqueTokensMap = new Map();
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.fcmToken) {
        uniqueTokensMap.set(data.fcmToken, data.familyId);
      }
    });

    console.log(`Traitement de ${uniqueTokensMap.size} notifications uniques.`);

    // 3. Boucler sur les tokens uniques
    for (const [fcmToken, familyId] of uniqueTokensMap) {
      
      // Récupérer les plantes de la famille
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

      // 4. Déterminer le message
      let title = "Mission Arrosage 💧";
      let body = "";

      if (latePlants.length > 0) {
        const messages = [
          `Alerte sécheresse ! ${latePlants.length} amies sont en retard. Vite, aux arrosoirs ! 🚨`,
          `J'en connais qui vont finir déshydratées... Arrose vite tes plantes en retard ! 🥀`,
          `Oups ! Tu as oublié quelques amies... Il y a des urgences dans la jungle ! 🏃💨`
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

      // 5. Envoi définitif
      if (body) {
        const message = {
          notification: {
            title: title,
            body: body,
          },
          token: fcmToken,
        };

        try {
          await admin.messaging().send(message);
        } catch (sendError) {
          // Si le token n'est plus valide (app désinstallée), on pourrait le supprimer ici
          console.error(`Erreur d'envoi pour un token :`, sendError.code);
        }
      }
    }
  } catch (error) {
    console.error("Erreur générale notifications :", error);
  }
});