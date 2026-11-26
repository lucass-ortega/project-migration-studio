export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: string
          updated_at: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          updated_at?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_settings: {
        Row: {
          created_at: string
          currency: string
          deposit_type: string | null
          deposit_value: number | null
          id: number
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          deposit_type?: string | null
          deposit_value?: number | null
          id?: number
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          deposit_type?: string | null
          deposit_value?: number | null
          id?: number
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          country: string
          created_at: string
          dni: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          country: string
          created_at?: string
          dni: string
          email: string
          first_name: string
          id?: string
          last_name: string
          phone: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          country?: string
          created_at?: string
          dni?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      reservation_counters: {
        Row: {
          last_value: number
          year: number
        }
        Insert: {
          last_value?: number
          year: number
        }
        Update: {
          last_value?: number
          year?: number
        }
        Relationships: []
      }
      reservations: {
        Row: {
          created_at: string
          customer_id: string
          customer_notes: string | null
          daily_price_snapshot: number | null
          deposit_amount: number | null
          duration_days: number
          id: string
          idempotency_key: string
          pickup_address: string
          pickup_city: string
          pickup_datetime: string
          pickup_location_type: string
          pickup_reference: string | null
          remaining_amount: number | null
          request_fingerprint: string | null
          reservation_number: string
          return_address: string
          return_city: string
          return_datetime: string
          return_location_type: string
          return_reference: string | null
          same_return_location: boolean
          status: string
          total_amount: number | null
          updated_at: string
          vehicle_id: string
          vehicle_snapshot: Json
        }
        Insert: {
          created_at?: string
          customer_id: string
          customer_notes?: string | null
          daily_price_snapshot?: number | null
          deposit_amount?: number | null
          duration_days: number
          id?: string
          idempotency_key: string
          pickup_address: string
          pickup_city: string
          pickup_datetime: string
          pickup_location_type: string
          pickup_reference?: string | null
          remaining_amount?: number | null
          request_fingerprint?: string | null
          reservation_number: string
          return_address: string
          return_city: string
          return_datetime: string
          return_location_type: string
          return_reference?: string | null
          same_return_location?: boolean
          status?: string
          total_amount?: number | null
          updated_at?: string
          vehicle_id: string
          vehicle_snapshot: Json
        }
        Update: {
          created_at?: string
          customer_id?: string
          customer_notes?: string | null
          daily_price_snapshot?: number | null
          deposit_amount?: number | null
          duration_days?: number
          id?: string
          idempotency_key?: string
          pickup_address?: string
          pickup_city?: string
          pickup_datetime?: string
          pickup_location_type?: string
          pickup_reference?: string | null
          remaining_amount?: number | null
          request_fingerprint?: string | null
          reservation_number?: string
          return_address?: string
          return_city?: string
          return_datetime?: string
          return_location_type?: string
          return_reference?: string | null
          same_return_location?: boolean
          status?: string
          total_amount?: number | null
          updated_at?: string
          vehicle_id?: string
          vehicle_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vehicle_blocks: {
        Row: {
          created_at: string
          created_by: string
          end_at: string
          id: string
          reason: string
          start_at: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          end_at: string
          id?: string
          reason: string
          start_at: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_at?: string
          id?: string
          reason?: string
          start_at?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_blocks_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string
          category: string
          created_at: string
          daily_price: number | null
          description: string | null
          features: string[]
          fuel_type: string | null
          id: string
          images: string[]
          is_active: boolean
          luggage_capacity: number | null
          model: string
          passenger_capacity: number
          sort_order: number
          transmission: string
          updated_at: string
          year: number
        }
        Insert: {
          brand: string
          category: string
          created_at?: string
          daily_price?: number | null
          description?: string | null
          features?: string[]
          fuel_type?: string | null
          id?: string
          images?: string[]
          is_active?: boolean
          luggage_capacity?: number | null
          model: string
          passenger_capacity: number
          sort_order?: number
          transmission: string
          updated_at?: string
          year: number
        }
        Update: {
          brand?: string
          category?: string
          created_at?: string
          daily_price?: number | null
          description?: string | null
          features?: string[]
          fuel_type?: string | null
          id?: string
          images?: string[]
          is_active?: boolean
          luggage_capacity?: number | null
          model?: string
          passenger_capacity?: number
          sort_order?: number
          transmission?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      public_business_settings: {
        Row: {
          currency: string | null
          deposit_type: string | null
          deposit_value: number | null
          whatsapp_number: string | null
        }
        Insert: {
          currency?: string | null
          deposit_type?: string | null
          deposit_value?: number | null
          whatsapp_number?: string | null
        }
        Update: {
          currency?: string | null
          deposit_type?: string | null
          deposit_value?: number | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_reservation_number: { Args: never; Returns: string }
      public_occupied_periods: {
        Args: { _end: string; _start: string }
        Returns: {
          end_at: string
          start_at: string
          vehicle_id: string
        }[]
      }
      submit_reservation_request: { Args: { _request: Json }; Returns: Json }
    }
    Enums: {
      app_role: "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin"],
    },
  },
} as const
