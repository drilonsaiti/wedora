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
  tables: Table | null;
}

export const GALLERY_PAGE_SIZE = 30
