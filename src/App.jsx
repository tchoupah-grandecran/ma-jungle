import { useState, useEffect } from 'react';
import { db, auth } from './services/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { addDays } from 'date-fns';
import { useAuth } from './hooks/useAuth';
import { ROOMS } from './utils/constants';
import { getMessaging, getToken } from 'firebase/messaging';
import { motion, AnimatePresence } from 'framer-motion';

// Icones
import { 
  Search, Bell, BellOff, LogOut, Plus, Droplets, 
  Sprout, X, ChevronDown, Moon, Sun, Settings 
} from 'lucide-react';

// Import des composants
import Login from './pages/Login';
import AddPlant from './components/AddPlant';
import PlantCard from './components/PlantCard';
import PlantDetails from './components/PlantDetails';

const FAMILY_ID = "NOTRE_JUNGLE_PARTAGEE";

function App() {
  const { user, loading } = useAuth();
  
  // GESTION DU THÈME PERSISTANT (3 ÉTATS)
  const [themeChoice, setThemeChoice] = useState(() => {
    return localStorage.getItem('theme-preference') || 'auto';
  });

  const [showSettings, setShowSettings] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingPlant, setEditingPlant] = useState(null);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [plants, setPlants] = useState([]);
  const [notifPermission, setNotifPermission] = useState(Notification.permission);
  const [activeRoom, setActiveRoom] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [showConfirmWaterAll, setShowConfirmWaterAll] = useState(false);
  const [isMissionExpanded, setIsMissionExpanded] = useState(false);
  const [toast, setToast] = useState(null);

  // LOGIQUE D'APPLICATION DU THÈME
  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = () => {
      if (themeChoice === 'auto') {
        const isDarkSystem = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('dark', isDarkSystem);
      } else {
        root.classList.toggle('dark', themeChoice === 'dark');
      }
    };

    applyTheme();
    localStorage.setItem('theme-preference', themeChoice);

    if (themeChoice === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeChoice]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "plants"), where("familyId", "==", FAMILY_ID));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const plantsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sorted = plantsData.sort((a, b) => {
        const nextA = addDays(new Date(a.lastWatering), a.frequency);
        const nextB = addDays(new Date(b.lastWatering), b.frequency);
        return nextA - nextB;
      });
      setPlants(sorted);
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const thirstyPlants = plants.filter(p => {
    const nextWaterDate = addDays(new Date(p.lastWatering), p.frequency);
    return nextWaterDate <= new Date(); 
  });

  const filteredPlants = plants.filter(plant => {
    const matchesRoom = activeRoom === 'all' || plant.room === activeRoom;
    const matchesSearch = (plant.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRoom && matchesSearch;
  });

  const handleWatering = async (id, name) => {
    const now = new Date().toISOString();
    try {
      await updateDoc(doc(db, "plants", id), { 
        lastWatering: now,
        history: arrayUnion(now)
      });
      if (name) setToast({ message: `${name} a bien été arrosée ! 🌿`, type: 'success' });
    } catch (error) { console.error(error); }
  };

  const waterAllThirsty = async () => {
    const count = thirstyPlants.length;
    await Promise.all(thirstyPlants.map(plant => handleWatering(plant.id)));
    setShowConfirmWaterAll(false);
    setIsMissionExpanded(false);
    setToast({ message: `${count} plantes arrosées ! ✨`, type: 'success' });
  };

  const handleNotificationRequest = async () => {
    try {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission === 'granted') {
        const messaging = getMessaging();
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          const token = await getToken(messaging, { 
            vapidKey: 'TON_VAPID_KEY',
            serviceWorkerRegistration: registration 
          });
          if (token) {
            await setDoc(doc(db, "users", user.uid), { fcmToken: token }, { merge: true });
          }
        }
      }
    } catch (error) { console.error(error); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F7F2] dark:bg-jungle-deep transition-colors duration-500">
      <Sprout className="animate-bounce text-[#2A3930] dark:text-jungle-cream" size={40} />
    </div>
  );

  if (!user) return <Login />;

  return (
    <div className="min-h-screen bg-[#F9F7F2] dark:bg-jungle-deep font-sans text-[#2A3930] dark:text-jungle-cream transition-colors duration-500 overflow-x-hidden">
      
      {/* TOAST ANIMÉ */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-8 left-1/2 z-[200] w-[90%] max-w-xs"
          >
            <div className="bg-[#2A3930] dark:bg-jungle-cream dark:text-jungle-deep text-white px-6 py-4 rounded-[2rem] shadow-2xl flex items-center justify-between gap-3 border border-white/10">
              <span className="text-sm font-bold">{toast.message}</span>
              <button onClick={() => setToast(null)}><X size={16} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALE CONFIRMATION */}
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
                <button onClick={waterAllThirsty} className="w-full bg-[#BF6B4E] text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-all">Oui, c'est fait !</button>
                <button onClick={() => setShowConfirmWaterAll(false)} className="w-full bg-gray-100 dark:bg-jungle-deep text-gray-400 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Plus tard</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="p-6 max-w-md mx-auto pt-6 pb-32">
        {/* HEADER */}
        <div className="flex justify-between items-start mb-8 relative z-[60]">
          <div>
            <h1 className="font-rounded font-black text-4xl tracking-tight text-left dark:text-white">Ma Jungle</h1>
            <p className="text-[#8A9A5B] dark:text-jungle-sage font-bold text-sm mt-1 uppercase tracking-widest text-left opacity-80">
              {plants.length} amie{plants.length > 1 ? 's' : ''} à chérir
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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
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
                      {/* SÉLECTEUR DE THÈME À 3 CHOIX */}
                      <p className="text-[9px] font-black text-gray-400 dark:text-jungle-sage uppercase tracking-[0.2em] px-4 pt-2 pb-1 text-left">Apparence</p>
                      <div className="grid grid-cols-3 gap-1 px-2 pb-2">
                        {[
                          { id: 'light', icon: <Sun size={16} />, label: 'Clair' },
                          { id: 'auto', icon: <Settings size={16} />, label: 'Auto' },
                          { id: 'dark', icon: <Moon size={16} />, label: 'Sombre' }
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
                      
                      <button 
                        onClick={() => { handleNotificationRequest(); setShowSettings(false); }}
                        className="flex items-center gap-3 p-4 hover:bg-jungle-cream dark:hover:bg-white/5 rounded-2xl transition-colors text-left"
                      >
                        <div className={`p-2 rounded-xl ${notifPermission === 'granted' ? 'bg-green-50 dark:bg-green-500/10 text-green-600' : 'bg-jungle-cream dark:bg-jungle-deep text-gray-400'}`}>
                          {notifPermission === 'granted' ? <Bell size={18} /> : <BellOff size={18} />}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest dark:text-white">Notifications</span>
                      </button>
                      
                      <div className="h-px bg-gray-100 dark:bg-white/5 my-1 mx-2" />
                      
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

{/* MISSION ARROSAGE */}
<AnimatePresence>
  {thirstyPlants.length > 0 && (
    <motion.div 
      layout
      transition={{ type: "spring", stiffness: 250, damping: 25 }}
      className="mb-10 bg-[#2A3930] dark:bg-jungle-green text-white rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10"
    >
      <div className="p-6">
        {/* HEADER */}
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
              /* --- MODE PLIÉ --- */
              <motion.div 
                key="folded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between pt-2"
              >
                <div className="flex -space-x-4">
                  {thirstyPlants.slice(0, 4).map((p, i) => (
                    <motion.div 
                      key={p.id}
                      layoutId={`box-${p.id}`}
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
              /* --- MODE DÉPLIÉ --- */
              <motion.div 
                key="expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <div className="pt-4 border-t border-white/5 space-y-3">
                  {thirstyPlants.map((p) => (
                    <motion.div 
                      key={p.id} 
                      layoutId={`box-${p.id}`}
                      className="flex items-center justify-between bg-white/5 h-16 rounded-2xl border border-white/5 overflow-hidden"
                    >
                      <div className="flex items-center h-full gap-4">
                        {/* IMAGE BORD À BORD */}
                        <div className="h-full w-16 flex-shrink-0">
                          <motion.img 
                            layoutId={`img-${p.id}`} 
                            src={p.imageUrl} 
                            className="h-full w-full object-cover" 
                          />
                        </div>
                        <motion.p 
                          initial={{ opacity: 0 }} 
                          animate={{ opacity: 1, transition: { delay: 0.2 } }} 
                          className="font-bold text-sm truncate max-w-[120px]"
                        >
                          {p.name}
                        </motion.p>
                      </div>
                      
                      {/* Bouton d'arrosage individuel décalé un peu de la droite */}
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

        {/* FILTRES & RECHERCHE */}
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

        {/* LISTE */}
        <motion.div layout className="grid grid-cols-1 gap-8">
          {filteredPlants.map(plant => (
            <motion.div 
              layout
              key={plant.id} 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setSelectedPlant(plant)} 
              className="cursor-pointer"
            >
              <PlantCard plant={plant} onWater={() => handleWatering(plant.id, plant.name)} onEdit={setEditingPlant} />
            </motion.div>
          ))}
        </motion.div>

        {/* BARRE FLOTTANTE */}
        <div className="fixed bottom-8 left-0 right-0 flex justify-center z-50 pointer-events-none">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAdd(true)} 
            className="bg-[#2A3930] dark:bg-jungle-cream dark:text-jungle-deep text-white px-8 py-5 rounded-[2.2rem] text-[10px] uppercase tracking-[0.25em] font-black flex items-center gap-3 shadow-2xl pointer-events-auto border border-white/10"
          >
            <Plus size={18} strokeWidth={4} /> Ajouter
          </motion.button>
        </div>

        {/* MODALES */}
        {selectedPlant && <PlantDetails plant={selectedPlant} onClose={() => setSelectedPlant(null)} onEdit={setEditingPlant} />}
        {showAdd && <AddPlant onSave={() => { setShowAdd(false); setToast({message: "Amie ajoutée !", type: 'success'}); }} onCancel={() => setShowAdd(false)} />}
        {editingPlant && <AddPlant editPlant={editingPlant} onSave={() => { setEditingPlant(null); setToast({message: "Modifiée !", type: 'info'}); }} onCancel={() => setEditingPlant(null)} />}
      </main>
    </div>
  );
}

export default App;