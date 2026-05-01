import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, updateDoc, arrayUnion, onSnapshot, deleteDoc } from 'firebase/firestore';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { NOTE_TYPES, ROOMS } from '../utils/constants';
import { ChevronLeft, Calendar, Plus, MapPin, Droplets, Trash2, Quote, AlertTriangle, Edit2 } from 'lucide-react';

export default function PlantDetails({ plant, onClose, onEdit }) {
  const [note, setNote] = useState('');
  const [noteType, setNoteType] = useState('growth');
  const [history, setHistory] = useState(plant.history || []);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "plants", plant.id), (doc) => {
      if (doc.exists()) setHistory(doc.data().history || []);
    });
    return unsub;
  }, [plant.id]);

  const nextWaterDate = addDays(new Date(plant.lastWatering), plant.frequency);
  const isThirsty = nextWaterDate <= new Date();

  const addNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    const newNote = { id: Date.now(), text: note, type: noteType, date: new Date().toISOString() };
    await updateDoc(doc(db, "plants", plant.id), { notes: arrayUnion(newNote) });
    setNote('');
  };

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, "plants", plant.id));
      onClose();
    } catch (error) {
      console.error("Erreur suppression:", error);
    }
  };

  const roomInfo = ROOMS.find(r => r.id === plant.room);
  const RoomIcon = roomInfo?.icon || MapPin;

  return (
    <div className="fixed inset-0 bg-white dark:bg-jungle-deep z-50 flex flex-col animate-in slide-in-from-right duration-300 transition-colors">
      
      {/* MODALE DE CONFIRMATION DE SUPPRESSION */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#2A3930]/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-jungle-green rounded-[3rem] p-8 w-full max-w-sm shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
              <AlertTriangle size={40} />
            </div>
            <div>
              <h3 className="font-rounded font-black text-2xl text-center dark:text-white leading-tight">
                {"Supprimer" + "\u00A0" + plant.name + "\u00A0" + "?"}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 leading-relaxed px-4 text-center">
                {"Cette action est irréversible." + "\u00A0" + plant.name + "\u00A0" + "nous a quitté" + "\u00A0" + "?"}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmDelete}
                className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-red-500/20 active:scale-[0.98] transition-all"
              >
                {"Oui, supprimer" + "\u00A0" + "!"}
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full bg-gray-100 dark:bg-jungle-deep text-gray-500 dark:text-gray-400 py-4 rounded-2xl font-bold active:scale-[0.98] transition-all"
              >
                Garder mon amie
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-gray-100 dark:border-white/5 shrink-0">
        <div className="flex items-center gap-4 text-left">
          <button onClick={onClose} className="p-2 bg-gray-50 dark:bg-jungle-green rounded-2xl text-[#2A3930] dark:text-jungle-cream">
            <ChevronLeft size={24} />
          </button>
          <div className="text-left">
            <h2 className="text-xl font-rounded font-black text-[#2A3930] dark:text-white capitalize leading-tight">
              {plant.name}
            </h2>
            {plant.variety && (
              <p className="font-sans text-xs text-[#8A9A5B] font-medium italic">
                {plant.variety}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onEdit(plant)}
            className="p-2.5 bg-[#F9F7F2] dark:bg-jungle-green text-[#2A3930] dark:text-jungle-cream rounded-2xl active:scale-90 transition-transform"
          >
            <Edit2 size={20} />
          </button>
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2.5 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-2xl active:scale-90 transition-transform"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Photo & Badges */}
        <div className="h-80 w-full relative">
          <img src={plant.imageUrl} className="w-full h-full object-cover shadow-inner dark:brightness-75" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          
          <div className="absolute bottom-6 left-6 right-6 flex flex-wrap gap-2">
            <span className="bg-white/95 dark:bg-jungle-green/95 backdrop-blur px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg flex items-center gap-2 text-[#2A3930] dark:text-jungle-cream">
              <RoomIcon size={12} /> {roomInfo?.label}
            </span>
            <span className="bg-white/95 dark:bg-jungle-green/95 backdrop-blur px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg flex items-center gap-2 text-[#2A3930] dark:text-jungle-cream">
              <MapPin size={12} /> {plant.spot}
            </span>
            
            <span className={`backdrop-blur px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-xl flex items-center gap-2 border ${
              isThirsty 
              ? 'bg-red-500/90 text-white border-red-400' 
              : 'bg-[#BF6B4E]/90 text-white border-[#BF6B4E]/20'
            }`}>
              <Calendar size={12} />
              {isThirsty 
                ? "Dépassé :" + "\u00A0" + format(nextWaterDate, 'd MMM', { locale: fr })
                : "Suivant :" + "\u00A0" + format(nextWaterDate, 'd MMM', { locale: fr })
              }
            </span>
          </div>
        </div>

        <div className="p-8 space-y-10 text-left">
          {/* Bloc Description */}
          {plant.description && (
            <section className="bg-[#F9F7F2]/60 dark:bg-jungle-green/30 p-6 rounded-[2.5rem] border border-[#F9F7F2] dark:border-white/5 relative">
              <Quote size={20} className="text-[#8A9A5B]/20 absolute top-4 right-6" />
              <h3 className="text-[11px] font-black text-[#8A9A5B] uppercase tracking-[0.2em] mb-2">Note de cœur</h3>
              <p className="text-sm text-[#2A3930] dark:text-jungle-cream font-medium leading-relaxed italic text-left">
                {`"${plant.description}"`}
              </p>
            </section>
          )}

          {/* Historique Arrosage */}
          <section>
            <h3 className="text-[11px] font-black text-[#2A3930]/40 dark:text-white/20 uppercase tracking-[0.2em] mb-5 text-left text-left">Historique</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {history.length > 0 ? history.slice(-5).reverse().map((date, i) => (
                <div key={i} className="flex-shrink-0 bg-[#F9F7F2]/50 dark:bg-jungle-green/40 p-4 rounded-[1.5rem] text-center min-w-[100px] border border-[#F9F7F2] dark:border-white/5">
                  <p className="text-[10px] font-black text-[#8A9A5B] uppercase mb-2">
                    {format(new Date(date), 'EEE d MMM', { locale: fr })}
                  </p>
                  <Droplets size={18} className="mx-auto text-[#BF6B4E]" />
                </div>
              )) : <p className="text-sm text-gray-400 italic text-left">Aucun arrosage enregistré...</p>}
            </div>
          </section>

          {/* Journal de bord */}
          <section className="pb-20">
            <h3 className="text-[11px] font-black text-[#2A3930]/40 dark:text-white/20 uppercase tracking-[0.2em] mb-5 text-left">Journal de bord</h3>
            <form onSubmit={addNote} className="bg-gray-50 dark:bg-jungle-green p-5 rounded-[2rem] mb-8 border border-gray-100 dark:border-white/5 shadow-inner">
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
                {NOTE_TYPES.map(t => {
                  const Icon = t.icon;
                  return (
                    <button 
                      key={t.id} 
                      type="button" 
                      onClick={() => setNoteType(t.id)} 
                      className={`px-4 py-2 rounded-full text-[10px] font-bold flex items-center gap-2 transition-all shrink-0 ${
                        noteType === t.id 
                        ? 'bg-[#2A3930] dark:bg-jungle-cream text-white dark:text-jungle-deep shadow-md' 
                        : 'bg-white dark:bg-jungle-deep text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-white/5'
                      }`}
                    >
                      <Icon size={12} /> {t.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3 items-center">
                <input 
                  value={note} 
                  onChange={(e) => setNote(e.target.value)} 
                  placeholder="Écrire une note..." 
                  className="flex-1 bg-transparent border-none outline-none text-sm font-medium dark:text-white placeholder-gray-400" 
                />
                <button type="submit" className="bg-[#BF6B4E] text-white p-2.5 rounded-xl shadow-lg active:scale-90 transition-transform">
                  <Plus size={18} />
                </button>
              </div>
            </form>

            <div className="space-y-6">
              {plant.notes?.slice().reverse().map(n => {
                const Icon = NOTE_TYPES.find(t => t.id === n.type)?.icon || Calendar;
                return (
                  <div key={n.id} className="flex gap-5 items-start">
                    <div className="p-3 bg-[#F9F7F2] dark:bg-jungle-green rounded-2xl text-[#8A9A5B] shrink-0">
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 border-b border-gray-50 dark:border-white/5 pb-4">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase mb-1 text-left">
                        {format(new Date(n.date), 'd MMMM yyyy', { locale: fr })}
                      </p>
                      <p className="text-sm text-[#2A3930] dark:text-jungle-cream font-semibold leading-relaxed text-left">{n.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}