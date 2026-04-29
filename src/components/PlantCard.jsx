import { differenceInDays, addDays, format, isToday, isAfter, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ROOMS } from '../utils/constants';
import { Edit2, Droplets, MapPin, CalendarClock, Bath, ShowerHead, AlertCircle } from 'lucide-react';
import { useState } from 'react';

export default function PlantCard({ plant, onWater, onEdit }) {
  const [isWatering, setIsWatering] = useState(false);
  
  const lastWaterDate = new Date(plant.lastWatering);
  const nextWaterDate = addDays(lastWaterDate, plant.frequency);
  const today = startOfDay(new Date());
  
  const daysDiff = differenceInDays(nextWaterDate, today);
  const alreadyWateredToday = isToday(lastWaterDate);
  
  // États de l'arrosage
  const isDueToday = isToday(nextWaterDate) && !alreadyWateredToday;
  const isOverdue = isAfter(today, nextWaterDate) && !alreadyWateredToday;
  const daysOverdue = isOverdue ? Math.abs(daysDiff) : 0;

  const handleWaterClick = async (e) => {
    e.stopPropagation();
    setIsWatering(true);
    await onWater(plant.id);
    setTimeout(() => setIsWatering(false), 800);
  };

  const roomInfo = ROOMS.find(r => r.id === plant.room) || ROOMS[0];
  const RoomIcon = roomInfo.icon;

  // Texte de status dynamique (On gronde !)
  let statusText = `J-${daysDiff}`;
  let statusColor = "text-jungle-green";
  
  if (alreadyWateredToday) {
    statusText = "OK";
    statusColor = "text-jungle-sage";
  } else if (isOverdue) {
    statusText = `+${daysOverdue}J RETARD !`;
    statusColor = "text-red-600 animate-pulse";
  } else if (isDueToday) {
    statusText = "SOIF";
    statusColor = "text-jungle-terracotta";
  }

  return (
    <div className={`bg-white rounded-[3rem] shadow-sm hover:shadow-2xl transition-all duration-500 group overflow-hidden border flex flex-col h-[520px] ${isOverdue ? 'border-red-200 shadow-red-100 shadow-lg' : 'border-gray-50'}`}>
      
      {/* SECTION IMAGE */}
      <div className="relative flex-grow overflow-hidden">
        <img 
          src={plant.imageUrl} 
          className={`w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 ${isOverdue ? 'grayscale-[0.7] contrast-[0.9]' : ''}`} 
          alt={plant.name} 
        />
        
        {/* Overlay Dégradé */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Message de "Gronde" si retard */}
        {isOverdue && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-20 pointer-events-none">
            <div className="bg-red-600 text-white p-4 rounded-full shadow-2xl animate-bounce">
              <AlertCircle size={32} strokeWidth={3} />
            </div>
            <span className="bg-red-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Oubliée !</span>
          </div>
        )}

        {/* BESOINS EN EAU */}
        <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md py-2 px-3 rounded-2xl flex items-center gap-2.5 shadow-sm">
          <div className="text-jungle-green">
            {plant.waterType === 'bain' ? <Bath size={14} /> : <ShowerHead size={14} />}
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} className={`h-1.5 w-1.5 rounded-full ${n <= (plant.waterAmount || 3) ? (isOverdue ? 'bg-red-500' : 'bg-jungle-terracotta') : 'bg-jungle-cream'}`} />
            ))}
          </div>
        </div>

        {/* BOUTON MODIFIER */}
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(plant); }} 
          className="absolute top-6 right-6 bg-jungle-green text-white p-3 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
        >
          <Edit2 size={16} />
        </button>

        {/* NOM */}
        <div className="absolute bottom-7 left-8 right-8">
          <h3 className="font-rounded font-black text-4xl text-white capitalize leading-tight drop-shadow-md">
            {plant.name}
          </h3>
        </div>
      </div>
      
      {/* SECTION INFOS */}
      <div className={`p-8 transition-colors duration-500 ${isOverdue ? 'bg-red-50' : 'bg-white'}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2.5 min-w-0">
            {plant.variety && (
              <p className="text-jungle-green font-bold text-sm italic opacity-80 leading-tight truncate">
                {plant.variety}
              </p>
            )}

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[10px] font-black text-jungle-sage uppercase tracking-widest">
                <RoomIcon size={12}/> {roomInfo.label}
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-200 shrink-0" />
              <span className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">
                <MapPin size={12} /> {plant.spot}
              </span>
            </div>

            <div className="flex items-center gap-2 text-jungle-green/30 text-[9px] font-bold uppercase tracking-widest">
              <CalendarClock size={12} />
              <span>Dernier : {format(lastWaterDate, "d MMM", { locale: fr })}</span>
            </div>
          </div>

          {/* BOUTON ARROSAGE - Devient Rouge et pulse en cas de retard */}
          <button 
            onClick={handleWaterClick}
            disabled={isWatering || alreadyWateredToday}
            className={`h-16 w-16 shrink-0 rounded-[1.8rem] flex items-center justify-center transition-all duration-300 ${
              isWatering ? 'bg-blue-500 scale-90' : 
              alreadyWateredToday ? 'bg-jungle-cream/50 text-jungle-sage/40' :
              isOverdue ? 'bg-red-600 text-white shadow-lg animate-pulse scale-110' :
              (isDueToday) ? 'bg-jungle-terracotta text-white shadow-lg' : 
              'bg-jungle-cream text-jungle-green hover:bg-jungle-green hover:text-white'
            }`}
          >
            <div className="flex flex-col items-center">
              <Droplets size={22} fill="currentColor" fillOpacity={0.3} className={isWatering ? 'animate-bounce' : ''} />
              <span className="text-[9px] font-black mt-0.5 tracking-tighter uppercase">{statusText}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}