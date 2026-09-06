# Ma Jungle

Application React/PWA de suivi d’arrosage, synchronisée avec Firebase et les
prévisions Open-Meteo d’Angers.

## Développement

```bash
npm install
npm run dev
```

Vérification complète avant livraison :

```bash
npm run check
```

Cette commande contrôle le code du client et des Cloud Functions, exécute les
tests météo/arrosage puis construit la version de production.

## Logique météo

- Les deux jours précédents et les trois jours à venir servent à détecter les
  épisodes chauds, secs ou humides.
- L’historique de pluie est conservé sur 92 jours dans le calcul.
- Une pluie liquide strictement supérieure à 5 mm remplace un arrosage pour
  les plantes extérieures uniquement.
- Les plantes extérieures reçoivent 100 % de l’ajustement météo ; les plantes
  intérieures n’en reçoivent que 30 %.
- Le profil est recalculé au démarrage, au retour au premier plan, au retour du
  réseau et chaque jour à 00 h 05.

## Déploiement

Le client et les fonctions doivent être déployés ensemble afin que les rappels
utilisent le même calcul météo que l’interface :

```bash
npm run check
npx firebase-tools deploy --only hosting,functions
```

Le runtime des fonctions est Node.js 22. Les notifications utilisent un
service worker dédié à FCM, avec un scope distinct du service worker PWA.
