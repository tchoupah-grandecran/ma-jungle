import { useState, useEffect } from 'react';
import { db, auth } from './services/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { addDays } from 'date-fns';
import { useAuth } from './hooks/useAuth';
import { ROOMS } from './utils/constants';
import { getMessaging, getToken } from 'firebase/messaging';

// Icones
import { Search, Bell, BellOff, LogOut, Plus, Droplets, CheckCircle2, Sprout } from 'lucide-react';

// Import des composants
import Login from './pages/Login';
import AddPlant from './components/AddPlant';
import PlantCard from './components/PlantCard';
import PlantDetails from './components/PlantDetails';

// ID de votre foyer pour le partage
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

  useEffect(() => {
    if (!user) return;
    
    // Récupération des plantes appartenant à la famille
    const q = query(collection(db, "plants"), where("familyId", "==", FAMILY_ID));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const plantsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Tri : Priorité aux plantes qui ont soif (date d'arrosage la plus ancienne en premier)
      const sorted = plantsData.sort((a, b) => {
        const nextA = addDays(new Date(a.lastWatering), a.frequency);
        const nextB = addDays(new Date(b.lastWatering), b.frequency);
        return nextA - nextB;
      });
      setPlants(sorted);
    });
    return unsubscribe;
  }, [user]);

  // Calcul des plantes ayant soif (aujourd'hui ou en retard)
  const thirstyPlants = plants.filter(p => {
    const nextWaterDate = addDays(new Date(p.lastWatering), p.frequency);
    return nextWaterDate <= new Date(); 
  });

  // Filtres (Pièce + Recherche)
  const filteredPlants = plants.filter(plant => {
    const matchesRoom = activeRoom === 'all' || plant.room === activeRoom;
    const matchesSearch = (plant.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRoom && matchesSearch;
  });

  const handleWatering = async (id) => {
    const now = new Date().toISOString();
    try {
      await updateDoc(doc(db, "plants", id), { 
        lastWatering: now,
        history: arrayUnion(now)
      });
    } catch (error) { 
      console.error("Erreur lors de l'arrosage :", error); 
    }
  };

  const waterAllThirsty = async () => {
    if (thirstyPlants.length === 0) return;
    if (window.confirm(`Confirmer l'arrosage des ${thirstyPlants.length} plantes assoiffées ?`)) {
      await Promise.all(thirstyPlants.map(plant => handleWatering(plant.id)));
    }
  };

  const handleNotificationRequest = async () => {
    try {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission === 'granted') {
        const messaging = getMessaging();
        const token = await getToken(messaging, { 
          vapidKey: 'VOTRE_CLE_VAPID_ICI' 
        });
        if (token) {
          await setDoc(doc(db, "users", user.uid), {
            fcmToken: token,
            email: user.email,
            familyId: FAMILY_ID,
            lastActive: new Date().toISOString()
          }, { merge: true });
        }
      }
    } catch (error) { 
      console.error("Erreur notifications :", error); 
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-jungle-cream">
      <Sprout className="animate-bounce text-jungle-green" size={40} />
    </div>
  );

  if (!user) return <Login />;

  return (
    <div className="min-h-screen bg-jungle-cream font-sans text-jungle-green selection:bg-jungle-sage/20">
      <main className="p-6 max-w-md mx-auto pt-6 pb-32 text-left">
        
        {/* HEADER */}
        <div className="flex justify-between items-start mb-8 text-left">
          <div className="text-left">
            <h1 className="font-rounded font-bold text-4xl tracking-tight text-left">Ma Jungle</h1>
            <p className="text-jungle-sage font-bold text-sm mt-1 text-left">
              {plants.length} {plants.length > 1 ? 'plantes' : 'plante'}
            </p>
          </div>
          <div className="flex gap-2">
             <button 
              onClick={handleNotificationRequest} 
              className={`p-3 rounded-2xl transition-all ${notifPermission === 'granted' ? 'bg-white text-jungle-sage shadow-sm' : 'bg-white/50 text-gray-300'}`}
            >
              {notifPermission === 'granted' ? <Bell size={20} fill="currentColor" fillOpacity={0.1} /> : <BellOff size={20} />}
            </button>
            <button 
              onClick={() => auth.signOut()} 
              className="p-3 bg-white rounded-2xl text-jungle-terracotta shadow-sm hover:bg-red-50 active:scale-95 transition-all"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* MISSION DU JOUR */}
        {thirstyPlants.length > 0 && (
          <div className="mb-10 bg-jungle-green text-white rounded-[2.5rem] p-6 shadow-2xl shadow-jungle-green/20 relative overflow-hidden text-left">
            <div className="relative z-10 text-left">
              <div className="flex justify-between items-center mb-6 text-left">
                <div className="text-left">
                  <h3 className="font-rounded font-bold text-xl text-left">Mission Arrosage</h3>
                  <p className="text-jungle-terracotta text-xs font-black uppercase tracking-wider mt-1 text-left">
                    {thirstyPlants.length === 1 
                      ? "1 SOS détecté" 
                      : `${thirstyPlants.length} SOS détectés`
                    }
                  </p>
                </div>
                <button 
                  onClick={waterAllThirsty} 
                  className="bg-jungle-terracotta text-white p-3.5 rounded-2xl shadow-lg active:scale-95 transition-all"
                >
                  <CheckCircle2 size={22} />
                </button>
              </div>
              
              <div className="flex -space-x-3 overflow-hidden text-left">
                {thirstyPlants.slice(0, 5).map(p => (
                  <img key={p.id} src={p.imageUrl} className="inline-block h-12 w-12 rounded-2xl ring-4 ring-jungle-green object-cover" alt={p.name} />
                ))}
                {thirstyPlants.length > 5 && (
                  <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-jungle-sage ring-4 ring-jungle-green text-xs font-bold text-jungle-green">
                    +{thirstyPlants.length - 5}
                  </div>
                )}
              </div>
            </div>
            <Droplets className="absolute -right-4 -bottom-4 text-white/5" size={120} />
          </div>
        )}

        {/* RECHERCHE & FILTRES */}
        <div className="sticky top-4 z-40 space-y-4 mb-8">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Chercher une plante..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full p-4 pl-12 rounded-[1.5rem] bg-white/80 backdrop-blur-md border border-white shadow-sm outline-none text-sm font-medium" 
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            <button 
              onClick={() => setActiveRoom('all')} 
              className={`px-6 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeRoom === 'all' ? 'bg-jungle-green text-white shadow-lg' : 'bg-white text-gray-400 shadow-sm'}`}
            >
              Tout
            </button>
            {ROOMS.map(room => {
              const Icon = room.icon;
              return (
                <button 
                  key={room.id} 
                  onClick={() => setActiveRoom(room.id)} 
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${activeRoom === room.id ? 'bg-jungle-green text-white shadow-lg' : 'bg-white text-gray-400 shadow-sm'}`}
                >
                  <Icon size={14} />
                  {room.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* LISTE DES PLANTES */}
        <div className="grid grid-cols-1 gap-8 text-left">
          {filteredPlants.map(plant => (
            <div key={plant.id} onClick={() => setSelectedPlant(plant)}>
              <PlantCard plant={plant} onWater={handleWatering} onEdit={setEditingPlant} />
            </div>
          ))}
          {filteredPlants.length === 0 && (
            <p className="text-center text-gray-400 font-medium mt-10 italic">Aucune plante trouvée ici.</p>
          )}
        </div>

        {/* BARRE D'ACTION FLOTTANTE */}
        <div className="fixed bottom-8 left-0 right-0 flex justify-center z-50 pointer-events-none">
          <button 
            onClick={() => setShowAdd(true)} 
            className="bg-jungle-green text-white px-8 py-4 rounded-[2rem] text-sm font-bold flex items-center gap-3 active:scale-95 transition-all shadow-2xl shadow-jungle-green/40 pointer-events-auto border border-white/20"
          >
            <Plus size={20} strokeWidth={3} /> 
            Ajouter
          </button>
        </div>

        {showAdd && <AddPlant onSave={() => setShowAdd(false)} onCancel={() => setShowAdd(false)} />}
        {editingPlant && <AddPlant editPlant={editingPlant} onSave={() => setEditingPlant(null)} onCancel={() => setEditingPlant(null)} />}
        {selectedPlant && <PlantDetails plant={selectedPlant} onClose={() => setSelectedPlant(null)} />}
      </main>
    </div>
  );
}

export default App;