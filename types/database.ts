export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string
          name: string
          date: string
          slug: string
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          date: string
          slug: string
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          date?: string
          slug?: string
          active?: boolean
          created_at?: string
        }
      }
      photos: {
        Row: {
          id: string
          event_id: string
          uploaded_by_session: string
          guest_name: string | null
          message: string | null
          original_path: string
          thumbnail_path: string
          mime_type: string
          file_size: number
          width: number | null
          height: number | null
          approved: boolean
          hidden: boolean
          favourite: boolean
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          uploaded_by_session: string
          guest_name?: string | null
          message?: string | null
          original_path: string
          thumbnail_path: string
          mime_type: string
          file_size: number
          width?: number | null
          height?: number | null
          approved?: boolean
          hidden?: boolean
          favourite?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          uploaded_by_session?: string
          guest_name?: string | null
          message?: string | null
          original_path?: string
          thumbnail_path?: string
          mime_type?: string
          file_size?: number
          width?: number | null
          height?: number | null
          approved?: boolean
          hidden?: boolean
          favourite?: boolean
          created_at?: string
        }
      }
      admins: {
        Row: {
          id: string
          email: string
          created_at: string
        }
        Insert: {
          id: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
        }
      }
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
  }
}

export type Photo = Database['public']['Tables']['photos']['Row']
export type PhotoInsert = Database['public']['Tables']['photos']['Insert']
export type PhotoUpdate = Database['public']['Tables']['photos']['Update']
export type Event = Database['public']['Tables']['events']['Row']
export type Admin = Database['public']['Tables']['admins']['Row']

export interface PhotoWithUrls extends Photo {
  thumbnailUrl: string
  originalUrl: string
}
