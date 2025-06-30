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
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
      entity_configs: {
        Row: {
          allow_manual_creation: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          allow_manual_creation: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          allow_manual_creation?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_configs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_field_configs: {
        Row: {
          allow_manual_edit: boolean
          base_data_type: Database["public"]["Enums"]["entity_field_configs__base_data_type"]
          class: Database["public"]["Enums"]["entity_field_configs__class"]
          created_at: string
          description: string | null
          entity_config_id: string
          id: string
          is_array: boolean | null
          is_id_field: boolean
          is_title_field: boolean
          name: string
          updated_at: string
          value_extractor_type: Database["public"]["Enums"]["entity_field_configs__value_extractor_type"]
          workspace_id: string
        }
        Insert: {
          allow_manual_edit?: boolean
          base_data_type: Database["public"]["Enums"]["entity_field_configs__base_data_type"]
          class: Database["public"]["Enums"]["entity_field_configs__class"]
          created_at?: string
          description?: string | null
          entity_config_id: string
          id?: string
          is_array?: boolean | null
          is_id_field?: boolean
          is_title_field?: boolean
          name: string
          updated_at?: string
          value_extractor_type: Database["public"]["Enums"]["entity_field_configs__value_extractor_type"]
          workspace_id: string
        }
        Update: {
          allow_manual_edit?: boolean
          base_data_type?: Database["public"]["Enums"]["entity_field_configs__base_data_type"]
          class?: Database["public"]["Enums"]["entity_field_configs__class"]
          created_at?: string
          description?: string | null
          entity_config_id?: string
          id?: string
          is_array?: boolean | null
          is_id_field?: boolean
          is_title_field?: boolean
          name?: string
          updated_at?: string
          value_extractor_type?: Database["public"]["Enums"]["entity_field_configs__value_extractor_type"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_field_configs_entity_config_id_fkey"
            columns: ["entity_config_id"]
            isOneToOne: false
            referencedRelation: "entity_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_field_configs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          display_name: string
          full_name: string
          id: string
          membership_id: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          full_name: string
          id?: string
          membership_id: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          full_name?: string
          id?: string
          membership_id?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "workspace_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          membership_id: string
          role: string
          updated_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          membership_id: string
          role: string
          updated_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          membership_id?: string
          role?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "workspace_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      value_extractors__aggregation: {
        Row: {
          aggregation_type: Database["public"]["Enums"]["value_extractors__aggregation_type"]
          created_at: string
          dataset_field_id: string
          dataset_id: string
          entity_field_config_id: string
          filter: Json | null
          id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          aggregation_type: Database["public"]["Enums"]["value_extractors__aggregation_type"]
          created_at?: string
          dataset_field_id: string
          dataset_id: string
          entity_field_config_id: string
          filter?: Json | null
          id?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          aggregation_type?: Database["public"]["Enums"]["value_extractors__aggregation_type"]
          created_at?: string
          dataset_field_id?: string
          dataset_id?: string
          entity_field_config_id?: string
          filter?: Json | null
          id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "value_extractors__aggregation_entity_field_config_id_fkey"
            columns: ["entity_field_config_id"]
            isOneToOne: false
            referencedRelation: "entity_field_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "value_extractors__aggregation_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      value_extractors__dataset_column_value: {
        Row: {
          created_at: string
          dataset_field_id: string
          dataset_id: string
          entity_field_config_id: string
          id: string
          updated_at: string
          value_picker_rule_type: Database["public"]["Enums"]["value_extractors__value_picker_rule_type"]
          workspace_id: string
        }
        Insert: {
          created_at?: string
          dataset_field_id: string
          dataset_id: string
          entity_field_config_id: string
          id?: string
          updated_at?: string
          value_picker_rule_type: Database["public"]["Enums"]["value_extractors__value_picker_rule_type"]
          workspace_id: string
        }
        Update: {
          created_at?: string
          dataset_field_id?: string
          dataset_id?: string
          entity_field_config_id?: string
          id?: string
          updated_at?: string
          value_picker_rule_type?: Database["public"]["Enums"]["value_extractors__value_picker_rule_type"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "value_extractors__dataset_column_va_entity_field_config_id_fkey"
            columns: ["entity_field_config_id"]
            isOneToOne: false
            referencedRelation: "entity_field_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "value_extractors__dataset_column_value_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      value_extractors__manual_entry: {
        Row: {
          created_at: string
          entity_field_config_id: string
          id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          entity_field_config_id: string
          id?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          entity_field_config_id?: string
          id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "value_extractors__manual_entry_entity_field_config_id_fkey"
            columns: ["entity_field_config_id"]
            isOneToOne: false
            referencedRelation: "entity_field_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "value_extractors__manual_entry_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_memberships: {
        Row: {
          created_at: string
          id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_memberships_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id?: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      util__auth_user_is_workspace_admin: {
        Args: { workspace_id: string }
        Returns: boolean
      }
      util__auth_user_is_workspace_member: {
        Args: { workspace_id: string }
        Returns: boolean
      }
      util__auth_user_is_workspace_owner: {
        Args: { workspace_id: string }
        Returns: boolean
      }
      util__user_is_workspace_member: {
        Args: { user_id: string; workspace_id: string }
        Returns: boolean
      }
    }
    Enums: {
      entity_field_configs__base_data_type: "string" | "number" | "date"
      entity_field_configs__class: "dimension" | "metric"
      entity_field_configs__value_extractor_type:
        | "dataset_column_value"
        | "manual_entry"
        | "aggregation"
      value_extractors__aggregation_type: "sum" | "max" | "count"
      value_extractors__value_picker_rule_type: "most_frequent" | "first"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      entity_field_configs__base_data_type: ["string", "number", "date"],
      entity_field_configs__class: ["dimension", "metric"],
      entity_field_configs__value_extractor_type: [
        "dataset_column_value",
        "manual_entry",
        "aggregation",
      ],
      value_extractors__aggregation_type: ["sum", "max", "count"],
      value_extractors__value_picker_rule_type: ["most_frequent", "first"],
    },
  },
} as const

