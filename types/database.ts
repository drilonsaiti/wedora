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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      gallery_tokens: {
        Row: {
          id: string
          token: string
          event_id: string
          label: string | null
          show_messages: boolean
          expires_at: string | null
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          token?: string
          event_id: string
          label?: string | null
          show_messages?: boolean
          expires_at?: string | null
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          token?: string
          event_id?: string
          label?: string | null
          show_messages?: boolean
          expires_at?: string | null
          created_at?: string
          created_by?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Photo = Database['public']['Tables']['photos']['Row']
export type PhotoInsert = Database['public']['Tables']['photos']['Insert']
export type PhotoUpdate = Database['public']['Tables']['photos']['Update']
export type Event = Database['public']['Tables']['events']['Row']
export type Admin = Database['public']['Tables']['admins']['Row']