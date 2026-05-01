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

  let statusText = `J-${daysDiff}`;
  
  if (alreadyWateredToday) {
    statusText = "OK";
  } else if (isOverdue) {
    statusText = `+${daysOverdue}J`;
  } else if (isDueToday) {
    statusText = "SOIF";
  }

  return (
    <div className={`
      relative rounded-[3rem] shadow-sm hover:shadow-2xl transition-all duration-500 group overflow-hidden border flex flex-col h-[520px]
      ${isOverdue 
        ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 shadow-red-100 dark:shadow-red-900/10 shadow-lg' 
        : 'bg-white dark:bg-jungle-green border-gray-50 dark:border-white/5'}
    `}>
      
      {/* SECTION IMAGE */}
      <div className="relative flex-grow overflow-hidden">
        <img 
          src={plant.imageUrl} 
          className={`w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 ${isOverdue ? 'grayscale-[0.7] contrast-[0.9] dark:brightness-75' : 'dark:brightness-90'}`} 
          alt={plant.name} 
        />
        
        {/* Overlay Dégradé - Plus prononcé en dark mode pour le texte blanc */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Message Alert Si Retard */}
        {isOverdue && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-20 pointer-events-none">
            <div className="bg-red-600 text-white p-4 rounded-full shadow-2xl">
              <AlertCircle size={32} strokeWidth={3} />
            </div>
            <span className="bg-red-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Oubliée !</span>
          </div>
        )}

        {/* BESOINS EN EAU */}
        <div className="absolute top-6 left-6 bg-white/90 dark:bg-jungle-deep/90 backdrop-blur-md py-2 px-3 rounded-2xl flex items-center gap-2.5 shadow-sm">
          <div className="text-[#2A3930] dark:text-jungle-cream">
            {plant.waterType === 'bain' ? <Bath size={14} /> : <ShowerHead size={14} />}
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} className={`h-1.5 w-1.5 rounded-full ${n <= (plant.waterAmount || 3) ? (isOverdue ? 'bg-red-500' : 'bg-[#BF6B4E]') : 'bg-[#BF6B4E33] dark:bg-white/10'}`} />
            ))}
          </div>
        </div>

        {/* NOM */}
        <div 
          className="absolute bottom-4 left-6 right-6 text-left overflow-visible"
          style={{ containerType: 'inline-size' }} 
        >
          <h3 
            className="font-rounded font-black text-white capitalize leading-none drop-shadow-2xl whitespace-nowrap"
            style={{ fontSize: 'clamp(24px, 11cqw, 48px)' }}
          >
            {plant.name}
          </h3>
        </div>
      </div>
      
      {/* SECTION INFOS */}
      <div className={`p-8 transition-colors duration-500 text-left ${isOverdue ? 'bg-red-50/50 dark:bg-transparent' : 'bg-white dark:bg-jungle-green'}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2.5 min-w-0 flex-1">
            {plant.variety && (
              <p className="text-[#2A3930] dark:text-jungle-cream font-bold text-sm italic opacity-60 dark:opacity-40 leading-tight truncate">
                {plant.variety}
              </p>
            )}

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[10px] font-black text-[#8A9A5B] dark:text-[#A3B18A] uppercase tracking-widest">
                <RoomIcon size={12}/> {roomInfo.label}
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-200 dark:bg-white/10 shrink-0" />
              <span className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest truncate">
                <MapPin size={12} /> {plant.spot}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[#2A3930]/30 dark:text-white/20 text-[9px] font-bold uppercase tracking-widest">
              <CalendarClock size={12} />
              <span>Dernier : {format(lastWaterDate, "d MMM", { locale: fr })}</span>
            </div>
          </div>

          {/* BOUTON ARROSAGE */}
          <button 
            onClick={handleWaterClick}
            disabled={isWatering || alreadyWateredToday}
            className={`h-16 w-16 shrink-0 rounded-[1.8rem] flex items-center justify-center transition-all duration-300 ${
              isWatering ? 'bg-blue-500 scale-90 shadow-blue-200 shadow-xl' : 
              alreadyWateredToday ? 'bg-[#F9F7F2] dark:bg-jungle-deep text-[#8A9A5B]/40 dark:text-white/10' :
              isOverdue ? 'bg-red-600 text-white shadow-lg animate-pulse scale-110 border-4 border-white dark:border-jungle-green' :
              (isDueToday) ? 'bg-[#BF6B4E] text-white shadow-lg' : 
              'bg-[#F9F7F2] dark:bg-jungle-deep text-[#2A3930] dark:text-jungle-cream hover:bg-[#2A3930] dark:hover:bg-jungle-cream hover:text-white dark:hover:text-jungle-deep shadow-sm'
            }`}
          >
            <div className="flex flex-col items-center">
              <Droplets size={22} fill="currentColor" fillOpacity={0.3} className={isWatering ? 'animate-bounce text-white' : ''} />
              <span className="text-[9px] font-black mt-0.5 tracking-tighter uppercase">{statusText}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}