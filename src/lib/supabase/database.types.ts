export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_contributions: {
        Row: {
          amount: number
          contribution_date: string
          created_at: string
          created_by: string | null
          id: string
          partner_profile_id: string
          proof_reference: string | null
        }
        Insert: {
          amount: number
          contribution_date: string
          created_at?: string
          created_by?: string | null
          id?: string
          partner_profile_id: string
          proof_reference?: string | null
        }
        Update: {
          amount?: number
          contribution_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          partner_profile_id?: string
          proof_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capital_contributions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_contributions_partner_profile_id_fkey"
            columns: ["partner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_log_entries: {
        Row: {
          alternatives_considered: string | null
          context: string
          created_at: string
          created_by: string | null
          decided_at: string
          decision: string
          id: string
          reasoning: string | null
          title: string
        }
        Insert: {
          alternatives_considered?: string | null
          context: string
          created_at?: string
          created_by?: string | null
          decided_at: string
          decision: string
          id?: string
          reasoning?: string | null
          title: string
        }
        Update: {
          alternatives_considered?: string | null
          context?: string
          created_at?: string
          created_by?: string | null
          decided_at?: string
          decision?: string
          id?: string
          reasoning?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_log_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_entity_status: {
        Row: {
          cnpj: string | null
          created_by: string | null
          entity_type: string
          id: string
          titular_profile_id: string | null
          valid_from: string
        }
        Insert: {
          cnpj?: string | null
          created_by?: string | null
          entity_type: string
          id?: string
          titular_profile_id?: string | null
          valid_from?: string
        }
        Update: {
          cnpj?: string | null
          created_by?: string | null
          entity_type?: string
          id?: string
          titular_profile_id?: string | null
          valid_from?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_entity_status_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_entity_status_titular_profile_id_fkey"
            columns: ["titular_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_migration_triggers: {
        Row: {
          id: string
          notes: string | null
          reached_at: string | null
          status: string
          trigger_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          notes?: string | null
          reached_at?: string | null
          status?: string
          trigger_type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          notes?: string | null
          reached_at?: string | null
          status?: string
          trigger_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_migration_triggers_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mei_ceiling_parameters: {
        Row: {
          annual_ceiling: number
          created_by: string | null
          id: string
          year: number
        }
        Insert: {
          annual_ceiling: number
          created_by?: string | null
          id?: string
          year: number
        }
        Update: {
          annual_ceiling?: number
          created_by?: string | null
          id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "mei_ceiling_parameters_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_agreements: {
        Row: {
          created_by: string | null
          exit_terms: string | null
          id: string
          profit_split_rule: string
          valid_from: string
        }
        Insert: {
          created_by?: string | null
          exit_terms?: string | null
          id?: string
          profit_split_rule: string
          valid_from?: string
        }
        Update: {
          created_by?: string | null
          exit_terms?: string | null
          id?: string
          profit_split_rule?: string
          valid_from?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_agreements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          status: string
          updated_at: string
          user_type: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          status?: string
          updated_at?: string
          user_type?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_type?: string
        }
        Relationships: []
      }
      revenue_snapshots: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          monthly_revenue: number
          notes: string | null
          reference_month: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          monthly_revenue: number
          notes?: string | null
          reference_month: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          monthly_revenue?: number
          notes?: string | null
          reference_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_snapshots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          role_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          role_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          role_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sub_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          sub_role_id: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          sub_role_id: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          sub_role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sub_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sub_roles_sub_role_id_fkey"
            columns: ["sub_role_id"]
            isOneToOne: false
            referencedRelation: "sub_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sub_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mei_ceiling_status: {
        Row: {
          annual_ceiling: number | null
          percentage_reached: number | null
          revenue_last_12_months: number | null
          year: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      change_user_type: {
        Args: { p_new_type: string; p_user_id: string }
        Returns: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          status: string
          updated_at: string
          user_type: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      count_owners: { Args: never; Returns: number }
      has_role: { Args: { role_slug: string }; Returns: boolean }
      has_sub_role: { Args: { sub_role_slug: string }; Returns: boolean }
      is_owner: { Args: never; Returns: boolean }
      is_socio_or_owner: { Args: never; Returns: boolean }
      revoke_user_sessions: { Args: { p_user_id: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

