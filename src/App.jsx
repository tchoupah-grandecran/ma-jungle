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

function App() {
  const { user, loading } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [editingPlant, setEditingPlant] = useState(null);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [plants, setPlants] = useState([]);
  const [notifPermission, setNotifPermission] = useState(Notification.permission);
  const [activeRoom, setActiveRoom] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // --- DONNÉES DE TEST TEMPORAIRES ---
  const testPlants = [
    {
      id: 'test-today',
      name: "Soif Aujourd'hui",
      variety: "Test Arrosage Urgent",
      imageUrl: "https://images.unsplash.com/photo-1545239351-ef35f43d514b?q=80&w=1000&auto=format&fit=crop",
      room: "salon",
      spot: "Fenêtre Sud",
      frequency: 7,
      lastWatering: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString(),
      waterType: 'douche',
      waterAmount: 3,
      history: [],
      notes: []
    },
    {
      id: 'test-tomorrow',
      name: "Soif Demain",
      variety: "Test Arrosage Futur",
      imageUrl: "https://images.unsplash.com/photo-1453904300235-0f2f60b15b5d?q=80&w=1000&auto=format&fit=crop",
      room: "bureau",
      spot: "Étagère",
      frequency: 7,
      lastWatering: new Date(new Date().setDate(new Date().getDate() - 6)).toISOString(),
      waterType: 'bain',
      waterAmount: 5,
      history: [],
      notes: []
    }
  ];

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "plants"), where("userId", "==", user.uid));
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

  // Fusion des plantes réelles et des tests pour les calculs globaux
  const allPlants = [...testPlants, ...plants];

  const thirstyPlants = allPlants.filter(p => {
    const nextWaterDate = addDays(new Date(p.lastWatering), p.frequency);
    return nextWaterDate <= new Date(); 
  });

  const filteredPlants = allPlants.filter(plant => {
    const matchesRoom = activeRoom === 'all' || plant.room === activeRoom;
    const matchesSearch = (plant.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRoom && matchesSearch;
  });

  const handleWatering = async (id) => {
    // Empêche l'erreur si on clique sur une plante de test
    if (id.startsWith('test-')) {
      console.log("Arrosage d'une plante de test simulé");
      return;
    }
    const now = new Date().toISOString();
    try {
      await updateDoc(doc(db, "plants", id), { 
        lastWatering: now,
        history: arrayUnion(now)
      });
    } catch (error) {
      console.error(error);
    }
  };

  const waterAllThirsty = async () => {
    const realThirsty = thirstyPlants.filter(p => !p.id.startsWith('test-'));
    if (realThirsty.length === 0) {
      alert("Seules les plantes de test ont soif !");
      return;
    }
    if (window.confirm(`Arroser les ${realThirsty.length} plantes réelles ?`)) {
      await Promise.all(realThirsty.map(plant => handleWatering(plant.id)));
    }
  };

  const handleNotificationRequest = async () => {
  try {
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);

    if (permission === 'granted') {
      const messaging = getMessaging();
      
      // Récupération du Token
      const token = await getToken(messaging, { 
        vapidKey: 'BJ_ta6RLynMO3OswuqxOqO89PRTfGMKhKAeI2C3WiOBNvCN5P3EwngLbjwuyvsgwgFxtjt6GnXIsr6hfg18FZtw' // <--- TA CLÉ ICI
      });

      if (token) {
        console.log("Token FCM récupéré :", token);

        // Référence vers le document de l'utilisateur (ID = UID de Google)
        const userRef = doc(db, "users", user.uid);

        // setDoc avec merge: true crée le doc s'il n'existe pas 
        // ou ajoute juste le token s'il existe déjà.
        await setDoc(userRef, {
          fcmToken: token,
          email: user.email,
          displayName: user.displayName,
          lastActive: new Date().toISOString()
        }, { merge: true });

        alert("Notifications configurées avec succès !");
      }
    }
  } catch (error) {
    console.error("Erreur lors de la configuration des notifications :", error);
    alert("Impossible d'activer les notifications. Vérifie la console.");
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
      
      <main className="p-6 max-w-md mx-auto pt-12 pb-32">
        
        {/* --- HEADER --- */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="font-rounded font-bold text-4xl tracking-tight">Ma Jungle</h1>
            <p className="text-jungle-sage font-bold text-sm mt-1">
              {allPlants.length} plantes au total
            </p>
          </div>
          <div className="flex gap-2">
             <button 
              onClick={handleNotificationRequest} 
              className={`p-3 rounded-2xl transition-all ${notifPermission === 'granted' ? 'bg-white text-jungle-sage' : 'bg-white/50 text-gray-300'}`}
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

        {/* --- MISSION DU JOUR --- */}
{thirstyPlants.length > 0 && (
  <div className="mb-10 bg-jungle-green text-white rounded-[2.5rem] p-6 shadow-2xl shadow-jungle-green/20 relative overflow-hidden">
    <div className="relative z-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-rounded font-bold text-xl">Mission Arrosage</h3>
          <p className="text-jungle-terracotta text-xs font-black uppercase tracking-wider mt-1">
            {thirstyPlants.length === 1 
              ? "1 plante a soif" 
              : `${thirstyPlants.length} plantes ont soif`
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
      
      <div className="flex -space-x-3 overflow-hidden mb-2">
        {thirstyPlants.slice(0, 5).map(p => (
          <img key={p.id} src={p.imageUrl} className="inline-block h-12 w-12 rounded-2xl ring-4 ring-jungle-green object-cover" alt="" />
        ))}
        {thirstyPlants.length > 5 && (
          <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-jungle-sage ring-4 ring-jungle-green text-xs font-bold text-jungle-green">
            +{thirstyPlants.length - 5}
          </div>
        )}
      </div>
    </div>
    {/* Décoration en arrière-plan */}
    <Droplets className="absolute -right-4 -bottom-4 text-white/5" size={120} />
  </div>
)}

        {/* --- RECHERCHE & FILTRES --- */}
        <div className="sticky top-4 z-40 space-y-4 mb-8">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-jungle-sage transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Chercher une plante..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full p-4 pl-12 rounded-[1.5rem] bg-white/80 backdrop-blur-md border border-white shadow-sm outline-none text-sm focus:ring-4 focus:ring-jungle-sage/10 transition-all placeholder:text-gray-400 font-medium" 
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

        {/* --- LISTE DES PLANTES --- */}
        <div className="grid grid-cols-1 gap-8">
          {filteredPlants.map(plant => (
            <div key={plant.id} onClick={() => setSelectedPlant(plant)}>
              <PlantCard plant={plant} onWater={handleWatering} onEdit={setEditingPlant} />
            </div>
          ))}
          {filteredPlants.length === 0 && (
            <p className="text-center text-gray-400 font-medium mt-10">Aucune plante trouvée.</p>
          )}
        </div>

        {/* --- BARRE D'ACTION FLOTTANTE --- */}
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