import { differenceInDays, addDays, format, isToday, isTomorrow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ROOMS } from '../utils/constants';
import { Edit2, Droplets, MapPin, Calendar, Bath, ShowerHead } from 'lucide-react';
import { useState } from 'react';

export default function PlantCard({ plant, onWater, onEdit }) {
  const [isWatering, setIsWatering] = useState(false);
  
  const lastWaterDate = new Date(plant.lastWatering);
  const nextWaterDate = addDays(lastWaterDate, plant.frequency);
  const now = new Date();
  
  const daysLeft = differenceInDays(nextWaterDate, now);
  const alreadyWateredToday = isToday(lastWaterDate);
  const isDueToday = isToday(nextWaterDate) && !alreadyWateredToday;
  const isDueTomorrow = isTomorrow(nextWaterDate);
  const isOverdue = nextWaterDate < now && !alreadyWateredToday;

  const handleWaterClick = async (e) => {
    e.stopPropagation();
    setIsWatering(true);
    await onWater(plant.id);
    setTimeout(() => setIsWatering(false), 600);
  };

  const roomInfo = ROOMS.find(r => r.id === plant.room) || ROOMS[0];
  const RoomIcon = roomInfo.icon;

  // Détermination du message et de la couleur du status
  let statusText = `Dans ${daysLeft} jours`;
  let statusColor = "text-jungle-green";

  if (alreadyWateredToday) {
    statusText = "Fraichement hydratée";
    statusColor = "text-jungle-sage";
  } else if (isOverdue || isDueToday) {
    statusText = "À arroser aujourd'hui";
    statusColor = "text-jungle-terracotta";
  } else if (isDueTomorrow) {
    statusText = "À arroser demain";
    statusColor = "text-jungle-terracotta";
  }

  return (
    <div className="bg-white rounded-[2.5rem] p-4 shadow-sm hover:shadow-xl transition-all group relative">
      <div className="relative h-64 w-full overflow-hidden rounded-[2rem]">
        <img src={plant.imageUrl} className="w-full h-full object-cover" alt={plant.name} />
        
        {(isOverdue || isDueToday) && (
          <div className="absolute top-4 left-4 bg-jungle-terracotta text-white text-[10px] font-bold px-3 py-1.5 rounded-xl animate-bounce flex items-center gap-1">
            <Droplets size={10} fill="white" /> SOIF
          </div>
        )}
        
        <button onClick={(e) => { e.stopPropagation(); onEdit(plant); }} className="absolute top-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-sm text-jungle-green">
          <Edit2 size={16} />
        </button>

        <div className="absolute bottom-4 left-4 bg-black/20 backdrop-blur-md px-3 py-2 rounded-xl flex items-center gap-2 text-white border border-white/20">
          {plant.waterType === 'bain' ? <Bath size={14} /> : <ShowerHead size={14} />}
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
              <Droplets key={n} size={8} fill={n <= (plant.waterAmount || 3) ? "white" : "none"} stroke="white" strokeWidth={2} />
            ))}
          </div>
        </div>
      </div>
      
      <div className="mt-4 px-2 text-left">
        <div className="flex items-center gap-2 mb-1">
           <span className="flex items-center gap-1 text-[10px] font-bold text-jungle-sage uppercase tracking-widest"><RoomIcon size={12}/> {roomInfo.label}</span>
           <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <MapPin size={12} /> {plant.spot || 'Non précisé'}
          </span>
        </div>

        {/* Nom de la plante */}
        <h3 className="font-rounded font-bold text-2xl text-jungle-green capitalize leading-tight">
          {plant.name}
        </h3>
        
        {/* Affichage de la variété juste sous le nom */}
        {plant.variety && (
          <p className="font-sans text-sm text-jungle-sage/70 font-medium italic mt-0.5 mb-3">
            {plant.variety}
          </p>
        )}

        <div className="flex items-center gap-2 text-gray-400 text-[10px] mb-4 bg-gray-50 w-fit px-3 py-1.5 rounded-full uppercase font-bold tracking-wider">
          <Calendar size={12} />
          Dernier : {format(lastWaterDate, "d MMMM", { locale: fr })}
        </div>

        <div className="flex items-center justify-between bg-jungle-cream/50 p-4 rounded-[1.8rem] border border-white">
          <div className="text-left">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</p>
            <p className={`text-sm font-bold ${statusColor}`}>
              {statusText}
            </p>
            {alreadyWateredToday && (
              <p className="text-[9px] text-gray-400 mt-0.5 font-medium">
                Prochain : {format(nextWaterDate, "d MMMM", { locale: fr })}
              </p>
            )}
          </div>
          
          <button 
            onClick={handleWaterClick}
            disabled={isWatering}
            className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all relative overflow-hidden ${
              isWatering ? 'scale-90 bg-blue-500' : (isOverdue || isDueToday) ? 'bg-jungle-terracotta shadow-lg' : 'bg-white shadow-sm'
            }`}
          >
            <Droplets 
              size={24} 
              className={`${isWatering ? 'animate-bounce text-white' : (isOverdue || isDueToday) ? 'text-white' : 'text-jungle-sage'}`} 
              fill="currentColor" 
              fillOpacity={0.3} 
            />
          </button>
        </div>
      </div>
    </div>
  );
}