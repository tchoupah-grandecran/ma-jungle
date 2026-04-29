import { useState, useEffect } from 'react';
import { db, storage, auth } from '../services/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ROOMS, SPOTS } from '../utils/constants';
import { X, Camera, Loader2, Sprout, MapPin, Home, Droplets, Bath, ShowerHead, CalendarClock, Quote, Calendar } from 'lucide-react';

const FAMILY_ID = "NOTRE_JUNGLE_PARTAGEE";

export default function AddPlant({ onSave, onCancel, editPlant }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    variety: '',
    description: '',
    room: 'salon',
    spot: 'Sol',
    frequency: 7,
    waterType: 'douche',
    waterAmount: 3,
    imageUrl: '',
    lastWatering: new Date().toISOString().split('T')[0]
  });
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (editPlant) {
      setFormData({
        name: editPlant.name,
        variety: editPlant.variety || '',
        description: editPlant.description || '',
        room: editPlant.room,
        spot: editPlant.spot,
        frequency: editPlant.frequency,
        waterType: editPlant.waterType || 'douche',
        waterAmount: editPlant.waterAmount || 3,
        imageUrl: editPlant.imageUrl,
        lastWatering: editPlant.lastWatering ? editPlant.lastWatering.split('T')[0] : new Date().toISOString().split('T')[0]
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

      const selectedDate = new Date(formData.lastWatering);
      selectedDate.setHours(12, 0, 0);

      const plantData = {
        name: formData.name,
        variety: formData.variety,
        description: formData.description,
        room: formData.room,
        spot: formData.spot,
        frequency: formData.frequency,
        waterType: formData.waterType,
        waterAmount: formData.waterAmount,
        imageUrl: finalImageUrl,
        lastWatering: selectedDate.toISOString(),
        updatedAt: new Date().toISOString(),
        familyId: FAMILY_ID 
      };

      if (editPlant && editPlant.id) {
        await updateDoc(doc(db, "plants", editPlant.id), plantData);
      } else {
        await addDoc(collection(db, "plants"), {
          ...plantData,
          userId: auth.currentUser.uid,
          createdAt: new Date().toISOString(),
          history: [selectedDate.toISOString()]
        });
      }
      onSave();
    } catch (error) {
      console.error("Erreur sauvegarde :", error);
      alert("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#2A3930]/60 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#F9F7F2] w-full max-w-lg rounded-t-[3rem] sm:rounded-[3.5rem] shadow-2xl overflow-hidden relative flex flex-col max-h-[95vh]">
        
        {/* BOUTON FERMER */}
        <button 
          onClick={onCancel} 
          className="absolute top-6 right-6 p-2 bg-white/50 backdrop-blur-sm hover:bg-white rounded-full transition-all z-20"
        >
          <X size={24} className="text-[#2A3930]" />
        </button>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 pt-12 overflow-y-auto no-scrollbar space-y-4 text-left min-w-0">
          
          <div className="text-left mb-2">
             <h2 className="font-rounded text-3xl text-[#2A3930]">
                {editPlant ? 'Modifier' : 'Nouvelle amie'}
             </h2>
          </div>

          {/* PHOTO */}
          <div className="flex justify-center mb-2">
            <div className="relative w-32 h-32 rounded-[2.5rem] bg-white shadow-xl overflow-hidden border-4 border-white group">
              {previewUrl ? (
                <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#2A3930]/20">
                  <Camera size={32} />
                </div>
              )}
              <input type="file" onChange={(e) => {
                const file = e.target.files[0];
                if(file) { setImageFile(file); setPreviewUrl(URL.createObjectURL(file)); }
              }} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
          </div>

          {/* INFOS DE BASE */}
          <div className="space-y-3">
            <input 
              placeholder="Nom de la plante..." 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full p-4 rounded-2xl bg-white shadow-sm outline-none font-bold text-lg text-[#2A3930] placeholder:text-gray-300"
              required 
            />
            <input 
              placeholder="Variété" 
              value={formData.variety} 
              onChange={e => setFormData({...formData, variety: e.target.value})}
              className="w-full p-3 rounded-2xl bg-white shadow-sm outline-none text-sm text-[#2A3930] placeholder:text-gray-300 italic"
            />
            <div className="relative">
              <textarea 
                placeholder="Un petit mot..." 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full p-4 pl-10 rounded-2xl bg-white shadow-sm outline-none text-xs text-[#2A3930] placeholder:text-gray-300 resize-none h-16 font-medium"
              />
              <Quote size={14} className="absolute left-4 top-4 text-[#8A9A5B]/40" />
            </div>
          </div>

          {/* DERNIER ARROSAGE - VERSION ULTRA COMPACTE ET SÉCURISÉE */}
          <div className="bg-white p-4 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="bg-[#F9F7F2] p-2 rounded-xl text-[#BF6B4E] shrink-0">
                <Calendar size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black text-[#2A3930]/40 uppercase tracking-widest mb-1">Dernier arrosage</p>
                <input 
                  type="date"
                  value={formData.lastWatering}
                  onChange={e => setFormData({...formData, lastWatering: e.target.value})}
                  className="w-full bg-transparent text-[#2A3930] font-bold outline-none border-none text-sm appearance-none block"
                  style={{ minWidth: '0' }}
                  required
                />
              </div>
            </div>
          </div>

          {/* FRÉQUENCE */}
          <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center justify-between min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="bg-[#F9F7F2] p-2 rounded-xl text-[#BF6B4E] shrink-0">
                <CalendarClock size={18} />
              </div>
              <span className="text-[10px] font-black text-[#2A3930] uppercase tracking-widest truncate">Fréquence</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input 
                type="number"
                value={formData.frequency}
                onChange={e => setFormData({...formData, frequency: parseInt(e.target.value) || ''})}
                className="w-10 p-2 rounded-xl bg-[#F9F7F2] text-center font-bold text-[#BF6B4E] outline-none text-sm"
              />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">jours</span>
            </div>
          </div>

          {/* TYPE D'EAU */}
          <div className="flex bg-white p-1 rounded-2xl shadow-sm gap-1">
            <button 
              type="button"
              onClick={() => setFormData({...formData, waterType: 'douche'})}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${formData.waterType === 'douche' ? 'bg-[#BF6B4E] text-white shadow-lg' : 'text-gray-400'}`}
            >
              <ShowerHead size={16} /> <span className="text-[10px] font-bold uppercase">Classique</span>
            </button>
            <button 
              type="button"
              onClick={() => setFormData({...formData, waterType: 'bain'})}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${formData.waterType === 'bain' ? 'bg-[#BF6B4E] text-white shadow-lg' : 'text-gray-400'}`}
            >
              <Bath size={16} /> <span className="text-[10px] font-bold uppercase">Trempage</span>
            </button>
          </div>

          {/* QUANTITÉ D'EAU */}
          <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <span className="text-[10px] font-black text-[#2A3930] uppercase tracking-widest">Quantité</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(num => (
                <button 
                  key={num} type="button" onClick={() => setFormData({...formData, waterAmount: num})}
                  className="transition-transform active:scale-125"
                >
                  <Droplets size={20} fill={num <= formData.waterAmount ? "#BF6B4E" : "none"} stroke={num <= formData.waterAmount ? "#BF6B4E" : "#E5E7EB"} />
                </button>
              ))}
            </div>
          </div>

          {/* PIÈCE & EMPLACEMENT */}
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <select value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} className="w-full p-4 pl-9 rounded-2xl bg-white shadow-sm outline-none appearance-none text-[10px] font-black text-[#2A3930] uppercase tracking-widest truncate">
                {ROOMS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              <Home size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#BF6B4E]" />
            </div>
            <div className="relative">
              <select value={formData.spot} onChange={e => setFormData({...formData, spot: e.target.value})} className="w-full p-4 pl-9 rounded-2xl bg-white shadow-sm outline-none appearance-none text-[10px] font-black text-[#2A3930] uppercase tracking-widest truncate">
                {SPOTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#BF6B4E]" />
            </div>
          </div>

          {/* BOUTON VALIDATION */}
          <div className="pt-2 pb-2">
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-[#2A3930] text-white p-5 rounded-[2rem] font-bold shadow-xl shadow-[#2A3930]/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
            >
              {loading ? <Loader2 className="animate-spin" /> : <><Sprout size={22} /> <span className="uppercase tracking-widest text-xs">{editPlant ? 'Sauvegarder' : 'Ajouter'}</span></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}