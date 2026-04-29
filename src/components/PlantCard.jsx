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
    <div className={`bg-white rounded-[3rem] shadow-sm hover:shadow-2xl transition-all duration-500 group overflow-hidden border flex flex-col h-[520px] ${isOverdue ? 'border-red-200 shadow-red-100 shadow-lg' : 'border-gray-50'}`}>
      
      {/* SECTION IMAGE */}
      <div className="relative flex-grow overflow-hidden">
        <img 
          src={plant.imageUrl} 
          className={`w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 ${isOverdue ? 'grayscale-[0.7] contrast-[0.9]' : ''}`} 
          alt={plant.name} 
        />
        
        {/* Overlay Dégradé */}
        <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Message Alert Si Retard */}
        {isOverdue && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-20 pointer-events-none">
            <div className="bg-red-600 text-white p-4 rounded-full shadow-2xl animate-bounce">
              <AlertCircle size={32} strokeWidth={3} />
            </div>
            <span className="bg-red-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Oubliée !</span>
          </div>
        )}

        {/* BESOINS EN EAU */}
        <div className="absolute top-6 left-6 bg-[#F9F7F2]/90 backdrop-blur-md py-2 px-3 rounded-2xl flex items-center gap-2.5 shadow-sm">
          <div className="text-[#2A3930]">
            {plant.waterType === 'bain' ? <Bath size={14} /> : <ShowerHead size={14} />}
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} className={`h-1.5 w-1.5 rounded-full ${n <= (plant.waterAmount || 3) ? (isOverdue ? 'bg-red-500' : 'bg-[#BF6B4E]') : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>

        {/* BOUTON MODIFIER - FIXÉ ICI (Visible tout le temps mais plus discret) */}
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(plant); }} 
          className="absolute top-6 right-6 bg-white/80 backdrop-blur-md text-[#2A3930] p-3 rounded-2xl shadow-lg hover:bg-[#2A3930] hover:text-white transition-all duration-300 z-30"
        >
          <Edit2 size={18} />
        </button>

        {/* NOM */}
        <div className="absolute bottom-2 left-4 right-8 text-left">
          <h3 className="font-rounded font-black text-4xl text-white capitalize leading-tight drop-shadow-lg text-left">
            {plant.name}
          </h3>
        </div>
      </div>
      
      {/* SECTION INFOS */}
      <div className={`p-8 transition-colors duration-500 text-left ${isOverdue ? 'bg-red-50' : 'bg-white'}`}>
        <div className="flex items-center justify-between gap-4 text-left">
          <div className="space-y-2.5 min-w-0 text-left">
            {plant.variety && (
              <p className="text-[#2A3930] font-bold text-sm italic opacity-80 leading-tight truncate text-left">
                {plant.variety}
              </p>
            )}

            <div className="flex items-center gap-2 text-left">
              <span className="flex items-center gap-1.5 text-[10px] font-black text-[#8A9A5B] uppercase tracking-widest text-left">
                <RoomIcon size={12}/> {roomInfo.label}
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-200 shrink-0" />
              <span className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest truncate text-left">
                <MapPin size={12} /> {plant.spot}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[#2A3930]/30 text-[9px] font-bold uppercase tracking-widest text-left">
              <CalendarClock size={12} />
              <span>Dernier : {format(lastWaterDate, "d MMM", { locale: fr })}</span>
            </div>
          </div>

          {/* BOUTON ARROSAGE */}
          <button 
            onClick={handleWaterClick}
            disabled={isWatering || alreadyWateredToday}
            className={`h-16 w-16 shrink-0 rounded-[1.8rem] flex items-center justify-center transition-all duration-300 ${
              isWatering ? 'bg-blue-500 scale-90' : 
              alreadyWateredToday ? 'bg-[#F9F7F2] text-[#8A9A5B]/40' :
              isOverdue ? 'bg-red-600 text-white shadow-lg animate-pulse scale-110' :
              (isDueToday) ? 'bg-[#BF6B4E] text-white shadow-lg' : 
              'bg-[#F9F7F2] text-[#2A3930] hover:bg-[#2A3930] hover:text-white'
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