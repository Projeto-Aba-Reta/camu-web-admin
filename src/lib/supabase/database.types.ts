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
      b2b_pricing_tiers: {
        Row: {
          created_by: string | null
          id: string
          min_quantity: number
          target_margin_pct: number
          valid_from: string
        }
        Insert: {
          created_by?: string | null
          id?: string
          min_quantity: number
          target_margin_pct: number
          valid_from?: string
        }
        Update: {
          created_by?: string | null
          id?: string
          min_quantity?: number
          target_margin_pct?: number
          valid_from?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_pricing_tiers_created_by_fkey"
            columns: ["created_by"]
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
      channel_fees: {
        Row: {
          channel: string
          created_by: string | null
          fixed_fee: number
          id: string
          percentage_fee: number
          valid_from: string
        }
        Insert: {
          channel: string
          created_by?: string | null
          fixed_fee?: number
          id?: string
          percentage_fee: number
          valid_from?: string
        }
        Update: {
          channel?: string
          created_by?: string | null
          fixed_fee?: number
          id?: string
          percentage_fee?: number
          valid_from?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_fees_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commemorative_dates_marketing: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          rule_type: string
          rule_value: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          rule_type: string
          rule_value: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          rule_type?: string
          rule_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "commemorative_dates_marketing_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_parameters: {
        Row: {
          average_power_watts: number
          created_by: string | null
          energy_cost_per_kwh: number
          failure_reserve_pct: number
          filament_cost_per_kg: number
          id: string
          packaging_cost: number
          target_margin_pct: number
          valid_from: string
        }
        Insert: {
          average_power_watts: number
          created_by?: string | null
          energy_cost_per_kwh: number
          failure_reserve_pct: number
          filament_cost_per_kg: number
          id?: string
          packaging_cost: number
          target_margin_pct?: number
          valid_from?: string
        }
        Update: {
          average_power_watts?: number
          created_by?: string | null
          energy_cost_per_kwh?: number
          failure_reserve_pct?: number
          filament_cost_per_kg?: number
          id?: string
          packaging_cost?: number
          target_margin_pct?: number
          valid_from?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_parameters_created_by_fkey"
            columns: ["created_by"]
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
      material_stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          material_id: string
          movement_type: string
          notes: string | null
          printer_id: string | null
          product_id: string | null
          quantity: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id: string
          movement_type: string
          notes?: string | null
          printer_id?: string | null
          product_id?: string | null
          quantity: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id?: string
          movement_type?: string
          notes?: string | null
          printer_id?: string | null
          product_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "material_stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_stock_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_stock_balances"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "material_stock_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_stock_movements_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "printers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_stock_balances"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "material_stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      material_stock_thresholds: {
        Row: {
          id: string
          material_id: string
          minimum_quantity: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          material_id: string
          minimum_quantity: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          material_id?: string
          minimum_quantity?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_stock_thresholds_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: true
            referencedRelation: "material_stock_balances"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "material_stock_thresholds_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: true
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_stock_thresholds_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          reference_cost: number
          type: string
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          reference_cost: number
          type: string
          unit: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          reference_cost?: number
          type?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_created_by_fkey"
            columns: ["created_by"]
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
      price_calculations: {
        Row: {
          b2b_prices: Json
          channel_prices: Json
          component_breakdown: Json | null
          cost_breakdown: Json
          cost_parameters_id: string
          created_at: string
          created_by: string | null
          effective_b2c_margin: Json | null
          id: string
          print_hours: number | null
          printer_id: string | null
          product_id: string | null
          slicing_sheet_id: string | null
          suggested_tier: string | null
          total_cost: number
          weight_grams: number | null
        }
        Insert: {
          b2b_prices?: Json
          channel_prices: Json
          component_breakdown?: Json | null
          cost_breakdown: Json
          cost_parameters_id: string
          created_at?: string
          created_by?: string | null
          effective_b2c_margin?: Json | null
          id?: string
          print_hours?: number | null
          printer_id?: string | null
          product_id?: string | null
          slicing_sheet_id?: string | null
          suggested_tier?: string | null
          total_cost: number
          weight_grams?: number | null
        }
        Update: {
          b2b_prices?: Json
          channel_prices?: Json
          component_breakdown?: Json | null
          cost_breakdown?: Json
          cost_parameters_id?: string
          created_at?: string
          created_by?: string | null
          effective_b2c_margin?: Json | null
          id?: string
          print_hours?: number | null
          printer_id?: string | null
          product_id?: string | null
          slicing_sheet_id?: string | null
          suggested_tier?: string | null
          total_cost?: number
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "price_calculations_cost_parameters_id_fkey"
            columns: ["cost_parameters_id"]
            isOneToOne: false
            referencedRelation: "cost_parameters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_calculations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_calculations_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "printers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_calculations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_stock_balances"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "price_calculations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_calculations_slicing_sheet_id_fkey"
            columns: ["slicing_sheet_id"]
            isOneToOne: false
            referencedRelation: "product_slicing_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      print_queue_item_materials: {
        Row: {
          id: string
          material_id: string
          piece_grams: number
          print_queue_item_id: string
          support_grams: number
        }
        Insert: {
          id?: string
          material_id: string
          piece_grams?: number
          print_queue_item_id: string
          support_grams?: number
        }
        Update: {
          id?: string
          material_id?: string
          piece_grams?: number
          print_queue_item_id?: string
          support_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "print_queue_item_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_stock_balances"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "print_queue_item_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_queue_item_materials_print_queue_item_id_fkey"
            columns: ["print_queue_item_id"]
            isOneToOne: false
            referencedRelation: "print_queue_items"
            referencedColumns: ["id"]
          },
        ]
      }
      print_queue_items: {
        Row: {
          created_at: string
          created_by: string | null
          expected_finish_at: string | null
          finished_at: string | null
          id: string
          printer_id: string | null
          product_id: string
          quantity: number
          started_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_finish_at?: string | null
          finished_at?: string | null
          id?: string
          printer_id?: string | null
          product_id: string
          quantity: number
          started_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_finish_at?: string | null
          finished_at?: string | null
          id?: string
          printer_id?: string | null
          product_id?: string
          quantity?: number
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_queue_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_queue_items_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "printers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_queue_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_stock_balances"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "print_queue_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      printers: {
        Row: {
          created_by: string | null
          depreciation_per_hour: number
          id: string
          is_active: boolean
          model: string
          name: string
          valid_from: string
        }
        Insert: {
          created_by?: string | null
          depreciation_per_hour: number
          id?: string
          is_active?: boolean
          model: string
          name: string
          valid_from?: string
        }
        Update: {
          created_by?: string | null
          depreciation_per_hour?: number
          id?: string
          is_active?: boolean
          model?: string
          name?: string
          valid_from?: string
        }
        Relationships: [
          {
            foreignKeyName: "printers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_channel_listings: {
        Row: {
          channel: string
          created_at: string
          id: string
          is_active: boolean
          listed_price: number
          price_override_reason: string | null
          product_id: string
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          is_active?: boolean
          listed_price: number
          price_override_reason?: string | null
          product_id: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          is_active?: boolean
          listed_price?: number
          price_override_reason?: string | null
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_channel_listings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_stock_balances"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_channel_listings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_components: {
        Row: {
          component_product_id: string
          created_at: string
          created_by: string | null
          id: string
          parent_product_id: string
          quantity: number
        }
        Insert: {
          component_product_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          parent_product_id: string
          quantity: number
        }
        Update: {
          component_product_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          parent_product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_components_component_product_id_fkey"
            columns: ["component_product_id"]
            isOneToOne: false
            referencedRelation: "product_stock_balances"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_components_component_product_id_fkey"
            columns: ["component_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_components_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_components_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "product_stock_balances"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_components_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_parts: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          material_id: string | null
          name: string
          piece_grams: number
          position: number
          print_hours: number
          printer_id: string
          product_id: string
          quantity: number
          support_grams: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id?: string | null
          name: string
          piece_grams?: number
          position?: number
          print_hours: number
          printer_id: string
          product_id: string
          quantity: number
          support_grams?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id?: string | null
          name?: string
          piece_grams?: number
          position?: number
          print_hours?: number
          printer_id?: string
          product_id?: string
          quantity?: number
          support_grams?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_parts_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_parts_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "printers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_parts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_media: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_cover: boolean
          product_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_cover?: boolean
          product_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_cover?: boolean
          product_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_stock_balances"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_slicing_sheet_materials: {
        Row: {
          id: string
          material_id: string
          piece_grams: number
          slicing_sheet_id: string
          support_grams: number
        }
        Insert: {
          id?: string
          material_id: string
          piece_grams?: number
          slicing_sheet_id: string
          support_grams?: number
        }
        Update: {
          id?: string
          material_id?: string
          piece_grams?: number
          slicing_sheet_id?: string
          support_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_slicing_sheet_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_stock_balances"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "product_slicing_sheet_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_slicing_sheet_materials_slicing_sheet_id_fkey"
            columns: ["slicing_sheet_id"]
            isOneToOne: false
            referencedRelation: "product_slicing_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      product_slicing_sheets: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          print_hours: number
          printer_id: string
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          print_hours: number
          printer_id: string
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          print_hours?: number
          printer_id?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_slicing_sheets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_slicing_sheets_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "printers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_slicing_sheets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_stock_balances"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_slicing_sheets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          material_stock_movement_id: string | null
          movement_type: string
          notes: string | null
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_stock_movement_id?: string | null
          movement_type: string
          notes?: string | null
          product_id: string
          quantity: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_stock_movement_id?: string | null
          movement_type?: string
          notes?: string | null
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_movements_material_stock_movement_id_fkey"
            columns: ["material_stock_movement_id"]
            isOneToOne: false
            referencedRelation: "material_stock_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_stock_balances"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          price_calculation_id: string | null
          product_type: string
          production_lead_days_max: number | null
          production_lead_days_min: number | null
          size_tier: string | null
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          price_calculation_id?: string | null
          product_type?: string
          production_lead_days_max?: number | null
          production_lead_days_min?: number | null
          size_tier?: string | null
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          price_calculation_id?: string | null
          product_type?: string
          production_lead_days_max?: number | null
          production_lead_days_min?: number | null
          size_tier?: string | null
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_price_calculation_id_fkey"
            columns: ["price_calculation_id"]
            isOneToOne: false
            referencedRelation: "price_calculations"
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
      size_tier_ranges: {
        Row: {
          b2b_margin_mode: string
          b2b_margin_pct: number
          b2c_margin_mode: string
          b2c_margin_pct: number
          id: string
          max_print_hours: number
          max_weight_grams: number
          min_print_hours: number
          min_weight_grams: number
          tier: string
          valid_from: string
        }
        Insert: {
          b2b_margin_mode?: string
          b2b_margin_pct?: number
          b2c_margin_mode?: string
          b2c_margin_pct?: number
          id?: string
          max_print_hours: number
          max_weight_grams: number
          min_print_hours: number
          min_weight_grams: number
          tier: string
          valid_from?: string
        }
        Update: {
          b2b_margin_mode?: string
          b2b_margin_pct?: number
          b2c_margin_mode?: string
          b2c_margin_pct?: number
          id?: string
          max_print_hours?: number
          max_weight_grams?: number
          min_print_hours?: number
          min_weight_grams?: number
          tier?: string
          valid_from?: string
        }
        Relationships: [
          {
            foreignKeyName: "size_tier_ranges_tier_fkey"
            columns: ["tier"]
            isOneToOne: false
            referencedRelation: "size_tiers"
            referencedColumns: ["code"]
          },
        ]
      }
      size_tiers: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          is_system: boolean
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          is_system?: boolean
          label: string
          sort_order: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          is_system?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      social_content_plan_item_channels: {
        Row: {
          channel: string
          item_id: string
        }
        Insert: {
          channel: string
          item_id: string
        }
        Update: {
          channel?: string
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_content_plan_item_channels_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "social_content_plan_items"
            referencedColumns: ["id"]
          },
        ]
      }
      social_content_plan_items: {
        Row: {
          commemorative_date_id: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          responsible_id: string | null
          status: string
          target_date: string | null
          title: string
        }
        Insert: {
          commemorative_date_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          responsible_id?: string | null
          status?: string
          target_date?: string | null
          title: string
        }
        Update: {
          commemorative_date_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          responsible_id?: string | null
          status?: string
          target_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_content_plan_items_commemorative_date_id_fkey"
            columns: ["commemorative_date_id"]
            isOneToOne: false
            referencedRelation: "commemorative_dates_marketing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_content_plan_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_content_plan_items_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_content_plan_status_events: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_status: string
          id: string
          item_id: string
          to_status: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_status: string
          id?: string
          item_id: string
          to_status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_status?: string
          id?: string
          item_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_content_plan_status_events_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_content_plan_status_events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "social_content_plan_items"
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
      material_stock_balances: {
        Row: {
          balance: number | null
          material_id: string | null
        }
        Relationships: []
      }
      mei_ceiling_status: {
        Row: {
          annual_ceiling: number | null
          percentage_reached: number | null
          revenue_last_12_months: number | null
          year: number | null
        }
        Relationships: []
      }
      product_stock_balances: {
        Row: {
          balance: number | null
          product_id: string | null
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

