export type TableShape = 'round' | 'rectangle' | 'square';

export interface Table {
    id: string;
    number: number;
    seats: number;
    label: string | null;
    pos_x: number;
    pos_y: number;
    created_at: string;
    shape: TableShape;
    width: number;
    height: number;
    table_seats: TableSeat[];
}

export interface TableSeat {
    id: string;
    table_id: string;
    seat_index: number;
    relative_x: number;
    relative_y: number;
}

export type RsvpStatus = 'pending' | 'confirmed' | 'declined';

export interface Guest {
    id: string;
    first_name: string;
    last_name: string;
    initials: string;
    table_id: string | null;
    seat_id: string | null;
    created_at: string;
    rsvp_status: RsvpStatus;
    rsvp_party_size: number | null;
    rsvp_note: string | null;
    rsvp_responded_at: string | null;
}

export interface GuestWithTable extends Guest {
    tables: Pick<Table, 'id' | 'number' | 'shape' | 'label'> | null;
    table_seats: Pick<TableSeat, 'seat_index'> | null;
}

export interface TableWithSeats extends Table {
    table_seats: TableSeat[];
}

export interface SeatWithGuest extends TableSeat {
    guests: Pick<Guest, 'id' | 'first_name' | 'last_name' | 'initials'> | null;
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