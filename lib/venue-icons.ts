import {
    Bath,
    Cake,
    Camera,
    Car,
    DoorOpen,
    Flame,
    Flower2,
    Gift,
    Heart,
    MapPin,
    Mic2,
    Music,
    Sparkles,
    Star,
    TreePine,
    Umbrella,
    Utensils,
    Waves,
    Wine,
} from 'lucide-react';

export const VENUE_ICONS = {
    Waves, Music, Wine, DoorOpen, Bath, Heart, Camera, Cake,
    Gift, Car, Utensils, Mic2, Flower2, Star, Sparkles, Flame,
    Umbrella, TreePine, MapPin,
} as const;

export type VenueIconKey = keyof typeof VENUE_ICONS;

export const VENUE_COLORS = {
    blue: 'border-blue-400 bg-blue-50 text-blue-600',
    rose: 'border-rose-400 bg-rose-50 text-rose-600',
    purple: 'border-purple-400 bg-purple-50 text-purple-600',
    amber: 'border-amber-400 bg-amber-50 text-amber-600',
    gray: 'border-gray-400 bg-gray-50 text-gray-600',
    green: 'border-green-500 bg-green-50 text-green-600',
    teal: 'border-teal-400 bg-teal-50 text-teal-600',
    pink: 'border-pink-400 bg-pink-50 text-pink-600',
} as const;

export type VenueColorKey = keyof typeof VENUE_COLORS;

export const VENUE_PRESETS: {
    type: string; label: string; icon: VenueIconKey; shape: 'circle' | 'square' | 'rectangle'; color: VenueColorKey;
}[] = [
    {type: 'entrance', label: 'Hyrja', icon: 'DoorOpen', shape: 'square', color: 'green'},
    {type: 'pool', label: 'Pishina', icon: 'Waves', shape: 'rectangle', color: 'blue'},
    {type: 'couple_table', label: 'Çifti', icon: 'Heart', shape: 'square', color: 'rose'},
    {type: 'music', label: 'Muzika', icon: 'Music', shape: 'square', color: 'purple'},
    {type: 'bar', label: 'Bar', icon: 'Wine', shape: 'rectangle', color: 'amber'},
    {type: 'toilet', label: 'Tualeti', icon: 'Bath', shape: 'square', color: 'gray'},
];