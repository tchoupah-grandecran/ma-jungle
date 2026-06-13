import { useState, useEffect } from 'react';
import { db, auth, messaging } from './services/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { getToken, onMessage, deleteToken } from 'firebase/messaging';
import { addDays } from 'date-fns';
import { useAuth } from './hooks/useAuth';
import { ROOMS } from './utils/constants';
import { motion, AnimatePresence } from 'framer-motion';
import { arrayRemove } from 'firebase/firestore';

import { 
  Search, Bell, BellOff, LogOut, Plus, Droplets, 
  Sprout, X, ChevronDown, Moon, Sun, Settings, CloudSun 
} from 'lucide-react';

import Login from './pages/Login';
import AddPlant from './components/AddPlant';
import PlantCard from './components/PlantCard';
import PlantDetails from './components/PlantDetails';

const FAMILY_ID = "NOTRE_JUNGLE_PARTAGEE";
const VAPID_KEY = 'BJ_ta6RLynMO3OswuqxOqO89PRTfGMKhKAeI2C3WiOBNvCN5P3EwngLbjwuyvsgwgFxtjt6GnXIsr6hfg18FZtw';

// Coordonnées géographiques par défaut pour l'API Météo (ex: Angers)
const LAT = 47.47;
const LON = -0.56;

// ─── Notification helpers ──────────────────────────────────────────────────────

async function registerFCMToken(uid) {
  let registration = await navigator.serviceWorker.getRegistration();
  
  if (!registration) {
    registration = await navigator.serviceWorker.ready;
  }
  
  if (!registration) {
    throw new Error('Service worker introuvable après vérification');
  }

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    throw new Error('Impossible de générer le token FCM');
  }

  await setDoc(
    doc(db, 'users', uid), 
    { fcmTokens: arrayUnion(token) }, 
    { merge: true }
  );
  return token;
}

async function unregisterFCMToken(uid) {
  try { 
    const registration = await navigator.serviceWorker.getRegistration();
    const token = await getToken(messaging, { serviceWorkerRegistration: registration });
    
    if (token) {
      await setDoc(doc(db, 'users', uid), { fcmTokens: arrayRemove(token) }, { merge: true });
    }
    await deleteToken(messaging); 
  } catch (_) { /* ignore */ }
}

// ─── App ───────────────────────────────────────────────────────────────────────

