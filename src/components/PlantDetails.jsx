import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, updateDoc, arrayUnion, onSnapshot, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { NOTE_TYPES, ROOMS } from '../utils/constants';
import { ChevronLeft, Calendar, Plus, MapPin, Droplets, Trash2, Quote } from 'lucide-react';

export default function PlantDetails({ plant, onClose, onDelete }) {
  const [note, setNote] = useState('');
  const [noteType, setNoteType] = useState('growth');
  const [history, setHistory] = useState(plant.history || []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "plants", plant.id), (doc) => {
      if (doc.exists()) setHistory(doc.data().history || []);
    });
    return unsub;
  }, [plant.id]);

  const addNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    const newNote = { id: Date.now(), text: note, type: noteType, date: new Date().toISOString() };
    await updateDoc(doc(db, "plants", plant.id), { notes: arrayUnion(newNote) });
    setNote('');
  };

  const handleDelete = async () => {
    if (window.confirm("Es-tu sûr de vouloir supprimer cette plante ?")) {
      try {
        await deleteDoc(doc(db, "plants", plant.id));
        onClose();
      } catch (error) {
        console.error("Erreur suppression:", error);
      }
    }
  };

  const roomInfo = ROOMS.find(r => r.id === plant.room);
  const RoomIcon = roomInfo?.icon || MapPin;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full text-jungle-green">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-xl font-rounded font-black text-jungle-green capitalize leading-tight">
              {plant.name}
            </h2>
            {plant.variety && (
              <p className="font-sans text-xs text-jungle-sage font-medium italic">
                {plant.variety}
              </p>
            )}
          </div>
        </div>
        
        <button 
          onClick={handleDelete}
          className="p-2.5 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors"
        >
          <Trash2 size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Photo & Badges */}
        <div className="h-72 w-full relative">
          <img src={plant.imageUrl} className="w-full h-full object-cover shadow-inner" alt="" />
          <div className="absolute bottom-6 left-6 flex gap-2">
            <span className="bg-white/90 backdrop-blur px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg flex items-center gap-2 text-jungle-green">
              <RoomIcon size={12} /> {roomInfo?.label}
            </span>
            <span className="bg-white/90 backdrop-blur px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg flex items-center gap-2 text-jungle-green">
              <MapPin size={12} /> {plant.spot}
            </span>
          </div>
        </div>

        <div className="p-8 space-y-10">
          
          {/* NOUVEAU : Bloc Description / Note de cœur */}
          {plant.description && (
            <section className="bg-jungle-cream/30 p-6 rounded-[2rem] border border-jungle-cream/50 relative">
              <Quote size={20} className="text-jungle-sage/20 absolute top-4 right-6" />
              <h3 className="text-[11px] font-black text-jungle-sage uppercase tracking-[0.2em] mb-2">Note de cœur</h3>
              <p className="text-sm text-jungle-green font-medium leading-relaxed italic">
                "{plant.description}"
              </p>
            </section>
          )}

          {/* Historique Arrosage */}
          <section>
            <h3 className="text-[11px] font-black text-jungle-green/40 uppercase tracking-[0.2em] mb-5">Derniers arrosages</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {history.length > 0 ? history.slice(-5).reverse().map((date, i) => (
                <div key={i} className="flex-shrink-0 bg-jungle-cream/50 p-4 rounded-[1.5rem] text-center min-w-[110px] border border-jungle-cream">
                  <p className="text-[10px] font-black text-jungle-sage uppercase mb-2">
                    {format(new Date(date), 'EEE d MMM', { locale: fr })}
                  </p>
                  <Droplets size={20} className="mx-auto text-jungle-terracotta" />
                </div>
              )) : <p className="text-sm text-gray-400 italic">Aucun historique...</p>}
            </div>
          </section>

          {/* Journal de bord */}
          <section className="pb-20">
            <h3 className="text-[11px] font-black text-jungle-green/40 uppercase tracking-[0.2em] mb-5">Journal de bord</h3>
            <form onSubmit={addNote} className="bg-gray-50 p-5 rounded-[2rem] mb-8 border border-gray-100 shadow-inner">
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
                {NOTE_TYPES.map(t => {
                  const Icon = t.icon;
                  return (
                    <button key={t.id} type="button" onClick={() => setNoteType(t.id)} className={`px-4 py-2 rounded-full text-[10px] font-bold flex items-center gap-2 transition-all ${noteType === t.id ? 'bg-jungle-green text-white shadow-md' : 'bg-white text-gray-400 border border-gray-100'}`}>
                      <Icon size={12} /> {t.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3 items-center">
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ajouter une note..." className="flex-1 bg-transparent border-none outline-none text-sm font-medium" />
                <button type="submit" className="bg-jungle-terracotta text-white p-2.5 rounded-xl shadow-lg active:scale-90 transition-transform">
                  <Plus size={18} />
                </button>
              </div>
            </form>

            <div className="space-y-6">
              {plant.notes?.slice().reverse().map(n => {
                const Icon = NOTE_TYPES.find(t => t.id === n.type)?.icon || Calendar;
                return (
                  <div key={n.id} className="flex gap-5 items-start">
                    <div className="p-3 bg-jungle-cream rounded-2xl text-jungle-sage">
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 border-b border-gray-50 pb-4">
                      <p className="text-[10px] text-gray-400 font-black uppercase mb-1">
                        {format(new Date(n.date), 'd MMMM yyyy', { locale: fr })}
                      </p>
                      <p className="text-sm text-jungle-green font-semibold leading-relaxed">{n.text}</p>
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