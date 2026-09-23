import { VenueElementShape } from "@/types/seating";

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "14.5";
    };
    public: {
        Tables: {
            admins: {
                Row: {
                    created_at: string;
                    email: string;
                    id: string;
                };
                Insert: {
                    created_at?: string;
                    email: string;
                    id: string;
                };
                Update: {
                    created_at?: string;
                    email?: string;
                    id?: string;
                };
                Relationships: [];
            };
            events: {
                Row: {
                    active: boolean;
                    created_at: string;
                    date: string;
                    id: string;
                    name: string;
                    slug: string;
                    wedding_id: string;
                };
                Insert: {
                    active?: boolean;
                    created_at?: string;
                    date: string;
                    id?: string;
                    name: string;
                    slug: string;
                    wedding_id: string;
                };
                Update: {
                    active?: boolean;
                    created_at?: string;
                    date?: string;
                    id?: string;
                    name?: string;
                    slug?: string;
                    wedding_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "events_wedding_id_fkey";
                        columns: ["wedding_id"];
                        isOneToOne: false;
                        referencedRelation: "weddings";
                        referencedColumns: ["id"];
                    },
                ];
            };
            gallery_tokens: {
                Row: {
                    created_at: string;
                    created_by: string | null;
                    event_id: string;
                    expires_at: string | null;
                    id: string;
                    label: string | null;
                    photo_filter: string;
                    show_hidden: boolean;
                    show_messages: boolean;
                    token: string;
                    wedding_id: string;
                };
                Insert: {
                    created_at?: string;
                    created_by?: string | null;
                    event_id: string;
                    expires_at?: string | null;
                    id?: string;
                    label?: string | null;
                    photo_filter?: string;
                    show_hidden?: boolean;
                    show_messages?: boolean;
                    token?: string;
                    wedding_id: string;
                };
                Update: {
                    created_at?: string;
                    created_by?: string | null;
                    event_id?: string;
                    expires_at?: string | null;
                    id?: string;
                    label?: string | null;
                    photo_filter?: string;
                    show_hidden?: boolean;
                    show_messages?: boolean;
                    token?: string;
                    wedding_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "gallery_tokens_event_id_fkey";
                        columns: ["event_id"];
                        isOneToOne: false;
                        referencedRelation: "events";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "gallery_tokens_wedding_id_fkey";
                        columns: ["wedding_id"];
                        isOneToOne: false;
                        referencedRelation: "weddings";
                        referencedColumns: ["id"];
                    },
                ];
            };
            guests: {
                Row: {
                    created_at: string;
                    first_name: string;
                    id: string;
                    initials: string;
                    last_name: string;
                    seat_id: string | null;
                    table_id: string | null;
                    wedding_id: string;
                    guest_token: string;
                    rsvp_status: "pending" | "confirmed" | "declined";
                    rsvp_party_size: number | null;
                    rsvp_note: string | null;
                    rsvp_responded_at: string | null;
                    rsvp_source: "admin" | "api" | "find_seat" | null;
                    rsvp_updated_by_key_id: string | null;
                };
                Insert: {
                    created_at?: string;
                    first_name: string;
                    id?: string;
                    initials: string;
                    last_name: string;
                    seat_id?: string | null;
                    table_id?: string | null;
                    wedding_id: string;
                    guest_token?: string;
                    rsvp_status?: "pending" | "confirmed" | "declined";
                    rsvp_party_size?: number | null;
                    rsvp_note?: string | null;
                    rsvp_responded_at?: string | null;
                    rsvp_source?: "admin" | "api" | "find_seat" | null;
                    rsvp_updated_by_key_id?: string | null;
                };
                Update: {
                    created_at?: string;
                    first_name?: string;
                    id?: string;
                    initials?: string;
                    last_name?: string;
                    seat_id?: string | null;
                    table_id?: string | null;
                    wedding_id?: string;
                    guest_token?: string;
                    rsvp_status?: "pending" | "confirmed" | "declined";
                    rsvp_party_size?: number | null;
                    rsvp_note?: string | null;
                    rsvp_responded_at?: string | null;
                    rsvp_source?: "admin" | "api" | "find_seat" | null;
                    rsvp_updated_by_key_id?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "guests_seat_id_fkey";
                        columns: ["seat_id"];
                        isOneToOne: false;
                        referencedRelation: "table_seats";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "guests_table_id_fkey";
                        columns: ["table_id"];
                        isOneToOne: false;
                        referencedRelation: "tables";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "guests_wedding_id_fkey";
                        columns: ["wedding_id"];
                        isOneToOne: false;
                        referencedRelation: "weddings";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "guests_rsvp_updated_by_key_id_fkey";
                        columns: ["rsvp_updated_by_key_id"];
                        isOneToOne: false;
                        referencedRelation: "wedding_rsvp_api_keys";
                        referencedColumns: ["id"];
                    },
                ];
            };
            wedding_rsvp_api_keys: {
                Row: {
                    id: string;
                    wedding_id: string;
                    key_prefix: string;
                    key_hash: string;
                    label: string | null;
                    created_at: string;
                    created_by: string | null;
                    last_used_at: string | null;
                    revoked_at: string | null;
                };
                Insert: {
                    id?: string;
                    wedding_id: string;
                    key_prefix: string;
                    key_hash: string;
                    label?: string | null;
                    created_at?: string;
                    created_by?: string | null;
                    last_used_at?: string | null;
                    revoked_at?: string | null;
                };
                Update: {
                    id?: string;
                    wedding_id?: string;
                    key_prefix?: string;
                    key_hash?: string;
                    label?: string | null;
                    created_at?: string;
                    created_by?: string | null;
                    last_used_at?: string | null;
                    revoked_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "wedding_rsvp_api_keys_wedding_id_fkey";
                        columns: ["wedding_id"];
                        isOneToOne: false;
                        referencedRelation: "weddings";
                        referencedColumns: ["id"];
                    },
                ];
            };
            rsvp_api_rate_limits: {
                Row: {
                    wedding_id: string;
                    key_hash: string;
                    window_started_at: string;
                    request_count: number;
                    updated_at: string;
                };
                Insert: {
                    wedding_id: string;
                    key_hash: string;
                    window_started_at?: string;
                    request_count?: number;
                    updated_at?: string;
                };
                Update: {
                    wedding_id?: string;
                    key_hash?: string;
                    window_started_at?: string;
                    request_count?: number;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "rsvp_api_rate_limits_wedding_id_fkey";
                        columns: ["wedding_id"];
                        isOneToOne: false;
                        referencedRelation: "weddings";
                        referencedColumns: ["id"];
                    },
                ];
            };
            photos: {
                Row: {
                    approved: boolean;
                    created_at: string;
                    event_id: string;
                    favourite: boolean;
                    file_size: number;
                    guest_name: string | null;
                    height: number | null;
                    hidden: boolean;
                    id: string;
                    is_public: boolean;
                    message: string | null;
                    mime_type: string;
                    original_path: string;
                    thumbnail_path: string;
                    uploaded_by_session: string;
                    wedding_id: string;
                    width: number | null;
                };
                Insert: {
                    approved?: boolean;
                    created_at?: string;
                    event_id: string;
                    favourite?: boolean;
                    file_size: number;
                    guest_name?: string | null;
                    height?: number | null;
                    hidden?: boolean;
                    id?: string;
                    is_public?: boolean;
                    message?: string | null;
                    mime_type: string;
                    original_path: string;
                    thumbnail_path: string;
                    uploaded_by_session: string;
                    wedding_id: string;
                    width?: number | null;
                };
                Update: {
                    approved?: boolean;
                    created_at?: string;
                    event_id?: string;
                    favourite?: boolean;
                    file_size?: number;
                    guest_name?: string | null;
                    height?: number | null;
                    hidden?: boolean;
                    id?: string;
                    is_public?: boolean;
                    message?: string | null;
                    mime_type?: string;
                    original_path?: string;
                    thumbnail_path?: string;
                    uploaded_by_session?: string;
                    wedding_id?: string;
                    width?: number | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "photos_event_id_fkey";
                        columns: ["event_id"];
                        isOneToOne: false;
                        referencedRelation: "events";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "photos_wedding_id_fkey";
                        columns: ["wedding_id"];
                        isOneToOne: false;
                        referencedRelation: "weddings";
                        referencedColumns: ["id"];
                    },
                ];
            };
            tables: {
                Row: {
                    created_at: string;
                    height: number;
                    id: string;
                    label: string | null;
                    number: number;
                    pos_x: number;
                    pos_y: number;
                    seats: number;
                    shape: "round" | "rectangle" | "square";
                    wedding_id: string;
                    width: number;
                };
                Insert: {
                    created_at?: string;
                    height?: number;
                    id?: string;
                    label?: string | null;
                    number: number;
                    pos_x?: number;
                    pos_y?: number;
                    seats: number;
                    shape?: "round" | "rectangle" | "square";
                    wedding_id: string;
                    width?: number;
                };
                Update: {
                    created_at?: string;
                    height?: number;
                    id?: string;
                    label?: string | null;
                    number?: number;
                    pos_x?: number;
                    pos_y?: number;
                    seats?: number;
                    shape?: "round" | "rectangle" | "square";
                    wedding_id?: string;
                    width?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: "tables_wedding_id_fkey";
                        columns: ["wedding_id"];
                        isOneToOne: false;
                        referencedRelation: "weddings";
                        referencedColumns: ["id"];
                    },
                ];
            };
            table_seats: {
                Row: {
                    id: string;
                    table_id: string;
                    seat_index: number;
                    relative_x: number;
                    relative_y: number;
                };
                Insert: {
                    id?: string;
                    table_id: string;
                    seat_index: number;
                    relative_x: number;
                    relative_y: number;
                };
                Update: {
                    id?: string;
                    table_id?: string;
                    seat_index?: number;
                    relative_x?: number;
                    relative_y?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: "table_seats_table_id_fkey";
                        columns: ["table_id"];
                        isOneToOne: false;
                        referencedRelation: "tables";
                        referencedColumns: ["id"];
                    },
                ];
            };
            venue_elements: {
                Row: {
                    created_at: string | null;
                    height: number;
                    id: string;
                    label: string;
                    pos_x: number;
                    pos_y: number;
                    type: string;
                    wedding_id: string;
                    width: number;
                    icon: string;
                    shape: VenueElementShape;
                    color: string;
                };
                Insert: {
                    created_at?: string | null;
                    height?: number;
                    id?: string;
                    label?: string;
                    pos_x?: number;
                    pos_y?: number;
                    type: string;
                    wedding_id: string;
                    width?: number;
                    icon: string;
                    shape: VenueElementShape;
                    color: string;
                };
                Update: {
                    created_at?: string | null;
                    height?: number;
                    id?: string;
                    label?: string;
                    pos_x?: number;
                    pos_y?: number;
                    type?: string;
                    wedding_id?: string;
                    width?: number;
                    icon?: string;
                    shape?: VenueElementShape;
                    color?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "venue_elements_wedding_id_fkey";
                        columns: ["wedding_id"];
                        isOneToOne: false;
                        referencedRelation: "weddings";
                        referencedColumns: ["id"];
                    },
                ];
            };
            wedding_settings: {
                Row: {
                    enable_couple_login: boolean;
                    enable_find_seat: boolean;
                    enable_photo_upload: boolean;
                    auto_approve_uploads: boolean;
                    theme_hue: number | null;
                    wedding_id: string;
                    max_photos_total: number | null;
                    max_photos_per_guest: number | null;
                    photo_retention_days: number | null;
                };
                Insert: {
                    enable_couple_login?: boolean;
                    enable_find_seat?: boolean;
                    enable_photo_upload?: boolean;
                    auto_approve_uploads?: boolean;
                    theme_hue?: number | null;
                    wedding_id: string;
                    max_photos_total?: number | null;
                    max_photos_per_guest?: number | null;
                    photo_retention_days?: number | null;
                };
                Update: {
                    enable_couple_login?: boolean;
                    enable_find_seat?: boolean;
                    enable_photo_upload?: boolean;
                    auto_approve_uploads?: boolean;
                    theme_hue?: number | null;
                    wedding_id?: string;
                    max_photos_total?: number | null;
                    max_photos_per_guest?: number | null;
                    photo_retention_days?: number | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "wedding_settings_wedding_id_fkey";
                        columns: ["wedding_id"];
                        isOneToOne: true;
                        referencedRelation: "weddings";
                        referencedColumns: ["id"];
                    },
                ];
            };
            weddings: {
                Row: {
                    bride_name: string | null;
                    bride_email?: string | null;
                    created_at: string | null;
                    groom_name: string | null;
                    groom_email: string;
                    id: string;
                    owner_user_id: string;
                    slug: string | null;
                    wedding_date: string | null;
                    plan: "basic" | "premium" | "unlimited" | "custom";
                    addons: string[];
                };
                Insert: {
                    bride_name?: string | null;
                    bride_email?: string | null;
                    created_at?: string | null;
                    groom_name?: string | null;
                    groom_email: string;
                    id?: string;
                    owner_user_id: string;
                    slug?: string | null;
                    wedding_date?: string | null;
                    plan?: "basic" | "premium" | "unlimited" | "custom";
                    addons?: string[];
                };
                Update: {
                    bride_name?: string | null;
                    bride_email?: string | null;
                    created_at?: string | null;
                    groom_name?: string | null;
                    groom_email?: string;
                    id?: string;
                    owner_user_id?: string;
                    slug?: string | null;
                    wedding_date?: string | null;
                    plan?: "basic" | "premium" | "unlimited" | "custom";
                    addons?: string[];
                };
                Relationships: [];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            generate_initials: {
                Args: { first_name: string; last_name: string };
                Returns: string;
            };
            is_admin: { Args: never; Returns: boolean };
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
    keyof Database,
    "public"
>];

