import { useEffect, useState } from 'react';
import { db, storage, auth } from '../services/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ROOMS, SPOTS } from '../utils/constants';
import { X, Camera, Loader2, Sprout, MapPin, Home, Droplets, Bath, ShowerHead, CalendarClock, Quote, Calendar, TreePine } from 'lucide-react';

const FAMILY_ID = "NOTRE_JUNGLE_PARTAGEE";

function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function createInitialFormData(editPlant) {
  return {
    name: editPlant?.name ?? '',
    variety: editPlant?.variety ?? '',
    description: editPlant?.description ?? '',
    room: editPlant?.room ?? 'salon',
    spot: editPlant?.spot ?? 'Sol',
    frequency:
      editPlant?.baseFrequency ?? editPlant?.frequency ?? 7,
    isOutdoor: editPlant?.isOutdoor ?? false,
    waterType: editPlant?.waterType ?? 'douche',
    waterAmount: editPlant?.waterAmount ?? 3,
    imageUrl: editPlant?.imageUrl ?? '',
    lastWatering: editPlant?.lastWatering
      ? getLocalDateInputValue(new Date(editPlant.lastWatering))
      : getLocalDateInputValue(),
  };
}

function parseLocalDate(dateValue) {
  const [year, month, day] = dateValue
    .split('-')
    .map(Number);

  return new Date(year, month - 1, day, 12, 0, 0);
}

