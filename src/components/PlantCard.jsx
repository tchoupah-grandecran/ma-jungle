import { differenceInDays, format, isToday, isAfter, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ROOMS } from '../utils/constants';
import { Droplets, MapPin, CalendarClock, Bath, ShowerHead, AlertCircle, TreePine, CloudSun } from 'lucide-react';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getNextWaterDate, getDynamicFrequency } from '../utils/watering';

// Règle stricte : R1 (interne) = R2 (externe) - D (distance)
// Card externe : R2 = 48px (rounded-[3rem])
// Badges : D = 24px (top-6 / left-6) -> R1 = 48 - 24 = 24px
// Bouton : D = 32px (p-8) -> R1 = 48 - 32 = 16px (rounded-2xl)

export default function PlantCard({ plant, weatherFactor, onWater, onEdit }) {
  const [isWatering, setIsWatering] = useState(false);
  const [drops, setDrops] = useState([]);
  const btnRef = useRef(null);
  
  const lastWaterDate = new Date(plant.lastWatering);
  const nextWaterDate = getNextWaterDate(plant, weatherFactor);
  const today = startOfDay(new Date());
  
  const daysDiff = differenceInDays(nextWaterDate, today);
  const alreadyWateredToday = isToday(lastWaterDate);
  
  const isDueToday = isToday(nextWaterDate) && !alreadyWateredToday;
  const isOverdue = isAfter(today, nextWaterDate) && !alreadyWateredToday;
  const daysOverdue = isOverdue ? Math.abs(daysDiff) : 0;

  const baseFrequency = plant.baseFrequency ?? plant.frequency;
  const dynamicFrequency = getDynamicFrequency(plant, weatherFactor);
  const hasWeatherImpact = dynamicFrequency !== baseFrequency;
  const weatherSpeeding = dynamicFrequency < baseFrequency;

  const handleWaterClick = async (e) => {
    e.stopPropagation();
    if (isWatering || alreadyWateredToday) return;

    const newDrops = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i,
      angle: -60 + i * 24,
      distance: 38 + Math.random() * 22,
    }));
    setDrops(newDrops);
    setTimeout(() => setDrops([]), 700);

    setIsWatering(true);
    await onWater(plant.id);
    setTimeout(() => setIsWatering(false), 800);
  };

  const roomInfo = ROOMS.find(r => r.id === plant.room) || ROOMS[0];
  const RoomIcon = roomInfo.icon;

  let statusText = `J-${daysDiff}`;
  if (alreadyWateredToday) statusText = "OK";
  else if (isOverdue) statusText = `+${daysOverdue}J`;
  else if (isDueToday) statusText = "SOIF";

  return (
    <div className={`
      relative rounded-[3rem] shadow-sm hover:shadow-2xl transition-all duration-500 group overflow-hidden border flex flex-col h-[520px]
      ${isOverdue 
        ? 'bg-[#FCFAF8] dark:bg-[#1E2521] border-[#C17767]/30 shadow-[#C17767]/10 shadow-xl' 
        : 'bg-white dark:bg-jungle-green border-gray-50 dark:border-white/5'}
    `}>
      
      {/* SECTION IMAGE */}
      <div className="relative flex-grow overflow-hidden">
        <img 
          src={plant.imageUrl} 
          /* Application du filtre sépia et ajustement de la luminosité pour l'état "Oubliée" */
          className={`w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 ${
            isOverdue ? 'sepia-[.95] contrast-110 brightness-[0.8] dark:brightness-[0.6]' : 'dark:brightness-90'
          }`} 
          alt={plant.name} 
        />
        
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* NOUVELLE ALERTE ORGANIQUE — Bandeau flottant et élégant */}
        {isOverdue && (
          <div className="absolute top-50 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="bg-[#BF6B4E]/80 dark:bg-[#BF6B4E]/40 backdrop-blur-md border border-white/20 dark:border-white/10 text-white px-4 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
              <Droplets size={12} className="opacity-80" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">À arroser</span>
            </div>
          </div>
        )}

        {/* BADGE EAU — D = 24px (top-6 left-6) -> R1 = 24px sur le coin supérieur gauche */}
        <div className="absolute top-6 left-6 bg-white/90 dark:bg-jungle-deep/90 backdrop-blur-md py-2 px-3 rounded-tl-[24px] rounded-tr-xl rounded-br-xl rounded-bl-xl flex items-center gap-2.5 shadow-sm">
          <div className="text-[#BF6B4E] dark:text-jungle-cream">
            {plant.waterType === 'bain' ? <Bath size={14} /> : <ShowerHead size={14} />}
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} className={`h-1.5 w-1.5 rounded-full ${n <= (plant.waterAmount || 3) ? (isOverdue ? 'bg-[#C17767]' : 'bg-[#BF6B4E]') : 'bg-[#BF6B4E33] dark:bg-white/10'}`} />
            ))}
          </div>
        </div>

        {/* BADGE MÉTÉO — D = 24px (top-6 right-6) -> R1 = 24px sur le coin supérieur droit */}
        {hasWeatherImpact && (
          <div className={`absolute top-6 right-6 backdrop-blur-md py-2 px-3 rounded-tr-[24px] rounded-tl-xl rounded-br-xl rounded-bl-xl flex items-center gap-1.5 shadow-sm ${
            weatherSpeeding ? 'bg-orange-500/90 text-white' : 'bg-blue-500/90 text-white'
          }`}>
            <CloudSun size={12} />
            <span className="text-[9px] font-black uppercase tracking-wide">
              {weatherSpeeding ? `+fréq.` : `-fréq.`}
            </span>
          </div>
        )}

        {/* NOM */}
        <div 
          className="absolute bottom-5 left-5 right-5 text-left overflow-visible"
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
      <div className={`p-8 transition-colors duration-500 text-left ${isOverdue ? 'bg-[#FCFAF8] dark:bg-transparent' : 'bg-white dark:bg-jungle-green'}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2.5 min-w-0 flex-1">
            {plant.variety && (
              <p className="text-[#2A3930] dark:text-jungle-cream font-bold text-sm italic opacity-60 dark:opacity-40 leading-tight truncate">
                {plant.variety}
              </p>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 text-[10px] font-black text-[#8A9A5B] dark:text-[#A3B18A] uppercase tracking-widest">
                <RoomIcon size={12}/> {roomInfo.label}
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-200 dark:bg-white/10 shrink-0" />
              <span className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest truncate">
                <MapPin size={12} /> {plant.spot}
              </span>
              {plant.isOutdoor && (
                <>
                  <span className="w-1 h-1 rounded-full bg-gray-200 dark:bg-white/10 shrink-0" />
                  <span className="flex items-center gap-1.5 text-[10px] font-black text-[#8A9A5B] dark:text-[#A3B18A] uppercase tracking-widest">
                    <TreePine size={12} /> Ext.
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 text-[#2A3930]/30 dark:text-white/20 text-[9px] font-bold uppercase tracking-widest">
              <CalendarClock size={12} />
              <span>Dernier : {format(lastWaterDate, "d MMM", { locale: fr })}</span>
            </div>
          </div>

          {/* BOUTON — D = 32px (p-8) -> R1 = 16px (rounded-2xl) */}
          <div className="relative shrink-0" ref={btnRef}>
            <AnimatePresence>
              {drops.map((drop) => {
                // ... (inchangé)
                const rad = (drop.angle - 90) * (Math.PI / 180);
                const tx = Math.cos(rad) * drop.distance;
                const ty = Math.sin(rad) * drop.distance;
                return (
                  <motion.div
                    key={drop.id}
                    className="absolute left-1/2 top-1/2 pointer-events-none z-20"
                    style={{ translateX: '-50%', translateY: '-50%' }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{ x: tx, y: ty, opacity: 0, scale: 0.4 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.55, ease: 'easeOut' }}
                  >
                    <Droplets size={14} className="text-blue-400" fill="currentColor" fillOpacity={0.6} />
                  </motion.div>
                );
              })}
            </AnimatePresence>

            <button 
              onClick={handleWaterClick}
              disabled={isWatering || alreadyWateredToday}
              className={`h-16 w-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                isWatering ? 'bg-blue-500 scale-90 shadow-blue-200 shadow-xl' : 
                alreadyWateredToday ? 'bg-[#F9F7F2] dark:bg-jungle-deep text-[#8A9A5B]/40 dark:text-white/10' :
                isOverdue ? 'bg-[#BF6B4E] dark:bg-[#1A2620] text-[#F9F7F2] shadow-[#C17767]/20 shadow-xl scale-105 border-4 border-[#FCFAF8] dark:border-[#1E2521]' :
                isDueToday ? 'bg-[#BF6B4E] text-white shadow-lg' : 
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
    </div>
  );
}