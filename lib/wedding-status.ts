export type WeddingStatus = 'upcoming' | 'today' | 'past';

export function getWeddingStatus(weddingDate: string | null): WeddingStatus {
    if (!weddingDate) return 'upcoming';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(weddingDate);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) return 'today';
    return date > today ? 'upcoming' : 'past';
}

export const WEDDING_STATUS_LABELS: Record<WeddingStatus, string> = {
    upcoming: 'upcoming',
    today: 'today',
    past: 'past',
};

export const WEDDING_STATUS_COLORS: Record<WeddingStatus, string> = {
    upcoming: 'bg-blue-100 text-blue-700',
    today: 'bg-green-100 text-green-700',
    past: 'bg-gray-100 text-gray-500',
};