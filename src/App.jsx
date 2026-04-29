import { useState, useEffect } from 'react';
import { db, auth } from './services/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { addDays } from 'date-fns';
import { useAuth } from './hooks/useAuth';
import { ROOMS } from './utils/constants';
import { getMessaging, getToken } from 'firebase/messaging';

// Icones
import { Search, Bell, BellOff, LogOut, Plus, Droplets, CheckCircle2, Sprout, X } from 'lucide-react';

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

  // NOUVEAUX ÉTATS POUR LES NOTIFICATIONS IN-APP
  const [showConfirmWaterAll, setShowConfirmWaterAll] = useState(false);
  const [toast, setToast] = useState(null); // { message: string, type: 'success' | 'info' }

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

  // Gestion automatique de la disparition du toast
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
      setToast({ message: `${name || 'La plante'} a bien été arrosée ! 🌿`, type: 'success' });
    } catch (error) { 
      console.error("Erreur :", error); 
    }
  };

  const waterAllThirsty = async () => {
    const count = thirstyPlants.length;
    await Promise.all(thirstyPlants.map(plant => handleWatering(plant.id)));
    setShowConfirmWaterAll(false);
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
      
      // On récupère l'enregistrement déjà fait dans main.jsx
      const registration = await navigator.serviceWorker.getRegistration();
      
      if (!registration) {
        throw new Error("Le Service Worker n'est pas encore prêt.");
      }

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
        
        setToast({ message: "Notifications activées" + "\u00A0" + "!", type: 'info' });
      }
    }
  } catch (error) { 
    console.error("Erreur FCM :", error);
    // On affiche l'erreur réelle dans le toast pour débugger
    setToast({ message: `Erreur : ${error.code || 'Vérifie ta connexion'}`, type: 'error' });
  }
};

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F7F2]">
      <Sprout className="animate-bounce text-[#2A3930]" size={40} />
    </div>
  );

  if (!user) return <Login />;

  return (
    <div className="min-h-screen bg-[#F9F7F2] font-sans text-[#2A3930] selection:bg-[#8A9A5B]/20">
      
      {/* TOAST NOTIFICATION IN-APP */}
{toast && (
  <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-xs animate-in fade-in slide-in-from-top-4 duration-300">
    <div className="bg-[#2A3930] text-white px-6 py-4 rounded-[2rem] shadow-2xl flex items-center justify-between gap-3 border border-white/10">
      <span className="text-sm font-bold leading-tight">
        {toast.message}
      </span>
      <button onClick={() => setToast(null)} className="shrink-0 ml-2">
        <X size={16} />
      </button>
    </div>
  </div>
)}

{/* MODALE DE CONFIRMATION ARROSAGE GROUPÉ */}
{showConfirmWaterAll && (
  <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-[#2A3930]/60 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="bg-white rounded-[3rem] p-8 w-full max-w-sm shadow-2xl text-center space-y-6">
      <div className="w-20 h-20 bg-[#F9F7F2] rounded-full flex items-center justify-center mx-auto text-[#BF6B4E]">
        <Droplets size={40} fill="currentColor" />
      </div>
      <div>
        {/* On utilise {"text" + "\u00A0" + "!"} pour forcer l'espace insécable */}
        <h3 className="font-rounded font-black text-2xl">
          {"Tout le monde a bu" + "\u00A0" + "?"}
        </h3>
        <p className="text-gray-500 text-sm mt-2 leading-relaxed px-2">
          {thirstyPlants.length > 1 
            ? `Confirmer l'arrosage des ${thirstyPlants.length} plantes assoiffées` + "\u00A0" + "?"
            : `Confirmer l'arrosage de la plante assoiffée` + "\u00A0" + "?"
          }
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <button 
          onClick={waterAllThirsty}
          className="w-full bg-[#BF6B4E] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#BF6B4E]/20 active:scale-[0.98] transition-all"
        >
          {"Oui, c'est fait" + "\u00A0" + "!"}
        </button>
        <button 
          onClick={() => setShowConfirmWaterAll(false)}
          className="w-full bg-gray-100 text-gray-500 py-4 rounded-2xl font-bold active:scale-[0.98] transition-all"
        >
          Plus tard
        </button>
      </div>
    </div>
  </div>
)}

      <main className="p-6 max-w-md mx-auto pt-6 pb-32 text-left">
        {/* HEADER */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="font-rounded font-black text-4xl tracking-tight">Ma Jungle</h1>
            <p className="text-[#8A9A5B] font-bold text-sm mt-1 uppercase tracking-widest">
              {plants.length} {plants.length > 1 ? 'amies à chérir' : 'amie à chérir'}
            </p>
          </div>
          <div className="flex gap-2">
             <button 
  onClick={handleNotificationRequest} 
  className={`p-3 rounded-2xl transition-all active:scale-[0.95] ${
    notifPermission === 'granted' 
      ? 'bg-white text-[#8A9A5B] shadow-sm' 
      : 'bg-white/50 text-gray-300'
  }`}
  title={notifPermission === 'granted' ? "Notifications actives" : "Activer les notifications"}
>
  {notifPermission === 'granted' ? (
    <Bell size={20} fill="currentColor" fillOpacity={0.1} />
  ) : (
    <BellOff size={20} />
  )}
</button>
            <button onClick={() => auth.signOut()} className="p-3 bg-white rounded-2xl text-[#BF6B4E] shadow-sm hover:bg-red-50 transition-all">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* MISSION DU JOUR */}
        {thirstyPlants.length > 0 && (
          <div className="mb-10 bg-[#2A3930] text-white rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-rounded font-black text-xl">Mission Arrosage</h3>
                  <p className="text-[#BF6B4E] text-[10px] font-black uppercase tracking-widest mt-1">
                    {thirstyPlants.length === 1 ? "1 SOS détecté" : `${thirstyPlants.length} SOS détectés`}
                  </p>
                </div>
                <button 
                  onClick={() => setShowConfirmWaterAll(true)} 
                  className="bg-[#BF6B4E] text-white p-3.5 rounded-2xl shadow-lg active:scale-95 transition-all"
                >
                  <CheckCircle2 size={22} />
                </button>
              </div>
              <div className="flex -space-x-3 overflow-hidden">
                {thirstyPlants.slice(0, 5).map(p => (
                  <img key={p.id} src={p.imageUrl} className="inline-block h-12 w-12 rounded-2xl ring-4 ring-[#2A3930] object-cover shadow-xl" alt={p.name} />
                ))}
              </div>
            </div>
            <Droplets className="absolute -right-4 -bottom-4 text-white/5" size={120} />
          </div>
        )}

        {/* RECHERCHE & FILTRES */}
        <div className="sticky top-4 z-40 space-y-4 mb-8">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
            <input 
              type="text" 
              placeholder="Chercher une plante..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full p-4 pl-12 rounded-[1.5rem] bg-white border-none shadow-sm outline-none text-sm font-medium" 
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            <button 
              onClick={() => setActiveRoom('all')} 
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeRoom === 'all' ? 'bg-[#2A3930] text-white shadow-lg' : 'bg-white text-gray-400'}`}
            >
              Tout
            </button>
            {ROOMS.map(room => {
              const Icon = room.icon;
              return (
                <button 
                  key={room.id} 
                  onClick={() => setActiveRoom(room.id)} 
                  className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeRoom === room.id ? 'bg-[#2A3930] text-white shadow-lg' : 'bg-white text-gray-400'}`}
                >
                  <Icon size={14} /> {room.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* LISTE DES PLANTES */}
        <div className="grid grid-cols-1 gap-8">
          {filteredPlants.map(plant => (
            <div key={plant.id} onClick={() => setSelectedPlant(plant)}>
              <PlantCard 
                plant={plant} 
                onWater={() => handleWatering(plant.id, plant.name)} 
                onEdit={setEditingPlant} 
              />
            </div>
          ))}
        </div>

        {/* BARRE D'ACTION FLOTTANTE */}
        <div className="fixed bottom-8 left-0 right-0 flex justify-center z-50 pointer-events-none">
          <button 
            onClick={() => setShowAdd(true)} 
            className="bg-[#2A3930] text-white px-8 py-4 rounded-[2rem] text-[11px] uppercase tracking-[0.2em] font-black flex items-center gap-3 active:scale-95 transition-all shadow-2xl pointer-events-auto border border-white/10"
          >
            <Plus size={18} strokeWidth={4} /> Ajouter
          </button>
        </div>

        {showAdd && <AddPlant onSave={() => { setShowAdd(false); setToast({message: "Nouvelle amie ajoutée !", type: 'success'}); }} onCancel={() => setShowAdd(false)} />}
        {editingPlant && <AddPlant editPlant={editingPlant} onSave={() => { setEditingPlant(null); setToast({message: "Modifications enregistrées", type: 'info'}); }} onCancel={() => setEditingPlant(null)} />}
        {selectedPlant && <PlantDetails plant={selectedPlant} onClose={() => setSelectedPlant(null)} />}
      </main>
    </div>
  );
}

export default App;