export type Tables<
    DefaultSchemaTableNameOrOptions extends
            | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
            schema: keyof DatabaseWithoutInternals;
        }
        ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
            DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
        : never = never,
> = DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R;
        }
        ? R
        : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
            DefaultSchema["Views"])
        ? (DefaultSchema["Tables"] &
            DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
                Row: infer R;
            }
            ? R
            : never
        : never;

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends
            | keyof DefaultSchema["Tables"]
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
            schema: keyof DatabaseWithoutInternals;
        }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
        : never = never,
> = DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
            Insert: infer I;
        }
        ? I
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
        ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
                Insert: infer I;
            }
            ? I
            : never
        : never;

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends
            | keyof DefaultSchema["Tables"]
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
            schema: keyof DatabaseWithoutInternals;
        }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
        : never = never,
> = DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
            Update: infer U;
        }
        ? U
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
        ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
                Update: infer U;
            }
            ? U
            : never
        : never;

export type Enums<
    DefaultSchemaEnumNameOrOptions extends
            | keyof DefaultSchema["Enums"]
        | { schema: keyof DatabaseWithoutInternals },
    EnumName extends DefaultSchemaEnumNameOrOptions extends {
            schema: keyof DatabaseWithoutInternals;
        }
        ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
        : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
    ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
        ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
        : never;

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
            | keyof DefaultSchema["CompositeTypes"]
        | { schema: keyof DatabaseWithoutInternals },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
            schema: keyof DatabaseWithoutInternals;
        }
        ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
        : never = never,
> = PublicCompositeTypeNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
        ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
        : never;

export const Constants = {
    public: {
        Enums: {},
    },
} as const;

export type Photo = Database["public"]["Tables"]["photos"]["Row"];
export type PhotoInsert = Database["public"]["Tables"]["photos"]["Insert"];
export type PhotoUpdate = Database["public"]["Tables"]["photos"]["Update"];
export type Event = Database["public"]["Tables"]["events"]["Row"];
export type Admin = Database["public"]["Tables"]["admins"]["Row"];
export type GalleryTokens =
    Database["public"]["Tables"]["gallery_tokens"]["Row"];
export type VenueElements =
    Database["public"]["Tables"]["venue_elements"]["Row"];
export type VenueElementInsert =
    Database["public"]["Tables"]["venue_elements"]["Insert"];
export type VenueElementUpdate =
    Database["public"]["Tables"]["venue_elements"]["Update"];
export type Wedding = Database["public"]["Tables"]["weddings"]["Row"];
export type WeddingSettings =
    Database["public"]["Tables"]["wedding_settings"]["Row"];
export type Guest = Database["public"]["Tables"]["guests"]["Row"];
export type GuestInsert = Database["public"]["Tables"]["guests"]["Insert"];
export type GuestUpdate = Database["public"]["Tables"]["guests"]["Update"];
export type Table = Database["public"]["Tables"]["tables"]["Row"];
export type TableInsert = Database["public"]["Tables"]["tables"]["Insert"];
export type TableUpdate = Database["public"]["Tables"]["tables"]["Update"];
export type WeddingUpdate = Database["public"]["Tables"]["weddings"]["Update"];
export type WeddingSettingsUpdate =
    Database["public"]["Tables"]["wedding_settings"]["Update"];
export type TableSeat = Database["public"]["Tables"]["table_seats"]["Row"];
export type TableSeatInsert =
    Database["public"]["Tables"]["table_seats"]["Insert"];
export type TableSeatUpdate =
    Database["public"]["Tables"]["table_seats"]["Update"];
export type RsvpApiKey =
    Database["public"]["Tables"]["wedding_rsvp_api_keys"]["Row"];
export type RsvpApiKeyInsert =
    Database["public"]["Tables"]["wedding_rsvp_api_keys"]["Insert"];
export type RsvpApiKeyUpdate =
    Database["public"]["Tables"]["wedding_rsvp_api_keys"]["Update"];
export type RsvpStatus = Guest["rsvp_status"];
