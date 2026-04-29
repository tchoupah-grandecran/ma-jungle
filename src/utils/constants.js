import { 
  Sofa, 
  Monitor, 
  BedDouble, 
  Sun, 
  TrendingUp, 
  Stethoscope, 
  Sprout, 
  AlertTriangle 
} from 'lucide-react';

export const ROOMS = [
  { id: 'salon', label: 'Salon', icon: Sofa },
  { id: 'bureau', label: 'Bureau', icon: Monitor },
  { id: 'chambre', label: 'Chambre', icon: BedDouble },
  { id: 'terrasse', label: 'Terrasse', icon: Sun },
];

export const SPOTS = [
  'Bibliothèque', 'Frigo', 'Meuble TV', 'Fenêtre', 'Baie vitrée', 'Sol', 'Étagère'
];

export const NOTE_TYPES = [
  { id: 'growth', label: 'Croissance', icon: TrendingUp },
  { id: 'care', label: 'Soin', icon: Stethoscope },
  { id: 'repot', label: 'Rempotage', icon: Sprout },
  { id: 'alert', label: 'Alerte', icon: AlertTriangle }
];