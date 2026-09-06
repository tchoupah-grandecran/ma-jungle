import {
  differenceInDays,
  format,
  isToday,
  isAfter,
  startOfDay,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bath,
  CalendarClock,
  CloudSun,
  Droplets,
  MapPin,
  ShowerHead,
  TreePine,
} from 'lucide-react';

import { ROOMS } from '../utils/constants';
import {
  getEffectiveLastWateringDate,
  getDynamicFrequency,
  getNextWaterDate,
  isRainWateringToday,
} from '../utils/watering';

// Règle stricte : R1 (interne) = R2 (externe) - D (distance)
// Carte externe : R2 = 48px (rounded-[3rem])
// Badges : D = 24px (top-6 / left-6) → R1 = 24px
// Bouton : D = 32px (p-8) → R1 = 16px (rounded-2xl)

export default function PlantCard({
  plant,
  weatherProfile,
  onWater,
}) {
  const [isWatering, setIsWatering] = useState(false);
  const [drops, setDrops] = useState([]);
  const btnRef = useRef(null);

  const lastWaterDate = new Date(plant.lastWatering);
  const effectiveLastWaterDate = getEffectiveLastWateringDate(
    plant,
    weatherProfile,
  );
  const nextWaterDate = getNextWaterDate(plant, weatherProfile);
  const today = startOfDay(new Date());

  const daysDiff = differenceInDays(nextWaterDate, today);
  const manuallyWateredToday = isToday(lastWaterDate);
  const wateredByRainToday = isRainWateringToday(
    plant,
    weatherProfile,
  );
  const alreadyWateredToday =
    manuallyWateredToday || wateredByRainToday;

  const isDueToday =
    isToday(nextWaterDate) && !alreadyWateredToday;

  const isOverdue =
    isAfter(today, nextWaterDate) && !alreadyWateredToday;

  const daysOverdue = isOverdue ? Math.abs(daysDiff) : 0;

  const baseFrequency =
    plant.baseFrequency ?? plant.frequency;

  const dynamicFrequency = getDynamicFrequency(
    plant,
    weatherProfile,
  );

  const hasWeatherImpact =
    dynamicFrequency !== baseFrequency;

  const weatherSpeeding =
    dynamicFrequency < baseFrequency;

  const handleWaterClick = async (event) => {
    event.stopPropagation();

    if (isWatering || alreadyWateredToday) {
      return;
    }

    const newDrops = Array.from(
      { length: 6 },
      (_, index) => ({
        id: Date.now() + index,
        angle: -60 + index * 24,
        distance: 38 + Math.random() * 22,
      }),
    );

    setDrops(newDrops);
    setTimeout(() => setDrops([]), 700);

    setIsWatering(true);

    try {
      await onWater(plant.id);
    } finally {
      setTimeout(() => setIsWatering(false), 800);
    }
  };

  const roomInfo =
    ROOMS.find((room) => room.id === plant.room) ??
    ROOMS[0];

  const RoomIcon = roomInfo.icon;

  let statusText = `J-${daysDiff}`;

  if (wateredByRainToday) {
    statusText = 'PLUIE';
  } else if (manuallyWateredToday) {
    statusText = 'OK';
  } else if (isOverdue) {
    statusText = `+${daysOverdue}J`;
  } else if (isDueToday) {
    statusText = 'SOIF';
  }

  return (
    <div
      className={`
        relative flex h-[520px] flex-col overflow-hidden
        rounded-[3rem] border shadow-sm
        transition-all duration-500
        hover:shadow-2xl
        group
        ${
          isOverdue
            ? `
              border-[#C17767]/30
              bg-[#FCFAF8]
              shadow-xl shadow-[#C17767]/10
              dark:bg-[#1E2521]
            `
            : `
              border-gray-50
              bg-white
              dark:border-white/5
              dark:bg-jungle-green
            `
        }
      `}
    >
      {/* SECTION IMAGE */}
      <div className="relative flex-grow overflow-hidden">
       <img
  src={plant.imageUrl}
  alt={plant.name}
  className="
    h-full w-full object-cover
    transition-transform duration-1000
    group-hover:scale-110
  "
/>

        {/* Dégradé conservé uniquement pour la lisibilité du nom */}
        <div
          className="
            absolute inset-x-0 bottom-0 h-1/2
            bg-gradient-to-t
            from-black/90 via-black/40 to-transparent
          "
        />

        {/* ALERTE D’ARROSAGE */}
        {isOverdue && (
          <div
            className="
              pointer-events-none absolute top-1/2 left-1/2 z-20
              -translate-x-1/2
            "
          >
            <div
              className="
                flex items-center gap-2 rounded-full
                border border-white/20
                bg-[#BF6B4E]/80 px-4 py-1.5
                text-white shadow-lg backdrop-blur-md
                dark:border-white/10 dark:bg-[#BF6B4E]/40
              "
            >
              <Droplets
                size={12}
                className="opacity-80"
              />

              <span
                className="
                  text-[10px] font-black
                  tracking-[0.2em] uppercase
                "
              >
                À arroser
              </span>
            </div>
          </div>
        )}

        {/* BADGE EAU */}
        <div
          className="
            absolute top-6 left-6
            flex items-center gap-2.5
            rounded-tl-[24px] rounded-tr-xl
            rounded-br-xl rounded-bl-xl
            bg-white/90 px-3 py-2
            shadow-sm backdrop-blur-md
            dark:bg-jungle-deep/90
          "
        >
          <div className="text-[#BF6B4E] dark:text-jungle-cream">
            {plant.waterType === 'bain' ? (
              <Bath size={14} />
            ) : (
              <ShowerHead size={14} />
            )}
          </div>

          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((level) => (
              <div
                key={level}
                className={`
                  h-1.5 w-1.5 rounded-full
                  ${
                    level <= (plant.waterAmount || 3)
                      ? isOverdue
                        ? 'bg-[#C17767]'
                        : 'bg-[#BF6B4E]'
                      : 'bg-[#BF6B4E33] dark:bg-white/10'
                  }
                `}
              />
            ))}
          </div>
        </div>

        {/* BADGE MÉTÉO */}
        {hasWeatherImpact && (
          <div
            className={`
              absolute top-6 right-6
              flex items-center gap-1.5
              rounded-tl-xl rounded-tr-[24px]
              rounded-br-xl rounded-bl-xl
              px-3 py-2
              text-white shadow-sm backdrop-blur-md
              ${
                weatherSpeeding
                  ? 'bg-orange-500/90'
                  : 'bg-blue-500/90'
              }
            `}
          >
            <CloudSun size={12} />

            <span
              className="
                text-[9px] font-black
                tracking-wide uppercase
              "
            >
              {weatherSpeeding ? '+fréq.' : '-fréq.'}
            </span>
          </div>
        )}

        {/* NOM */}
        <div
          className="
            absolute right-5 bottom-5 left-5
            overflow-visible text-left
          "
          style={{ containerType: 'inline-size' }}
        >
          <h3
            className="
              font-rounded font-black
              leading-none text-white capitalize
              whitespace-nowrap drop-shadow-2xl
            "
            style={{
              fontSize: 'clamp(24px, 11cqw, 48px)',
            }}
          >
            {plant.name}
          </h3>
        </div>
      </div>

      {/* SECTION INFORMATIONS */}
      <div
        className={`
          p-8 text-left
          transition-colors duration-500
          ${
            isOverdue
              ? 'bg-[#FCFAF8] dark:bg-transparent'
              : 'bg-white dark:bg-jungle-green'
          }
        `}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2.5">
            {plant.variety && (
              <p
                className="
                  truncate text-sm leading-tight
                  font-bold italic text-[#2A3930]
                  opacity-60
                  dark:text-jungle-cream dark:opacity-40
                "
              >
                {plant.variety}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <span
                className="
                  flex items-center gap-1.5
                  text-[10px] font-black
                  tracking-widest text-[#8A9A5B] uppercase
                  dark:text-[#A3B18A]
                "
              >
                <RoomIcon size={12} />
                {roomInfo.label}
              </span>

              <span
                className="
                  h-1 w-1 shrink-0 rounded-full
                  bg-gray-200 dark:bg-white/10
                "
              />

              <span
                className="
                  flex items-center gap-1.5 truncate
                  text-[10px] font-black
                  tracking-widest text-gray-400 uppercase
                  dark:text-gray-500
                "
              >
                <MapPin size={12} />
                {plant.spot}
              </span>

              {plant.isOutdoor && (
                <>
                  <span
                    className="
                      h-1 w-1 shrink-0 rounded-full
                      bg-gray-200 dark:bg-white/10
                    "
                  />

                  <span
                    className="
                      flex items-center gap-1.5
                      text-[10px] font-black
                      tracking-widest text-[#8A9A5B] uppercase
                      dark:text-[#A3B18A]
                    "
                  >
                    <TreePine size={12} />
                    Ext.
                  </span>
                </>
              )}
            </div>

            <div
              className="
                flex items-center gap-2
                text-[9px] font-bold
                tracking-widest text-[#2A3930]/30 uppercase
                dark:text-white/20
              "
            >
              <CalendarClock size={12} />

              <span>
                {wateredByRainToday ? 'Pluie' : 'Dernier'} :{' '}
                {format(effectiveLastWaterDate, 'd MMM', {
                  locale: fr,
                })}
              </span>
            </div>
          </div>

          {/* BOUTON D’ARROSAGE */}
          <div
            ref={btnRef}
            className="relative shrink-0"
          >
            <AnimatePresence>
              {drops.map((drop) => {
                const radians =
                  (drop.angle - 90) * (Math.PI / 180);

                const translateX =
                  Math.cos(radians) * drop.distance;

                const translateY =
                  Math.sin(radians) * drop.distance;

                return (
                  <motion.div
                    key={drop.id}
                    className="
                      pointer-events-none
                      absolute top-1/2 left-1/2 z-20
                    "
                    style={{
                      translateX: '-50%',
                      translateY: '-50%',
                    }}
                    initial={{
                      x: 0,
                      y: 0,
                      opacity: 1,
                      scale: 1,
                    }}
                    animate={{
                      x: translateX,
                      y: translateY,
                      opacity: 0,
                      scale: 0.4,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 0.55,
                      ease: 'easeOut',
                    }}
                  >
                    <Droplets
                      size={14}
                      fill="currentColor"
                      fillOpacity={0.6}
                      className="text-blue-400"
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>

            <button
              type="button"
              onClick={handleWaterClick}
              disabled={
                isWatering || alreadyWateredToday
              }
              className={`
                flex h-16 w-16 items-center justify-center
                rounded-2xl
                transition-all duration-300
                ${
                  isWatering
                    ? `
                      scale-90 bg-blue-500
                      shadow-xl shadow-blue-200
                    `
                    : alreadyWateredToday
                      ? `
                        bg-[#F9F7F2]
                        text-[#8A9A5B]/40
                        dark:bg-jungle-deep
                        dark:text-white/10
                      `
                      : isOverdue
                        ? `
                          scale-105
                          border-4 border-[#FCFAF8]
                          bg-[#BF6B4E]
                          text-[#F9F7F2]
                          shadow-xl shadow-[#C17767]/20
                          dark:border-[#1E2521]
                          dark:bg-[#1A2620]
                        `
                        : isDueToday
                          ? `
                            bg-[#BF6B4E]
                            text-white shadow-lg
                          `
                          : `
                            bg-[#F9F7F2]
                            text-[#2A3930]
                            shadow-sm
                            hover:bg-[#2A3930]
                            hover:text-white
                            dark:bg-jungle-deep
                            dark:text-jungle-cream
                            dark:hover:bg-jungle-cream
                            dark:hover:text-jungle-deep
                          `
                }
              `}
            >
              <div className="flex flex-col items-center">
                <Droplets
                  size={22}
                  fill="currentColor"
                  fillOpacity={0.3}
                  className={
                    isWatering
                      ? 'animate-bounce text-white'
                      : ''
                  }
                />

                <span
                  className="
                    mt-0.5 text-[9px]
                    font-black tracking-tighter uppercase
                  "
                >
                  {statusText}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
