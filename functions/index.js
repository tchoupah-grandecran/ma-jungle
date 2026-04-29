const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();

// Définit la région (optionnel, mais conseillé pour éviter la Floride par défaut)
setGlobalOptions({ region: "europe-west1" });

exports.dailyWateringReminder = onSchedule("0 9 * * *", async (event) => {
  const db = admin.firestore();
  const now = new Date();
  
  console.log("Démarrage de la vérification quotidienne des plantes...");

  try {
    // 1. Récupérer tous les utilisateurs qui ont un Token
    const usersSnapshot = await db.collection("users").where("fcmToken", "!=", null).get();
    
    if (usersSnapshot.empty) {
      console.log("Aucun utilisateur avec un token trouvé.");
      return;
    }

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // 2. Chercher les plantes de cet utilisateur
      const plantsSnapshot = await db.collection("plants")
        .where("userId", "==", userId)
        .get();
        
      const thirstyPlants = plantsSnapshot.docs.filter(doc => {
        const plant = doc.data();
        const nextWaterDate = new Date(plant.lastWatering);
        nextWaterDate.setDate(nextWaterDate.getDate() + (plant.frequency || 7));
        return nextWaterDate <= now;
      });

      // 3. Envoi de la notification
      if (thirstyPlants.length > 0) {
        const message = {
          notification: {
            title: "🌿 Mission Arrosage !",
            body: thirstyPlants.length === 1 
              ? `Ta plante "${thirstyPlants[0].data().name}" a soif.`
              : `${thirstyPlants.length} plantes attendent de l'eau ce matin.`,
          },
          token: userData.fcmToken,
        };

        await admin.messaging().send(message);
        console.log(`Notification envoyée à ${userData.displayName || userId}`);
      }
    }
  } catch (error) {
    console.error("Erreur globale lors de l'exécution:", error);
  }
});