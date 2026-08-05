export interface Table {
    id: string;
    number: number;
    seats: number;
    label: string | null;
    pos_x: number;
    pos_y: number;
    created_at: string;
}

export interface Guest {
    id: string;
    first_name: string;
    last_name: string;
    initials: string;
    table_id: string | null;
    created_at: string;
}

export interface GuestWithTable extends Guest {
    tables: Pick<Table, 'id' | 'number'> | null;
}

export const GALLERY_PAGE_SIZE = 30

export type VenueElementShape = 'circle' | 'square' | 'rectangle';
export type VenueElementType = 'pool' | 'couple_table' | 'music' | 'bar' | 'toilet' | 'entrance';

export interface VenueElement {
    id: string;
    type: string;
    label: string;
    icon: string;
    shape: VenueElementShape;
    color: string;
    pos_x: number;
    pos_y: number;
    width: number;
    height: number;
}

