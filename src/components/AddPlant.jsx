import { useState, useEffect } from 'react';
import { db, storage, auth } from '../services/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ROOMS, SPOTS } from '../utils/constants';
import { X, Camera, Loader2, Sprout, MapPin, Home, Droplets, Bath, ShowerHead, CalendarClock } from 'lucide-react';

export default function AddPlant({ onSave, onCancel, editPlant }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    variety: '',
    room: 'salon',
    spot: 'Sol',
    frequency: 7,
    waterType: 'douche',
    waterAmount: 3,
    imageUrl: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (editPlant) {
      setFormData({
        name: editPlant.name,
        variety: editPlant.variety || '',
        room: editPlant.room,
        spot: editPlant.spot,
        frequency: editPlant.frequency,
        waterType: editPlant.waterType || 'douche',
        waterAmount: editPlant.waterAmount || 3,
        imageUrl: editPlant.imageUrl
      });
      setPreviewUrl(editPlant.imageUrl);
    }
  }, [editPlant]);

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  try {
    let finalImageUrl = formData.imageUrl;
    if (imageFile) {
      const storageRef = ref(storage, `plants/${auth.currentUser.uid}/${Date.now()}_${imageFile.name}`);
      const snapshot = await uploadBytes(storageRef, imageFile);
      finalImageUrl = await getDownloadURL(snapshot.ref);
    }

    // On prépare les données à envoyer
    const plantData = {
      name: formData.name,
      variety: formData.variety,
      room: formData.room,
      spot: formData.spot, // Vérifiez bien que c'est 'spot' ici et dans Firebase
      frequency: formData.frequency,
      waterType: formData.waterType,
      waterAmount: formData.waterAmount,
      imageUrl: finalImageUrl,
      updatedAt: new Date().toISOString()
    };

    if (editPlant && editPlant.id) {
      // Pour la modification
      await updateDoc(doc(db, "plants", editPlant.id), plantData);
    } else {
      // Pour la création
      await addDoc(collection(db, "plants"), {
        ...plantData,
        userId: auth.currentUser.uid,
        lastWatering: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
    }
    onSave(); // Cette fonction doit fermer le modal et rafraîchir la liste
  } catch (error) {
    console.error("Erreur lors de la sauvegarde :", error);
    alert("Erreur lors de l'enregistrement");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="fixed inset-0 bg-jungle-green/60 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Container principal sans le bandeau blanc en haut */}
      <div className="bg-jungle-cream w-full max-w-lg rounded-t-[3rem] sm:rounded-[3.5rem] shadow-2xl overflow-hidden relative">
        
        {/* Bouton fermer flottant pour épurer la vue */}
        <button 
          onClick={onCancel} 
          className="absolute top-6 right-6 p-2 bg-white/50 backdrop-blur-sm hover:bg-white rounded-full transition-all z-10"
        >
          <X size={24} className="text-jungle-green" />
        </button>

        <form onSubmit={handleSubmit} className="p-8 pt-12 max-h-[90vh] overflow-y-auto no-scrollbar space-y-6">
          
          <div className="text-center mb-4">
             <h2 className="font-rounded text-3xl text-jungle-green">
                {editPlant ? 'Modifier' : 'Nouvelle amie'}
             </h2>
          </div>

          {/* Section Photo simplifiée */}
          <div className="flex justify-center mb-8">
            <div className="relative w-40 h-40 rounded-[2.5rem] bg-white shadow-xl overflow-hidden border-4 border-white group">
              {previewUrl ? (
                <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-jungle-green/20">
                  <Camera size={40} />
                </div>
              )}
              <input type="file" onChange={(e) => {
                const file = e.target.files[0];
                if(file) { setImageFile(file); setPreviewUrl(URL.createObjectURL(file)); }
              }} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
          </div>

          {/* Nom & Variété */}
          <div className="space-y-3">
            <input 
              placeholder="Nom de la plante..." 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full p-5 rounded-2xl bg-white shadow-sm outline-none font-bold text-lg text-jungle-green placeholder:text-gray-300"
              required 
            />
            <input 
              placeholder="Variété (ex: Monstera Deliciosa)" 
              value={formData.variety} 
              onChange={e => setFormData({...formData, variety: e.target.value})}
              className="w-full p-4 rounded-2xl bg-white shadow-sm outline-none text-sm text-jungle-green placeholder:text-gray-300 italic"
            />
          </div>

          {/* Fréquence d'arrosage (Champ numérique en jours) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-jungle-cream p-2 rounded-xl text-jungle-terracotta">
                <CalendarClock size={20} />
              </div>
              <span className="text-[10px] font-bold text-jungle-green uppercase tracking-widest">Arrosage tous les...</span>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="number"
                min="1"
                max="365"
                value={formData.frequency}
                onChange={e => setFormData({...formData, frequency: parseInt(e.target.value) || 1})}
                className="w-16 p-2 rounded-xl bg-jungle-cream text-center font-bold text-jungle-terracotta outline-none focus:ring-2 focus:ring-jungle-terracotta/20"
              />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">jours</span>
            </div>
          </div>

          {/* Type d'arrosage (Toggle Terracotta) */}
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm">
            <button 
              type="button"
              onClick={() => setFormData({...formData, waterType: 'douche'})}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all ${formData.waterType === 'douche' ? 'bg-jungle-terracotta text-white shadow-lg' : 'text-gray-400'}`}
            >
              <ShowerHead size={18} /> <span className="text-[11px] font-bold uppercase tracking-wider">Classique</span>
            </button>
            <button 
              type="button"
              onClick={() => setFormData({...formData, waterType: 'bain'})}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all ${formData.waterType === 'bain' ? 'bg-jungle-terracotta text-white shadow-lg' : 'text-gray-400'}`}
            >
              <Bath size={18} /> <span className="text-[11px] font-bold uppercase tracking-wider">Trempage</span>
            </button>
          </div>

          {/* Quantité d'eau (Gouttes Terracotta) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
            <span className="text-[10px] font-bold text-jungle-green uppercase tracking-widest">Quantité nécessaire</span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map(num => (
                <button 
                  key={num} type="button" onClick={() => setFormData({...formData, waterAmount: num})}
                  className="transition-transform active:scale-125"
                >
                  <Droplets size={22} fill={num <= formData.waterAmount ? "#BF6B4E" : "none"} stroke={num <= formData.waterAmount ? "#BF6B4E" : "#E5E7EB"} />
                </button>
              ))}
            </div>
          </div>

          {/* Pièce & Emplacement */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <select value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} className="w-full p-4 pl-10 rounded-2xl bg-white shadow-sm outline-none appearance-none text-xs font-bold text-jungle-green uppercase tracking-widest">
                {ROOMS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              <Home size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-jungle-terracotta" />
            </div>
            <div className="relative">
              <select value={formData.spot} onChange={e => setFormData({...formData, spot: e.target.value})} className="w-full p-4 pl-10 rounded-2xl bg-white shadow-sm outline-none appearance-none text-xs font-bold text-jungle-green uppercase tracking-widest">
                {SPOTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-jungle-terracotta" />
            </div>
          </div>

          {/* Bouton Action Final */}
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-jungle-green text-white p-6 rounded-[2.2rem] font-bold shadow-xl shadow-jungle-green/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
          >
            {loading ? <Loader2 className="animate-spin" /> : <><Sprout size={22} /> {editPlant ? 'Sauvegarder' : 'Ajouter à ma jungle'}</>}
          </button>
        </form>
      </div>
    </div>
  );
}