function App() {
  const { user, loading } = useAuth();

  // ── Mode PWA / Standalone Installation ──
  const [isStandalone, setIsStandalone] = useState(true);

  useEffect(() => {
    const isInWebAppStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone 
      || false;
    
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobileDevice && !isInWebAppStandalone) {
      setIsStandalone(false);
    }
  }, []);

  // ── Theme ──
  const [themeChoice, setThemeChoice] = useState(() => {
    return localStorage.getItem('theme-preference') || 'auto';
  });

  // ── UI state ──
  const [showSettings, setShowSettings] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingPlant, setEditingPlant] = useState(null);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [showConfirmWaterAll, setShowConfirmWaterAll] = useState(false);
  const [isMissionExpanded, setIsMissionExpanded] = useState(false);
  const [toast, setToast] = useState(null);

  // ── Data ──
  const [plants, setPlants] = useState([]);
  const [activeRoom, setActiveRoom] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Weather Factor State ──
  const [weatherFactor, setWeatherFactor] = useState(1);

  // ── Notifications (Sécurisées pour le mobile) ──
  const [notifPermission, setNotifPermission] = useState(() => {
    return typeof Notification !== 'undefined' ? Notification.permission : 'denied';
  });
  
  const [notifEnabled, setNotifEnabled] = useState(() => {
    return localStorage.getItem('notif-enabled') === 'true';
  });
  const [notifLoading, setNotifLoading] = useState(false);

  // ── Helpers ──
  const showToast = (message, type = 'success') => setToast({ message, type });

  // ─── Fetch Weather & Compute Factor ──────────────────────────────────────────
  useEffect(() => {
    async function fetchWeatherMetrics() {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=temperature_2m_max,relative_humidity_2m_mean,et0_fao_evapotranspiration&timezone=Europe/Paris&forecast_days=3`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Météo indisponible');
        const data = await res.json();

        // Moyenne des prévisions sur 3 jours pour lisser les tendances
        const avgMaxTemp = data.daily.temperature_2m_max.reduce((a, b) => a + b, 0) / 3;
        const avgHumidity = data.daily.relative_humidity_2m_mean.reduce((a, b) => a + b, 0) / 3;
        const avgEvap = data.daily.et0_fao_evapotranspiration.reduce((a, b) => a + b, 0) / 3;

        let score = 0;
        if (avgEvap > 4) score += 2;
        else if (avgEvap > 2.5) score += 1;
        else if (avgEvap < 1) score -= 1;

        if (avgMaxTemp > 30) score += 1;
        if (avgMaxTemp < 15) score -= 1;

        if (avgHumidity < 45) score += 1;
        if (avgHumidity > 75) score -= 1;

        // Conversion en facteur multiplicateur d'intervalle
        if (score >= 3) setWeatherFactor(0.5);       // Fréquence doublée (Canicule)
        else if (score === 2) setWeatherFactor(0.75); // Intervalle réduit de 25%
        else if (score === 1) setWeatherFactor(0.85); // Intervalle réduit de 15%
        else if (score <= -2) setWeatherFactor(1.4);  // Intervalle augmenté de 40% (Temps lourd/frais)
        else if (score === -1) setWeatherFactor(1.2); // Intervalle augmenté de 20%
        else setWeatherFactor(1);                     // Mode nominal
      } catch (err) {
        console.error("Échec du calcul météo dynamique. Mode nominal activé (1).", err);
        setWeatherFactor(1);
      }
    }
    if (user) fetchWeatherMetrics();
  }, [user]);

  // ─── Theme effect ────────────────────────────────────────────────────────────
  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = () => {
      if (themeChoice === 'auto') {
        root.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
      } else {
        root.classList.toggle('dark', themeChoice === 'dark');
      }
    };
    applyTheme();
    localStorage.setItem('theme-preference', themeChoice);

    if (themeChoice === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', applyTheme);
      return () => mq.removeEventListener('change', applyTheme);
    }
  }, [themeChoice]);

  // ─── Plants subscription (Trié dynamiquement selon la météo) ──────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'plants'), where('familyId', '==', FAMILY_ID));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      data.sort((a, b) => {
        // Si la plante est à l'intérieur, on atténue l'effet météo à hauteur de 30% d'impact seulement
        const factorA = a.isOutdoor ? weatherFactor : 1 + (weatherFactor - 1) * 0.3;
        const factorB = b.isOutdoor ? weatherFactor : 1 + (weatherFactor - 1) * 0.3;

        const dynamicFreqA = Math.max(1, Math.round((a.baseFrequency || a.frequency) * factorA));
        const dynamicFreqB = Math.max(1, Math.round((b.baseFrequency || b.frequency) * factorB));

        const nA = addDays(new Date(a.lastWatering), dynamicFreqA);
        const nB = addDays(new Date(b.lastWatering), dynamicFreqB);
        return nA - nB;
      });
      setPlants(data);
    });
    return unsubscribe;
  }, [user, weatherFactor]);

  // ─── Toast auto-dismiss ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // ─── FCM foreground messages ─────────────────────────────────────────────────
  useEffect(() => {
    if (!messaging) return;
    
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground FCM message:', payload);
      showToast(
        `${payload.notification?.title ?? 'Notification'}: ${payload.notification?.body ?? ''}`,
        'info'
      );
    });
    return () => unsubscribe();
  }, []);

  // ─── Silently refresh token on load if notifications already enabled ─────────
  useEffect(() => {
    if (!user || !notifEnabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    registerFCMToken(user.uid).catch(err => {
      console.error('Silent token refresh failed:', err);
    });
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Notification toggle ─────────────────────────────────────────────────────
  const handleNotificationToggle = async () => {
    if (notifLoading || typeof Notification === 'undefined') return;
    setNotifLoading(true);

    try {
      if (Notification.permission === 'denied') {
        showToast('Notifications bloquées par le navigateur. Modifiez les paramètres du site.', 'error');
        setNotifLoading(false);
        return;
      }

      if (notifEnabled && Notification.permission === 'granted') {
        await unregisterFCMToken(user.uid);
        setNotifEnabled(false);
        localStorage.setItem('notif-enabled', 'false');
        setNotifPermission(Notification.permission);
        showToast('Notifications désactivées 🔕', 'info');
        setNotifLoading(false);
        return;
      }

      const permission = await Notification.requestPermission();
      setNotifPermission(permission);

      if (permission === 'granted') {
        await registerFCMToken(user.uid);
        setNotifEnabled(true);
        localStorage.setItem('notif-enabled', 'true');
        showToast('Notifications activées 🔔', 'success');
      } else if (permission === 'denied') {
        setNotifEnabled(false);
        localStorage.setItem('notif-enabled', 'false');
        showToast('Permission refusée. Activez-les dans les réglages du navigateur.', 'error');
      } else {
        showToast('Permission ignorée. Réessayez quand vous voulez.', 'info');
      }
    } catch (err) {
      console.error('Notification toggle error:', err);
      showToast('Erreur lors de la configuration des notifications.', 'error');
    }

    setNotifLoading(false);
  };

  // ─── Derived state (Calcul d'urgence mis à jour avec la météo) ───────────────
  const thirstyPlants = plants.filter(p => {
    const factor = p.isOutdoor ? weatherFactor : 1 + (weatherFactor - 1) * 0.3;
    const dynamicFrequency = Math.max(1, Math.round((p.baseFrequency || p.frequency) * factor));
    return addDays(new Date(p.lastWatering), dynamicFrequency) <= new Date();
  });

  const filteredPlants = plants.filter(plant => {
    const matchesRoom = activeRoom === 'all' || plant.room === activeRoom;
    const matchesSearch = (plant.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRoom && matchesSearch;
  });

  // ─── Watering handlers ───────────────────────────────────────────────────────
  const handleWatering = async (id, name) => {
    const now = new Date().toISOString();
    try {
      await updateDoc(doc(db, 'plants', id), {
        lastWatering: now,
        history: arrayUnion(now),
      });
      if (name) showToast(`${name} a bien été arrosée ! 🌿`);
    } catch (err) { console.error(err); }
  };

  const waterAllThirsty = async () => {
    const count = thirstyPlants.length;
    await Promise.all(thirstyPlants.map(p => handleWatering(p.id)));
    setShowConfirmWaterAll(false);
    setIsMissionExpanded(false);
    showToast(`${count} plantes arrosées ! ✨`);
  };

  // ─── Notification button label/icon helpers ──────────────────────────────────
  const notifButtonIcon = () => {
    if (notifPermission === 'denied') return <BellOff size={18} />;
    if (notifEnabled && notifPermission === 'granted') return <Bell size={18} />;
    return <BellOff size={18} />;
  };

  const notifButtonLabel = () => {
    if (notifLoading) return 'Chargement...';
    if (notifPermission === 'denied') return 'Bloquées';
    if (notifEnabled && notifPermission === 'granted') return 'Désactiver';
    return 'Activer';
  };

  const notifButtonColor = () => {
    if (notifPermission === 'denied') return 'bg-red-50 dark:bg-red-500/10 text-red-400';
    if (notifEnabled && notifPermission === 'granted') return 'bg-green-50 dark:bg-green-500/10 text-green-600';
    return 'bg-jungle-cream dark:bg-jungle-deep text-gray-400';
  };

  // ─── Loading / auth guards ───────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F7F2] dark:bg-jungle-deep transition-colors duration-500">
      <Sprout className="animate-bounce text-[#2A3930] dark:text-jungle-cream" size={40} />
    </div>
  );

  // ─── ÉCRAN D'INSTALLATION SUR MOBILE (HORS PWA) ───
  if (!isStandalone) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9F7F2] p-8 text-center text-[#2A3930]">
        <div className="w-24 h-24 bg-[#EAE7E0] rounded-full flex items-center justify-center mb-6 shadow-inner text-[#8A9A5B]">
          <Sprout size={48} className="animate-pulse" />
        </div>
        <h1 className="font-rounded font-black text-3xl mb-4">Ma Jungle</h1>
        <p className="text-sm font-medium text-gray-500 max-w-sm mb-8 leading-relaxed">
          Pour pouvoir suivre l'arrosage de nos plantes et recevoir les alertes SOS, installe l'application sur ton écran d'accueil.
        </p>
        
        {/iPhone|iPad|iPod/i.test(navigator.userAgent) ? (
          <div className="bg-white rounded-3xl p-6 shadow-xl w-full max-w-xs border border-gray-100 space-y-4">
            <p className="text-xs font-black uppercase tracking-wider text-[#BF6B4E]">Comment installer :</p>
            <ol className="text-xs text-left space-y-3 font-semibold text-gray-600 list-decimal pl-4 leading-relaxed">
              <li>Clique sur les 3 petits points puis sur le bouton de <strong>Partage</strong> en bas de Safari (l'icône avec la flèche vers le haut).</li>
              <li>Fais défiler les options vers le bas.</li>
              <li>Sélectionne <strong>"Sur l'écran d'accueil"</strong>.</li>
            </ol>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 shadow-xl w-full max-w-xs border border-gray-100 space-y-4">
            <p className="text-xs font-black uppercase tracking-wider text-[#BF6B4E]">Comment installer :</p>
            <ol className="text-xs text-left space-y-3 font-semibold text-gray-600 list-decimal pl-4 leading-relaxed">
              <li>Clique sur les <strong>3 petits points</strong> en haut à droite de Chrome.</li>
              <li>Sélectionne <strong>"Installer l'application"</strong> ou "Ajouter à l'écran d'accueil".</li>
            </ol>
          </div>
        )}
      </div>
    );
  }

  if (!user) return <Login />;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F9F7F2] dark:bg-jungle-deep font-sans text-[#2A3930] dark:text-jungle-cream transition-colors duration-500 overflow-x-hidden">

      {/* ── TOAST ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-8 left-1/2 z-[200] w-[90%] max-w-xs"
          >
            <div className={`px-6 py-4 rounded-[2rem] shadow-2xl flex items-center justify-between gap-3 border border-white/10 ${
              toast.type === 'error'
                ? 'bg-red-600 text-white'
                : toast.type === 'info'
                ? 'bg-[#4A6A5B] text-white'
                : 'bg-[#2A3930] dark:bg-jungle-cream dark:text-jungle-deep text-white'
            }`}>
              <span className="text-sm font-bold">{toast.message}</span>
              <button onClick={() => setToast(null)}><X size={16} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CONFIRM WATER ALL MODAL ── */}
      <AnimatePresence>
        {showConfirmWaterAll && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-[#2A3930]/40 dark:bg-black/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white dark:bg-jungle-green rounded-[3rem] p-8 w-full max-w-sm shadow-2xl text-center space-y-6"
            >
              <div className="w-20 h-20 bg-jungle-cream dark:bg-jungle-deep rounded-full flex items-center justify-center mx-auto text-[#BF6B4E]">
                <Droplets size={40} fill="currentColor" fillOpacity={0.3} className="animate-pulse" />
              </div>
              <h3 className="font-rounded font-black text-2xl dark:text-white">Tout le monde a bu ?</h3>
              <div className="flex flex-col gap-3">
                <button onClick={waterAllThirsty} className="w-full bg-[#BF6B4E] text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-all">
                  Oui, c'est fait !
                </button>
                <button onClick={() => setShowConfirmWaterAll(false)} className="w-full bg-gray-100 dark:bg-jungle-deep text-gray-400 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest">
                  Plus tard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="p-6 max-w-md mx-auto pt-6 pb-32">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-start mb-8 relative z-[60]">
          <div>
            <h1 className="font-rounded font-black text-4xl tracking-tight text-left dark:text-white">Ma Jungle</h1>
            <p className="text-[#8A9A5B] dark:text-jungle-sage font-bold text-sm mt-1 uppercase tracking-widest text-left opacity-80 flex items-center gap-1.5">
              {plants.length} amie{plants.length > 1 ? 's' : ''} à chérir
              {weatherFactor !== 1 && (
                <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-[#8A9A5B]/10 dark:bg-jungle-cream/10 text-[#2A3930] dark:text-jungle-cream font-black lowercase normal-case tracking-normal">
                  <CloudSun size={12} className="mr-1" /> météo active
                </span>
              )}
            </p>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-3 bg-white dark:bg-jungle-green text-jungle-sage dark:text-jungle-cream rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm relative z-[70]"
            >
              <Settings size={22} />
            </button>

            <AnimatePresence>
              {showSettings && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40"
                    onClick={() => setShowSettings(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="absolute right-0 top-16 w-64 bg-white dark:bg-jungle-green rounded-[2.2rem] shadow-2xl border border-gray-100 dark:border-white/10 p-3 z-50"
                  >
                    <div className="flex flex-col gap-1">

                      {/* Theme selector */}
                      <p className="text-[9px] font-black text-gray-400 dark:text-jungle-sage uppercase tracking-[0.2em] px-4 pt-2 pb-1 text-left">Apparence</p>
                      <div className="grid grid-cols-3 gap-1 px-2 pb-2">
                        {[
                          { id: 'light', icon: <Sun size={16} />, label: 'Clair' },
                          { id: 'auto', icon: <Settings size={16} />, label: 'Auto' },
                          { id: 'dark', icon: <Moon size={16} />, label: 'Sombre' },
                        ].map((mode) => (
                          <button
                            key={mode.id}
                            onClick={() => setThemeChoice(mode.id)}
                            className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${
                              themeChoice === mode.id
                                ? 'bg-[#2A3930] dark:bg-jungle-cream text-white dark:text-jungle-deep shadow-lg'
                                : 'hover:bg-jungle-cream dark:hover:bg-white/5 text-gray-400'
                            }`}
                          >
                            {mode.icon}
                            <span className="text-[8px] font-bold uppercase">{mode.label}</span>
                          </button>
                        ))}
                      </div>

                      <div className="h-px bg-gray-100 dark:bg-white/5 my-1 mx-2" />

                      {/* ── Notification toggle button ── */}
                      <button
                        onClick={() => { handleNotificationToggle(); setShowSettings(false); }}
                        disabled={notifLoading}
                        className="flex items-center gap-3 p-4 hover:bg-jungle-cream dark:hover:bg-white/5 rounded-2xl transition-colors text-left disabled:opacity-60"
                      >
                        <div className={`p-2 rounded-xl transition-colors ${notifButtonColor()}`}>
                          {notifButtonIcon()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-widest dark:text-white">
                            Notifications
                          </span>
                          <span className="text-[9px] text-gray-400 dark:text-jungle-sage font-medium mt-0.5">
                            {notifButtonLabel()}
                          </span>
                        </div>
                        {notifEnabled && notifPermission === 'granted' && (
                          <div className="ml-auto w-2 h-2 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
                        )}
                      </button>

                      <div className="h-px bg-gray-100 dark:bg-white/5 my-1 mx-2" />

                      {/* Sign out */}
                      <button
                        onClick={() => auth.signOut()}
                        className="flex items-center gap-3 p-4 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-colors text-left text-[#BF6B4E]"
                      >
                        <div className="p-2 bg-red-50 dark:bg-red-500/10 rounded-xl">
                          <LogOut size={18} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Déconnexion</span>
                      </button>

                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── MISSION ARROSAGE ── */}
        <AnimatePresence>
          {thirstyPlants.length > 0 && (
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 250, damping: 25 }}
              className="mb-10 bg-[#2A3930] dark:bg-jungle-green text-white rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10"
            >
              <div className="p-6">
                <div className="flex justify-between items-start relative z-20 mb-4">
                  <div className="flex-1 cursor-pointer" onClick={() => setIsMissionExpanded(!isMissionExpanded)}>
                    <motion.h3 layout="position" className="font-rounded font-black text-xl text-left">Mission Arrosage</motion.h3>
                    <motion.p layout="position" className="text-[#BF6B4E] text-[10px] font-black uppercase tracking-widest text-left">
                      {thirstyPlants.length} SOS détecté{thirstyPlants.length > 1 ? 's' : ''}
                    </motion.p>
                  </div>
                  <motion.button
                    animate={{ rotate: isMissionExpanded ? 180 : 0 }}
                    onClick={() => setIsMissionExpanded(!isMissionExpanded)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <ChevronDown size={20} />
                  </motion.button>
                </div>

                <motion.div layout>
                  <AnimatePresence mode="wait">
                    {!isMissionExpanded ? (
                      <motion.div
                        key="folded"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex items-center justify-between pt-2"
                      >
                        <div className="flex -space-x-4">
                          {thirstyPlants.slice(0, 4).map((p, i) => (
                            <motion.div
                              key={p.id} layoutId={`box-${p.id}`}
                              className="relative w-14 h-14 rounded-2xl overflow-hidden border-[3px] border-[#2A3930] dark:border-jungle-green shadow-lg"
                              style={{ zIndex: 10 - i }}
                            >
                              <motion.img layoutId={`img-${p.id}`} src={p.imageUrl} className="w-full h-full object-cover" />
                            </motion.div>
                          ))}
                        </div>
                        <motion.button
                          layoutId="water-master-btn"
                          onClick={(e) => { e.stopPropagation(); setShowConfirmWaterAll(true); }}
                          className="bg-[#BF6B4E] w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center shrink-0"
                        >
                          <motion.div layout="position"><Droplets size={22} fill="currentColor" fillOpacity={0.3} /></motion.div>
                        </motion.button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="expanded"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="space-y-3"
                      >
                        <div className="pt-4 border-t border-white/5 space-y-3">
                          {thirstyPlants.map((p) => (
                            <motion.div
                              key={p.id} layoutId={`box-${p.id}`}
                              className="flex items-center justify-between bg-white/5 h-16 rounded-2xl border border-white/5 overflow-hidden"
                            >
                              <div className="flex items-center h-full gap-4">
                                <div className="h-full w-16 flex-shrink-0">
                                  <motion.img layoutId={`img-${p.id}`} src={p.imageUrl} className="h-full w-full object-cover" />
                                </div>
                                <motion.p
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1, transition: { delay: 0.2 } }}
                                  className="font-bold text-sm truncate max-w-[120px]"
                                >
                                  {p.name}
                                </motion.p>
                              </div>
                              <button
                                onClick={() => handleWatering(p.id, p.name)}
                                className="bg-white/10 p-2.5 rounded-xl mr-3 active:bg-[#BF6B4E] transition-colors"
                              >
                                <Droplets size={16} />
                              </button>
                            </motion.div>
                          ))}
                          <motion.button
                            layoutId="water-master-btn"
                            onClick={() => setShowConfirmWaterAll(true)}
                            className="w-full mt-2 bg-[#BF6B4E] py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"
                          >
                            <Droplets size={16} fill="currentColor" fillOpacity={0.3} />
                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.2 } }}>
                              Tout arroser maintenant
                            </motion.span>
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── FILTERS & SEARCH ── */}
        <div className="sticky top-4 z-40 space-y-4 mb-8">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
            <input
              type="text" placeholder="Chercher une plante..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-4 pl-12 rounded-[1.5rem] bg-white dark:bg-jungle-green dark:text-white shadow-sm outline-none text-sm focus:ring-2 focus:ring-[#8A9A5B]/20 transition-all"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => setActiveRoom('all')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeRoom === 'all' ? 'bg-[#2A3930] dark:bg-jungle-cream dark:text-jungle-deep text-white shadow-lg' : 'bg-white dark:bg-jungle-green text-gray-400'}`}
            >
              Tout
            </button>
            {ROOMS.map(room => (
              <button
                key={room.id} onClick={() => setActiveRoom(room.id)}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeRoom === room.id ? 'bg-[#2A3930] dark:bg-jungle-cream dark:text-jungle-deep text-white shadow-lg' : 'bg-white dark:bg-jungle-green text-gray-400'}`}
              >
                {room.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── PLANT LIST ── */}
        <motion.div layout className="grid grid-cols-1 gap-8">
          {filteredPlants.map(plant => (
            <motion.div
              layout key={plant.id}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              onClick={() => setSelectedPlant(plant)}
              className="cursor-pointer"
            >
              <PlantCard plant={plant} onWater={() => handleWatering(plant.id, plant.name)} onEdit={setEditingPlant} />
            </motion.div>
          ))}
        </motion.div>

        {/* ── FAB ── */}
        <div className="fixed bottom-8 left-0 right-0 flex justify-center z-50 pointer-events-none">
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setShowAdd(true)}
            className="bg-[#2A3930] dark:bg-jungle-cream dark:text-jungle-deep text-white px-8 py-5 rounded-[2.2rem] text-[10px] uppercase tracking-[0.25em] font-black flex items-center gap-3 shadow-2xl pointer-events-auto border border-white/10"
          >
            <Plus size={18} strokeWidth={4} /> Ajouter
          </motion.button>
        </div>

        {/* ── MODALS ── */}
        {selectedPlant && <PlantDetails plant={selectedPlant} onClose={() => setSelectedPlant(null)} onEdit={setEditingPlant} />}
        {showAdd && <AddPlant onSave={() => { setShowAdd(false); showToast('Amie ajoutée !'); }} onCancel={() => setShowAdd(false)} />}
        {editingPlant && <AddPlant editPlant={editingPlant} onSave={() => { setEditingPlant(null); showToast('Modifiée !', 'info'); }} onCancel={() => setEditingPlant(null)} />}

      </main>
    </div>
  );
}

export default App;