export default function AddPlant({ onSave, onCancel, editPlant }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(() =>
    createInitialFormData(editPlant),
  );
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(
    editPlant?.imageUrl ?? '',
  );

  useEffect(() => {
    if (!previewUrl.startsWith('blob:')) return undefined;

    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const frequency = Number(formData.frequency);

    if (!auth.currentUser) {
      setError('Votre session a expiré. Reconnectez-vous.');
      return;
    }

    if (!formData.name.trim()) {
      setError('Donnez un nom à la plante.');
      return;
    }

    if (!Number.isInteger(frequency) || frequency < 1 || frequency > 90) {
      setError('La fréquence doit être comprise entre 1 et 90 jours.');
      return;
    }

    if (!imageFile && !formData.imageUrl) {
      setError('Ajoutez une photo de la plante.');
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl = formData.imageUrl;
      if (imageFile) {
        const safeFileName = imageFile.name.replace(
          /[^a-zA-Z0-9._-]/g,
          '_',
        );
        const storageRef = ref(storage, `plants/${auth.currentUser.uid}/${Date.now()}_${safeFileName}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        finalImageUrl = await getDownloadURL(snapshot.ref);
      }

      const selectedDate = parseLocalDate(formData.lastWatering);

      const plantData = {
        name: formData.name.trim(),
        variety: formData.variety,
        description: formData.description,
        room: formData.room,
        spot: formData.spot,
        frequency,
        isOutdoor: formData.isOutdoor,
        waterType: formData.waterType,
        waterAmount: formData.waterAmount,
        imageUrl: finalImageUrl,
        lastWatering: selectedDate.toISOString(),
        updatedAt: new Date().toISOString(),
        familyId: FAMILY_ID 
};

      if (editPlant && editPlant.id) {
        await updateDoc(doc(db, "plants", editPlant.id), {
          ...plantData,
          baseFrequency: frequency,
        });
} else {
        await addDoc(collection(db, "plants"), {
          ...plantData,
          baseFrequency: frequency,
          userId: auth.currentUser.uid,
          createdAt: new Date().toISOString(),
          history: [selectedDate.toISOString()]
        });
}
      onSave();
    } catch (error) {
      console.error("Erreur sauvegarde :", error);
      setError('La plante n’a pas pu être enregistrée. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="plant-form-title" className="fixed inset-0 bg-[#2A3930]/60 dark:bg-black/70 backdrop-blur-md z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-colors">
      <div className="bg-[#F9F7F2] dark:bg-jungle-deep w-full max-w-lg rounded-t-[3rem] sm:rounded-[3.5rem] shadow-2xl overflow-hidden relative flex flex-col max-h-[95vh] transition-colors">
        
        {/* BOUTON FERMER */}
        <button 
          type="button"
          onClick={onCancel} 
          aria-label="Fermer"
          className="absolute top-6 right-6 p-2 bg-white/50 dark:bg-jungle-green/50 backdrop-blur-sm hover:bg-white dark:hover:bg-jungle-green rounded-full transition-all z-20"
        >
          <X size={24} className="text-[#2A3930] dark:text-jungle-cream" />
        </button>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 pt-8 overflow-y-auto no-scrollbar space-y-4 text-left min-w-0">
          
          <div className="text-center mb-4">
             <h2 id="plant-form-title" className="font-rounded text-3xl text-[#2A3930] dark:text-white">
                {editPlant ? 'Modifier' : 'Nouvelle amie'}
             </h2>
          </div>

          {/* PHOTO */}
          <div className="flex justify-center mb-6">
            <div className="relative group">
              <div className="relative w-32 h-32 rounded-[2.5rem] bg-white dark:bg-jungle-green shadow-xl overflow-hidden border-4 border-white dark:border-jungle-green">
                {previewUrl ? (
                  <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#2A3930] dark:text-jungle-cream">
                    <Sprout size={48} />
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if(file) { 
                      setImageFile(file); 
                      setPreviewUrl(URL.createObjectURL(file)); 
                    }
                  }} 
                  aria-label="Choisir une photo"
                  className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-[#2A3930] dark:bg-jungle-cream text-white dark:text-jungle-deep p-2.5 rounded-2xl shadow-lg z-0 transition-transform group-active:scale-90">
                <Camera size={18} strokeWidth={2.5} />
              </div>
            </div>
          </div>

          {/* INFOS DE BASE */}
          <div className="space-y-3">
            <input 
              placeholder="Nom de la plante" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full p-4 rounded-2xl bg-white dark:bg-jungle-green shadow-sm outline-none font-bold text-lg text-[#2A3930] dark:text-white placeholder:text-gray-300 dark:placeholder:text-white/20 border border-transparent dark:border-white/5"
              required 
            />
            <input 
              placeholder="Variété" 
              value={formData.variety} 
              onChange={e => setFormData({...formData, variety: e.target.value})}
              className="w-full p-3 rounded-2xl bg-white dark:bg-jungle-green shadow-sm outline-none text-sm text-[#2A3930] dark:text-white placeholder:text-gray-300 dark:placeholder:text-white/20 italic border border-transparent dark:border-white/5"
            />
            <div className="relative">
              <textarea 
                placeholder="Un petit mot..." 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full p-4 pl-10 rounded-2xl bg-white dark:bg-jungle-green shadow-sm outline-none text-xs text-[#2A3930] dark:text-white placeholder:text-gray-300 dark:placeholder:text-white/20 resize-none h-16 font-medium border border-transparent dark:border-white/5"
              />
              <Quote size={14} className="absolute left-4 top-4 text-[#8A9A5B]/40" />
            </div>
          </div>

          {/* DERNIER ARROSAGE */}
          <div className="bg-white dark:bg-jungle-green p-4 rounded-2xl shadow-sm border border-transparent dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="bg-[#F9F7F2] dark:bg-jungle-deep p-2 rounded-xl text-[#BF6B4E] shrink-0">
                <Calendar size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black text-[#2A3930]/40 dark:text-white/30 uppercase tracking-widest mb-1 text-left">Dernier arrosage</p>
                <input 
                  type="date"
                  value={formData.lastWatering}
                  onChange={e => setFormData({...formData, lastWatering: e.target.value})}
                  className="w-full bg-transparent text-[#2A3930] dark:text-white font-bold outline-none border-none text-sm appearance-none block"
                  required
                />
              </div>
            </div>
          </div>

          {/* FRÉQUENCE */}
          <div className="bg-white dark:bg-jungle-green p-4 rounded-2xl shadow-sm flex items-center justify-between border border-transparent dark:border-white/5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="bg-[#F9F7F2] dark:bg-jungle-deep p-2 rounded-xl text-[#BF6B4E] shrink-0">
                <CalendarClock size={18} />
              </div>
              <span className="text-[10px] font-black text-[#2A3930] dark:text-white/70 uppercase tracking-widest truncate">Fréquence</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input 
                type="number"
                min="1"
                max="90"
                required
                value={formData.frequency}
                onChange={e => setFormData({...formData, frequency: parseInt(e.target.value) || ''})}
                className="w-10 p-2 rounded-xl bg-[#F9F7F2] dark:bg-jungle-deep text-center font-bold text-[#BF6B4E] outline-none text-sm"
              />
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">jours</span>
            </div>
          </div>

          {/* EXTÉRIEUR / INTÉRIEUR */}
<div className="bg-white dark:bg-jungle-green p-4 rounded-2xl shadow-sm flex items-center justify-between border border-transparent dark:border-white/5">
    <div className="flex items-center gap-3 min-w-0">
      <div className="bg-[#F9F7F2] dark:bg-jungle-deep p-2 rounded-xl text-[#BF6B4E] shrink-0">
        <TreePine size={18} />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-black text-[#2A3930] dark:text-white/70 uppercase tracking-widest">Extérieur</span>
        <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium">Pleinement exposée à la météo</span>
      </div>
    </div>
    <button
      type="button"
      onClick={() => setFormData({...formData, isOutdoor: !formData.isOutdoor})}
      role="switch"
      aria-checked={formData.isOutdoor}
      aria-label="Plante extérieure"
      className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${formData.isOutdoor ? 'bg-[#BF6B4E]' : 'bg-gray-200 dark:bg-jungle-deep'}`}
    >
      <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${formData.isOutdoor ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
</div>

          {/* TYPE D'EAU */}
          <div className="flex bg-white dark:bg-jungle-green p-1 rounded-2xl shadow-sm gap-1 border border-transparent dark:border-white/5">
            <button 
              type="button"
              onClick={() => setFormData({...formData, waterType: 'douche'})}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${formData.waterType === 'douche' ? 'bg-[#BF6B4E] text-white shadow-lg' : 'text-gray-400 dark:text-gray-500'}`}
            >
              <ShowerHead size={16} /> <span className="text-[10px] font-bold uppercase">Classique</span>
            </button>
            <button 
              type="button"
              onClick={() => setFormData({...formData, waterType: 'bain'})}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${formData.waterType === 'bain' ? 'bg-[#BF6B4E] text-white shadow-lg' : 'text-gray-400 dark:text-gray-500'}`}
            >
              <Bath size={16} /> <span className="text-[10px] font-bold uppercase">Trempage</span>
            </button>
          </div>

          {/* QUANTITÉ D'EAU */}
          <div className="bg-white dark:bg-jungle-green p-4 rounded-2xl shadow-sm flex items-center justify-between border border-transparent dark:border-white/5">
            <span className="text-[10px] font-black text-[#2A3930] dark:text-white/70 uppercase tracking-widest">Quantité</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(num => (
                <button 
                  key={num} type="button" onClick={() => setFormData({...formData, waterAmount: num})}
                  className="transition-transform active:scale-125"
                >
                  <Droplets size={20} fill={num <= formData.waterAmount ? "#BF6B4E33" : "none"} stroke={num <= formData.waterAmount ? "#BF6B4E" : "#E5E7EB"} />
                </button>
              ))}
            </div>
          </div>

          {/* PIÈCE & EMPLACEMENT */}
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <select value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} className="w-full p-4 pl-9 rounded-2xl bg-white dark:bg-jungle-green shadow-sm outline-none appearance-none text-[10px] font-black text-[#2A3930] dark:text-white uppercase tracking-widest truncate border border-transparent dark:border-white/5">
                {ROOMS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              <Home size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#BF6B4E]" />
            </div>
            <div className="relative">
              <select value={formData.spot} onChange={e => setFormData({...formData, spot: e.target.value})} className="w-full p-4 pl-9 rounded-2xl bg-white dark:bg-jungle-green shadow-sm outline-none appearance-none text-[10px] font-black text-[#2A3930] dark:text-white uppercase tracking-widest truncate border border-transparent dark:border-white/5">
                {SPOTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#BF6B4E]" />
            </div>
          </div>

          {/* BOUTON VALIDATION */}
          {error && (
            <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-center text-xs font-bold text-red-600 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="pt-2 pb-2">
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-[#2A3930] dark:bg-jungle-cream text-white dark:text-jungle-deep p-5 rounded-[2rem] font-bold shadow-xl shadow-[#2A3930]/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
            >
              {loading ? <Loader2 className="animate-spin" /> : <><Sprout size={22} /> <span className="uppercase tracking-widest text-xs">{editPlant ? 'Sauvegarder' : 'Ajouter'}</span></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
