import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, updateDoc, arrayUnion, onSnapshot, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { NOTE_TYPES, ROOMS } from '../utils/constants';
import { getNextWaterDate, getDynamicFrequency, isPlantThirsty } from '../utils/watering';
import { ChevronLeft, Calendar, Plus, MapPin, Droplets, Trash2, Quote, AlertTriangle, Edit2, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MAX_NOTE_LENGTH = 280;

export default function PlantDetails({ plant, weatherProfile, onClose, onEdit }) {
  const [note, setNote] = useState('');
  const [noteType, setNoteType] = useState('growth');
  const [history, setHistory] = useState(plant.history || []);
  const [notes, setNotes] = useState(plant.notes || []);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "plants", plant.id), (snap) => {
      if (snap.exists()) {
        setHistory(snap.data().history || []);
        setNotes(snap.data().notes || []);
      } else {
        onClose();
      }
    });
    return unsub;
  }, [plant.id, onClose]);

  const nextWaterDate = getNextWaterDate(plant, weatherProfile);
  const isThirsty = isPlantThirsty(plant, weatherProfile);
  const dynamicFrequency = getDynamicFrequency(plant, weatherProfile);
  const baseFrequency = plant.baseFrequency ?? plant.frequency;

  const addNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    const newNote = { id: Date.now(), text: note, type: noteType, date: new Date().toISOString() };
    await updateDoc(doc(db, "plants", plant.id), { notes: arrayUnion(newNote) });
    setNote('');
  };

  const deleteNote = async (noteId) => {
    setDeletingNoteId(noteId);
    // Short delay to let exit animation play
    setTimeout(async () => {
      const updated = notes.filter(n => n.id !== noteId);
      await updateDoc(doc(db, "plants", plant.id), { notes: updated });
      setDeletingNoteId(null);
    }, 300);
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

  const displayedHistory = showFullHistory ? [...history].reverse() : [...history].reverse().slice(0, 5);

  return (
    <div className="fixed inset-0 bg-white dark:bg-jungle-deep z-50 flex flex-col animate-in slide-in-from-right duration-300 transition-colors">
      
      {/* MODALE SUPPRESSION PLANTE */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#2A3930]/60 dark:bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 16 }}
              className="bg-white dark:bg-jungle-green rounded-[3rem] p-8 w-full max-w-sm shadow-2xl text-center space-y-6"
            >
              <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
                <AlertTriangle size={40} />
              </div>
              <div>
                <h3 className="font-rounded font-black text-2xl text-center dark:text-white leading-tight">
                  Supprimer&nbsp;{plant.name}&nbsp;?
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 leading-relaxed px-4 text-center">
                  Cette action est irréversible.&nbsp;{plant.name}&nbsp;nous a quitté&nbsp;?
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={confirmDelete} className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-red-500/20 active:scale-[0.98] transition-all">
                  Oui, supprimer !
                </button>
                <button onClick={() => setShowDeleteConfirm(false)} className="w-full bg-gray-100 dark:bg-jungle-deep text-gray-500 dark:text-gray-400 py-4 rounded-2xl font-bold active:scale-[0.98] transition-all">
                  Garder mon amie
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-gray-100 dark:border-white/5 shrink-0">
        <div className="flex items-center gap-4 text-left">
          <button onClick={onClose} className="p-2 bg-gray-50 dark:bg-jungle-green rounded-2xl text-[#2A3930] dark:text-jungle-cream">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-xl font-rounded font-black text-[#2A3930] dark:text-white capitalize leading-tight">{plant.name}</h2>
            {plant.variety && <p className="font-sans text-xs text-[#8A9A5B] font-medium italic">{plant.variety}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(plant)} className="p-2.5 bg-[#F9F7F2] dark:bg-jungle-green text-[#2A3930] dark:text-jungle-cream rounded-2xl active:scale-90 transition-transform">
            <Edit2 size={20} />
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} className="p-2.5 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-2xl active:scale-90 transition-transform">
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Photo & Badges */}
        <div className="h-80 w-full relative">
          <img src={plant.imageUrl} className="w-full h-full object-cover shadow-inner" alt={plant.name} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 flex flex-wrap gap-2">
            <span className="bg-white/95 dark:bg-jungle-green/95 backdrop-blur px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg flex items-center gap-2 text-[#2A3930] dark:text-jungle-cream">
              <RoomIcon size={12} /> {roomInfo?.label}
            </span>
            <span className="bg-white/95 dark:bg-jungle-green/95 backdrop-blur px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg flex items-center gap-2 text-[#2A3930] dark:text-jungle-cream">
              <MapPin size={12} /> {plant.spot}
            </span>
            <span className={`backdrop-blur px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-xl flex items-center gap-2 border ${
              isThirsty ? 'bg-red-500/90 text-white border-red-400' : 'bg-[#BF6B4E]/90 text-white border-[#BF6B4E]/20'
            }`}>
              <Calendar size={12} />
              {isThirsty ? 'Dépassé\u00A0:' : 'Suivant\u00A0:'}&nbsp;{format(nextWaterDate, 'd MMM', { locale: fr })}
            </span>
          </div>
        </div>

        <div className="p-8 space-y-10 text-left">

          {/* Description */}
          {plant.description && (
            <section className="bg-[#F9F7F2]/60 dark:bg-jungle-green/30 p-6 rounded-[2.5rem] border border-[#F9F7F2] dark:border-white/5 relative">
              <Quote size={20} className="text-[#8A9A5B]/20 absolute top-4 right-6" />
              <h3 className="text-[11px] font-black text-[#8A9A5B] uppercase tracking-[0.2em] mb-2">Note de cœur</h3>
              <p className="text-sm text-[#2A3930] dark:text-jungle-cream font-medium leading-relaxed italic">"{plant.description}"</p>
            </section>
          )}

          {/* Fréquence */}
          <section>
            <h3 className="text-[11px] font-black text-[#2A3930]/40 dark:text-white/20 uppercase tracking-[0.2em] mb-5">Fréquence</h3>
            <div className="bg-[#F9F7F2]/60 dark:bg-jungle-green/30 p-5 rounded-[2rem] border border-[#F9F7F2] dark:border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Habituelle</p>
                <p className="text-lg font-black text-[#2A3930] dark:text-white">{baseFrequency}j</p>
              </div>
              {dynamicFrequency !== baseFrequency && (
                <>
                  <div className="text-[#8A9A5B] text-xl">→</div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-[#BF6B4E] uppercase tracking-widest mb-1">Ajustée météo</p>
                    <p className="text-lg font-black text-[#BF6B4E]">{dynamicFrequency}j</p>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Historique Arrosage */}
          <section>
            <h3 className="text-[11px] font-black text-[#2A3930]/40 dark:text-white/20 uppercase tracking-[0.2em] mb-5">
              Historique <span className="normal-case font-bold opacity-60">({history.length})</span>
            </h3>

            {history.length > 0 ? (
              <>
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                  <AnimatePresence>
                    {displayedHistory.map((date, i) => (
                      <motion.div
                        key={date}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex-shrink-0 bg-[#F9F7F2]/50 dark:bg-jungle-green/40 p-4 rounded-[1.5rem] text-center min-w-[100px] border border-[#F9F7F2] dark:border-white/5"
                      >
                        <p className="text-[10px] font-black text-[#8A9A5B] uppercase mb-2">
                          {format(new Date(date), 'EEE d MMM', { locale: fr })}
                        </p>
                        <Droplets size={18} className="mx-auto text-[#BF6B4E]" />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {history.length > 5 && (
                  <button
                    onClick={() => setShowFullHistory(!showFullHistory)}
                    className="mt-3 flex items-center gap-1.5 text-[10px] font-black text-[#8A9A5B] uppercase tracking-widest"
                  >
                    <motion.div animate={{ rotate: showFullHistory ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown size={14} />
                    </motion.div>
                    {showFullHistory ? 'Voir moins' : `Voir tout (${history.length})`}
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400 italic">Aucun arrosage enregistré...</p>
            )}
          </section>

          {/* Journal de bord */}
          <section className="pb-20">
            <h3 className="text-[11px] font-black text-[#2A3930]/40 dark:text-white/20 uppercase tracking-[0.2em] mb-5">Journal de bord</h3>

            {/* Formulaire */}
            <form onSubmit={addNote} className="bg-gray-50 dark:bg-jungle-green p-5 rounded-[2rem] mb-8 border border-gray-100 dark:border-white/5 shadow-inner">
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
                {NOTE_TYPES.map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id} type="button" onClick={() => setNoteType(t.id)}
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
                  onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE_LENGTH))}
                  placeholder="Écrire une note..."
                  className="flex-1 bg-transparent border-none outline-none text-sm font-medium dark:text-white placeholder-gray-400"
                />
                <button type="submit" disabled={!note.trim()} className="bg-[#BF6B4E] text-white p-2.5 rounded-xl shadow-lg active:scale-90 transition-all disabled:opacity-30">
                  <Plus size={18} />
                </button>
              </div>
              {/* Compteur de caractères */}
              <AnimatePresence>
                {note.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 flex justify-end"
                  >
                    <span className={`text-[9px] font-black tabular-nums ${
                      note.length >= MAX_NOTE_LENGTH ? 'text-red-400' :
                      note.length > MAX_NOTE_LENGTH * 0.8 ? 'text-[#BF6B4E]' :
                      'text-gray-300 dark:text-white/20'
                    }`}>
                      {note.length}/{MAX_NOTE_LENGTH}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            {/* Liste des notes */}
            <div className="space-y-4">
              <AnimatePresence>
                {[...(notes)].reverse().map(n => {
                  const Icon = NOTE_TYPES.find(t => t.id === n.type)?.icon || Calendar;
                  const isDeleting = deletingNoteId === n.id;
                  return (
                    <motion.div
                      key={n.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: isDeleting ? 0 : 1, y: 0, height: isDeleting ? 0 : 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.28 }}
                      className="flex gap-5 items-start group/note overflow-hidden"
                    >
                      <div className="p-3 bg-[#F9F7F2] dark:bg-jungle-green rounded-2xl text-[#8A9A5B] shrink-0">
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 border-b border-gray-50 dark:border-white/5 pb-4 min-w-0">
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase mb-1">
                          {format(new Date(n.date), 'd MMMM yyyy', { locale: fr })}
                        </p>
                        <p className="text-sm text-[#2A3930] dark:text-jungle-cream font-semibold leading-relaxed">{n.text}</p>
                      </div>
                      {/* Bouton suppression note */}
                      <button
                        onClick={() => deleteNote(n.id)}
                        className="shrink-0 p-2 rounded-xl text-gray-300 dark:text-white/20 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-400 transition-all opacity-0 group-hover/note:opacity-100 mt-1"
                        aria-label="Supprimer la note"
                      >
                        <X size={14} />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {notes.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-600 italic">Aucune note pour l'instant...</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
