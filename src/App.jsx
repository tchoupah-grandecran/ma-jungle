import { useState, useEffect } from 'react';
import { db, auth } from './services/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { addDays } from 'date-fns';
import { useAuth } from './hooks/useAuth';
import { ROOMS } from './utils/constants';
import { getMessaging, getToken } from 'firebase/messaging';

// Icones
import { Search, Bell, BellOff, LogOut, Plus, Droplets, CheckCircle2, Sprout, X, ChevronDown, ChevronUp } from 'lucide-react';

// Import des composants
import Login from './pages/Login';
import AddPlant from './components/AddPlant';
import PlantCard from './components/PlantCard';
import PlantDetails from './components/PlantDetails';

const FAMILY_ID = "NOTRE_JUNGLE_PARTAGEE";

function App() {
  const { user, loading } = useAuth();
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
    } catch (error) { 
      console.error("Erreur :", error); 
    }
  };

  const waterAllThirsty = async () => {
    const count = thirstyPlants.length;
    await Promise.all(thirstyPlants.map(plant => handleWatering(plant.id)));
    setShowConfirmWaterAll(false);
    setIsMissionExpanded(false);
    setToast({ 
      message: `${count} ${count > 1 ? 'plantes ont été arrosées' : 'plante a été arrosée'} ! ✨`, 
      type: 'success' 
    });
  };

  const handleNotificationRequest = async () => {
    try {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission === 'granted') {
        const messaging = getMessaging();
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) throw new Error("Service Worker non prêt");
        const token = await getToken(messaging, { 
          vapidKey: 'BJ_ta6RLynMO3OswuqxOqO89PRTfGMKhKAeI2C3WiOBNvCN5P3EwngLbjwuyvsgwgFxtjt6GnXIsr6hfg18FZtw',
          serviceWorkerRegistration: registration 
        });
        if (token) {
          await setDoc(doc(db, "users", user.uid), {
            fcmToken: token,
            familyId: FAMILY_ID,
            lastActive: new Date().toISOString()
          }, { merge: true });
          setToast({ message: "Notifications activées !", type: 'info' });
        }
      }
    } catch (error) { 
      setToast({ message: "Erreur activation notifications", type: 'error' });
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F7F2]">
      <Sprout className="animate-bounce text-[#2A3930]" size={40} />
    </div>
  );

  if (!user) return <Login />;

  return (
    <div className="min-h-screen bg-[#F9F7F2] font-sans text-[#2A3930] selection:bg-[#8A9A5B]/20 overflow-x-hidden">
      
      {/* TOAST */}
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-xs animate-in fade-in slide-in-from-top-4 duration-500 ease-out">
          <div className="bg-[#2A3930] text-white px-6 py-4 rounded-[2rem] shadow-2xl flex items-center justify-between gap-3 border border-white/10">
            <span className="text-sm font-bold leading-tight">{toast.message}</span>
            <button onClick={() => setToast(null)} className="shrink-0"><X size={16} /></button>
          </div>
        </div>
      )}

      {/* MODALE CONFIRMATION GLOBALE */}
      {showConfirmWaterAll && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-[#2A3930]/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] p-8 w-full max-w-sm shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300 ease-out">
            <div className="w-20 h-20 bg-[#F9F7F2] rounded-full flex items-center justify-center mx-auto text-[#BF6B4E]">
              <Droplets size={40} fill="currentColor" fillOpacity={0.3} className="animate-pulse" />
            </div>
            <h3 className="font-rounded font-black text-2xl">{"Tout le monde a bu" + "\u00A0" + "?"}</h3>
            <div className="flex flex-col gap-3 text-left">
              <button onClick={waterAllThirsty} className="w-full bg-[#BF6B4E] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#BF6B4E]/20 active:scale-95 transition-all">{"Oui, c'est fait" + "\u00A0" + "!"}</button>
              <button onClick={() => setShowConfirmWaterAll(false)} className="w-full bg-gray-100 text-gray-400 py-4 rounded-2xl font-bold active:scale-95 transition-all text-center uppercase text-[10px] tracking-widest">Plus tard</button>
            </div>
          </div>
        </div>
      )}

      <main className="p-6 max-w-md mx-auto pt-6 pb-32">
        {/* HEADER */}
        <div className="flex justify-between items-start mb-8">
          <div className="animate-in slide-in-from-left duration-700 ease-out">
            <h1 className="font-rounded font-black text-4xl tracking-tight text-left">Ma Jungle</h1>
            <p className="text-[#8A9A5B] font-bold text-sm mt-1 uppercase tracking-widest text-left opacity-80">
              {plants.length} {plants.length > 1 ? 'amies à chérir' : 'amie à chérir'}
            </p>
          </div>
          <div className="flex gap-2 animate-in slide-in-from-right duration-700 ease-out">
            <button onClick={handleNotificationRequest} className={`p-3 rounded-2xl transition-all duration-300 ${notifPermission === 'granted' ? 'bg-white text-[#8A9A5B] shadow-sm' : 'bg-white/50 text-gray-300'}`}>
              {notifPermission === 'granted' ? <Bell size={20} fill="currentColor" fillOpacity={0.1} /> : <BellOff size={20} />}
            </button>
            <button onClick={() => auth.signOut()} className="p-3 bg-white rounded-2xl text-[#BF6B4E] shadow-sm active:scale-90 transition-transform"><LogOut size={20} /></button>
          </div>
        </div>

        {/* MISSION ARROSAGE INTERACTIVE (ANIMATION ORGANIQUE) */}
        {thirstyPlants.length > 0 && (
          <div 
            className={`mb-10 bg-[#2A3930] text-white rounded-[2.5rem] shadow-2xl transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative overflow-hidden group ${isMissionExpanded ? 'ring-8 ring-[#2A3930]/5' : ''}`}
          >
            {/* Header de la mission */}
            <div 
              onClick={() => setIsMissionExpanded(!isMissionExpanded)}
              className="p-6 flex justify-between items-center cursor-pointer relative z-10"
            >
              <div className="space-y-1">
                <h3 className="font-rounded font-black text-xl text-left tracking-tight">Mission Arrosage</h3>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-[#BF6B4E] animate-ping" />
                  <p className="text-[#BF6B4E] text-[10px] font-black uppercase tracking-widest text-left">
                    {thirstyPlants.length === 1 ? "1 SOS détecté" : `${thirstyPlants.length} SOS détectés`}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {!isMissionExpanded && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowConfirmWaterAll(true); }} 
                    className="bg-[#BF6B4E] text-white p-3.5 rounded-2xl shadow-lg active:scale-90 transition-all hover:rotate-6"
                  >
                    <Droplets size={22} />
                  </button>
                )}
                <div className={`p-2 rounded-full bg-white/5 transition-transform duration-500 ${isMissionExpanded ? 'rotate-180' : ''}`}>
                  <ChevronDown size={20} className="text-white/40" />
                </div>
              </div>
            </div>

            {/* Zone de contenu avec transition Grid (pour un effet fluide et sans saccade) */}
            <div className={`grid transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isMissionExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden">
                <div className="p-6 pt-0 space-y-4">
                  <div className="h-px bg-white/10 w-full mb-4" />
                  <div className="space-y-3 max-h-[350px] overflow-y-auto no-scrollbar pr-1">
                    {thirstyPlants.map((p, idx) => (
                      <div 
                        key={p.id} 
                        style={{ transitionDelay: `${idx * 50}ms` }}
                        className={`flex items-center justify-between bg-white/5 p-3 rounded-[1.8rem] border border-white/5 hover:bg-white/10 transition-all duration-500 transform ${isMissionExpanded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
                      >
                        <div className="flex items-center gap-4">
                          <img src={p.imageUrl} className="h-14 w-14 rounded-[1.2rem] object-cover shadow-2xl border border-white/10" alt="" />
                          <div className="text-left">
                            <p className="font-bold text-sm leading-tight text-white/90">{p.name}</p>
                            <p className="text-[9px] text-[#8A9A5B] font-black uppercase tracking-tighter mt-1">{p.room || "Partout"}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleWatering(p.id, p.name)}
                          className="bg-white/10 hover:bg-[#BF6B4E] p-3.5 rounded-2xl transition-all duration-300 group/btn active:scale-90"
                        >
                          <Droplets size={18} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => setShowConfirmWaterAll(true)}
                    className="w-full mt-6 bg-[#BF6B4E] py-4 rounded-[1.8rem] font-black text-[10px] uppercase tracking-[0.25em] shadow-lg shadow-[#BF6B4E]/20 active:scale-[0.98] transition-all"
                  >
                    Valider l'arrosage
                  </button>
                </div>
              </div>
            </div>

            {/* Version "Compacte" affichée uniquement quand fermé */}
            {!isMissionExpanded && (
              <div className="px-6 pb-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
                 <div className="flex -space-x-3 items-center">
                  {thirstyPlants.slice(0, 5).map((p, i) => (
                    <img 
                      key={p.id} 
                      src={p.imageUrl} 
                      style={{ zIndex: 10 - i }}
                      className="h-10 w-10 rounded-[0.8rem] ring-[3px] ring-[#2A3930] object-cover shadow-2xl transition-transform hover:-translate-y-1" 
                      alt="" 
                    />
                  ))}
                  {thirstyPlants.length > 5 && (
                    <div className="h-10 w-10 rounded-[0.8rem] bg-[#3A4D41] ring-[3px] ring-[#2A3930] flex items-center justify-center text-[10px] font-black z-0">
                      +{thirstyPlants.length - 5}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* RECHERCHE & FILTRES */}
        <div className="sticky top-4 z-40 space-y-4 mb-8">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#8A9A5B] transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Chercher une plante..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full p-4 pl-12 rounded-[1.5rem] bg-white shadow-sm outline-none text-sm font-medium focus:ring-2 focus:ring-[#8A9A5B]/20 transition-all" 
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            <button onClick={() => setActiveRoom('all')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeRoom === 'all' ? 'bg-[#2A3930] text-white shadow-lg' : 'bg-white text-gray-400 hover:text-gray-600'}`}>Tout</button>
            {ROOMS.map(room => {
              const Icon = room.icon;
              return (
                <button key={room.id} onClick={() => setActiveRoom(room.id)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeRoom === room.id ? 'bg-[#2A3930] text-white shadow-lg' : 'bg-white text-gray-400 hover:text-gray-600'}`}>
                  <Icon size={14} /> {room.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* LISTE DES PLANTES */}
        <div className="grid grid-cols-1 gap-8 animate-in fade-in duration-1000 slide-in-from-bottom-4">
          {filteredPlants.map(plant => (
            <div key={plant.id} onClick={() => setSelectedPlant(plant)} className="cursor-pointer">
              <PlantCard plant={plant} onWater={() => handleWatering(plant.id, plant.name)} onEdit={setEditingPlant} />
            </div>
          ))}
        </div>

        {/* BARRE D'ACTION FLOTTANTE */}
        <div className="fixed bottom-8 left-0 right-0 flex justify-center z-50 pointer-events-none">
          <button 
            onClick={() => setShowAdd(true)} 
            className="bg-[#2A3930] text-white px-8 py-5 rounded-[2.2rem] text-[10px] uppercase tracking-[0.25em] font-black flex items-center gap-3 active:scale-95 transition-all shadow-2xl pointer-events-auto border border-white/10 hover:bg-[#3A4D41]"
          >
            <Plus size={18} strokeWidth={4} /> Ajouter
          </button>
        </div>

        {/* MODALES */}
        {selectedPlant && (
          <PlantDetails 
            plant={selectedPlant} 
            onClose={() => setSelectedPlant(null)} 
            onEdit={(plant) => setEditingPlant(plant)} 
          />
        )}

        {showAdd && (
          <AddPlant 
            onSave={() => { 
              setShowAdd(false); 
              setToast({message: "Nouvelle amie ajoutée !", type: 'success'}); 
            }} 
            onCancel={() => setShowAdd(false)} 
          />
        )}

        {editingPlant && (
          <AddPlant 
            editPlant={editingPlant} 
            onSave={() => { 
              setEditingPlant(null); 
              setToast({message: "Modifications enregistrées", type: 'info'}); 
            }} 
            onCancel={() => setEditingPlant(null)} 
          />
        )}
      </main>
    </div>
  );
}

export default App;