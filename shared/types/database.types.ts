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
      activity_events: {
        Row: {
          actor_user_id: string | null
          comment_id: string | null
          id: string
          individual_id: string | null
          kind: Database["public"]["Enums"]["activity_events__kind"]
          occurred_at: string
          payload: Json
          payload_version: number
          recorded_at: string
          source: Database["public"]["Enums"]["activity_events__source"]
          workspace_id: string
        }
        Insert: {
          actor_user_id?: string | null
          comment_id?: string | null
          id?: string
          individual_id?: string | null
          kind: Database["public"]["Enums"]["activity_events__kind"]
          occurred_at?: string
          payload?: Json
          payload_version?: number
          recorded_at?: string
          source?: Database["public"]["Enums"]["activity_events__source"]
          workspace_id: string
        }
        Update: {
          actor_user_id?: string | null
          comment_id?: string | null
          id?: string
          individual_id?: string | null
          kind?: Database["public"]["Enums"]["activity_events__kind"]
          occurred_at?: string
          payload?: Json
          payload_version?: number
          recorded_at?: string
          source?: Database["public"]["Enums"]["activity_events__source"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_individual_id_fkey"
            columns: ["individual_id"]
            isOneToOne: false
            referencedRelation: "individuals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      attribute_mappings__dataset_column: {
        Row: {
          bucket_column_id: string | null
          concept_attribute_id: string
          created_at: string
          dataset_column_id: string
          dataset_id: string
          id: string
          updated_at: string
          value_picker_rule_type:
            | Database["public"]["Enums"]["attribute_mappings__value_picker_rule_type"]
            | null
          workspace_id: string
        }
        Insert: {
          bucket_column_id?: string | null
          concept_attribute_id: string
          created_at?: string
          dataset_column_id: string
          dataset_id: string
          id?: string
          updated_at?: string
          value_picker_rule_type?:
            | Database["public"]["Enums"]["attribute_mappings__value_picker_rule_type"]
            | null
          workspace_id: string
        }
        Update: {
          bucket_column_id?: string | null
          concept_attribute_id?: string
          created_at?: string
          dataset_column_id?: string
          dataset_id?: string
          id?: string
          updated_at?: string
          value_picker_rule_type?:
            | Database["public"]["Enums"]["attribute_mappings__value_picker_rule_type"]
            | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attribute_mappings__dataset_column_concept_attribute_id_fkey"
            columns: ["concept_attribute_id"]
            isOneToOne: true
            referencedRelation: "concept_attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribute_mappings__dataset_column_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      attribute_mappings__manual_entry: {
        Row: {
          concept_attribute_id: string
          created_at: string
          id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          concept_attribute_id: string
          created_at?: string
          id?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          concept_attribute_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attribute_mappings__manual_entry_concept_attribute_id_fkey"
            columns: ["concept_attribute_id"]
            isOneToOne: true
            referencedRelation: "concept_attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribute_mappings__manual_entry_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_gadget_refs: {
        Row: {
          comment_id: string
          created_at: string
          display: string
          gadget_id: string
          gadget_type: Database["public"]["Enums"]["gadget_type"]
          id: string
          sub_id: string | null
          workspace_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          display: string
          gadget_id: string
          gadget_type: Database["public"]["Enums"]["gadget_type"]
          id?: string
          sub_id?: string | null
          workspace_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          display?: string
          gadget_id?: string
          gadget_type?: Database["public"]["Enums"]["gadget_type"]
          id?: string
          sub_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_gadget_refs_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_gadget_refs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_mentions: {
        Row: {
          comment_id: string
          created_at: string
          mentioned_user_id: string
          workspace_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          mentioned_user_id: string
          workspace_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          mentioned_user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_mentions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["comment_reactions__kind"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["comment_reactions__kind"]
          updated_at?: string
          user_id?: string
          workspace_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["comment_reactions__kind"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_reactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_revisions: {
        Row: {
          body: Json
          body_schema_version: number
          body_text: string
          comment_id: string
          created_at: string
          id: string
          reason: Database["public"]["Enums"]["comment_revisions__reason"]
          revised_by_user_id: string | null
          workspace_id: string
        }
        Insert: {
          body: Json
          body_schema_version: number
          body_text: string
          comment_id: string
          created_at?: string
          id?: string
          reason: Database["public"]["Enums"]["comment_revisions__reason"]
          revised_by_user_id?: string | null
          workspace_id: string
        }
        Update: {
          body?: Json
          body_schema_version?: number
          body_text?: string
          comment_id?: string
          created_at?: string
          id?: string
          reason?: Database["public"]["Enums"]["comment_revisions__reason"]
          revised_by_user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_revisions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_revisions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_user_id: string | null
          body: Json | null
          body_schema_version: number
          body_text: string | null
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          individual_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          author_user_id?: string | null
          body?: Json | null
          body_schema_version?: number
          body_text?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          individual_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          author_user_id?: string | null
          body?: Json | null
          body_schema_version?: number
          body_text?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          individual_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_individual_id_fkey"
            columns: ["individual_id"]
            isOneToOne: false
            referencedRelation: "individuals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      concept_attributes: {
        Row: {
          allow_manual_edit: boolean
          bucket_grain:
            | Database["public"]["Enums"]["concept_attributes__bucket_grain"]
            | null
          concept_id: string
          created_at: string
          data_type: Database["public"]["Enums"]["datasets__ava_data_type"]
          description: string | null
          id: string
          is_array: boolean
          is_identifier: boolean
          is_label: boolean
          mapping_type: Database["public"]["Enums"]["concept_attributes__mapping_type"]
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          allow_manual_edit: boolean
          bucket_grain?:
            | Database["public"]["Enums"]["concept_attributes__bucket_grain"]
            | null
          concept_id: string
          created_at?: string
          data_type: Database["public"]["Enums"]["datasets__ava_data_type"]
          description?: string | null
          id?: string
          is_array: boolean
          is_identifier: boolean
          is_label: boolean
          mapping_type: Database["public"]["Enums"]["concept_attributes__mapping_type"]
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          allow_manual_edit?: boolean
          bucket_grain?:
            | Database["public"]["Enums"]["concept_attributes__bucket_grain"]
            | null
          concept_id?: string
          created_at?: string
          data_type?: Database["public"]["Enums"]["datasets__ava_data_type"]
          description?: string | null
          id?: string
          is_array?: boolean
          is_identifier?: boolean
          is_label?: boolean
          mapping_type?: Database["public"]["Enums"]["concept_attributes__mapping_type"]
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concept_attributes_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concept_attributes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      concept_statuses: {
        Row: {
          color: string
          concept_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          position: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color: string
          concept_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          position: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string
          concept_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          position?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concept_statuses_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concept_statuses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      concepts: {
        Row: {
          allow_manual_creation: boolean
          created_at: string
          default_status_id: string
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
          default_status_id: string
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
          default_status_id?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concepts__default_status_fkey"
            columns: ["default_status_id", "id"]
            isOneToOne: false
            referencedRelation: "concept_statuses"
            referencedColumns: ["id", "concept_id"]
          },
          {
            foreignKeyName: "concepts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          connection_type: Database["public"]["Enums"]["connections__connection_type"]
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          connection_type: Database["public"]["Enums"]["connections__connection_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          connection_type?: Database["public"]["Enums"]["connections__connection_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      connections__postgres: {
        Row: {
          connection_id: string
          created_at: string
          database_name: string
          host: string
          last_verified_at: string | null
          port: number
          ssl_mode: Database["public"]["Enums"]["connections__postgres_ssl_mode"]
          updated_at: string
          username: string
          vault_secret_id: string
          workspace_id: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          database_name: string
          host: string
          last_verified_at?: string | null
          port: number
          ssl_mode?: Database["public"]["Enums"]["connections__postgres_ssl_mode"]
          updated_at?: string
          username: string
          vault_secret_id: string
          workspace_id: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          database_name?: string
          host?: string
          last_verified_at?: string | null
          port?: number
          ssl_mode?: Database["public"]["Enums"]["connections__postgres_ssl_mode"]
          updated_at?: string
          username?: string
          vault_secret_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connections__postgres_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: true
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections__postgres_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboards: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          is_restricted: boolean
          name: string
          owner_id: string
          owner_profile_id: string
          slug: string | null
          snapshot_revision: string | null
          snapshot_transition_kind:
            | Database["public"]["Enums"]["dashboard_snapshot_transition_kind"]
            | null
          snapshot_transition_prior_revision: string | null
          snapshot_transition_prior_visibility:
            | Database["public"]["Enums"]["dashboard_visibility"]
            | null
          snapshot_transition_revision: string | null
          snapshot_transition_target_visibility:
            | Database["public"]["Enums"]["dashboard_visibility"]
            | null
          updated_at: string
          visibility: Database["public"]["Enums"]["dashboard_visibility"]
          workspace_id: string
        }
        Insert: {
          config: Json
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          is_restricted?: boolean
          name: string
          owner_id?: string
          owner_profile_id: string
          slug?: string | null
          snapshot_revision?: string | null
          snapshot_transition_kind?:
            | Database["public"]["Enums"]["dashboard_snapshot_transition_kind"]
            | null
          snapshot_transition_prior_revision?: string | null
          snapshot_transition_prior_visibility?:
            | Database["public"]["Enums"]["dashboard_visibility"]
            | null
          snapshot_transition_revision?: string | null
          snapshot_transition_target_visibility?:
            | Database["public"]["Enums"]["dashboard_visibility"]
            | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["dashboard_visibility"]
          workspace_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          is_restricted?: boolean
          name?: string
          owner_id?: string
          owner_profile_id?: string
          slug?: string | null
          snapshot_revision?: string | null
          snapshot_transition_kind?:
            | Database["public"]["Enums"]["dashboard_snapshot_transition_kind"]
            | null
          snapshot_transition_prior_revision?: string | null
          snapshot_transition_prior_visibility?:
            | Database["public"]["Enums"]["dashboard_visibility"]
            | null
          snapshot_transition_revision?: string | null
          snapshot_transition_target_visibility?:
            | Database["public"]["Enums"]["dashboard_visibility"]
            | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["dashboard_visibility"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboards_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboards_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      data_catalog_drives: {
        Row: {
          created_at: string
          drive_key: string
          id: string
          organization1_label: string | null
          organization2_label: string | null
          organization3_label: string | null
          organization4_label: string | null
          pipeline_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          drive_key: string
          id?: string
          organization1_label?: string | null
          organization2_label?: string | null
          organization3_label?: string | null
          organization4_label?: string | null
          pipeline_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          drive_key?: string
          id?: string
          organization1_label?: string | null
          organization2_label?: string | null
          organization3_label?: string | null
          organization4_label?: string | null
          pipeline_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      data_catalog_facet_counts: {
        Row: {
          facet: string
          id: number
          is_loadable_only: boolean
          listing_count: number
          parent_value: string | null
          refreshed_at: string
          value: string | null
        }
        Insert: {
          facet: string
          id?: never
          is_loadable_only: boolean
          listing_count: number
          parent_value?: string | null
          refreshed_at?: string
          value?: string | null
        }
        Update: {
          facet?: string
          id?: never
          is_loadable_only?: boolean
          listing_count?: number
          parent_value?: string | null
          refreshed_at?: string
          value?: string | null
        }
        Relationships: []
      }
      data_catalog_listings: {
        Row: {
          access_kind: Database["public"]["Enums"]["data_catalog_listings__access_kind"]
          additional_source_metadata: Json | null
          api_base_url: string | null
          api_freshness_probe: Json | null
          api_resource_format: string | null
          api_resource_id: string | null
          api_service:
            | Database["public"]["Enums"]["data_catalog_listings__api_service"]
            | null
          canonical_urls: string[] | null
          companion_listings: Json
          coverage_end_date: string | null
          coverage_start_date: string | null
          created_at: string
          date_column_type_last_verified: string | null
          date_of_last_sync: string | null
          date_of_last_update: string | null
          description: string | null
          display_name: string
          domains: string[] | null
          drive_id: string | null
          external_dataset_id: string | null
          external_service_name: string | null
          id: string
          invalid_dataset_reason:
            | Database["public"]["Enums"]["data_catalog_listings__invalid_dataset_reason"]
            | null
          is_invalid: boolean
          is_workspace_loadable: boolean
          license: string | null
          metadata: Json | null
          notes: string | null
          organization1_name: string
          organization2_name: string | null
          organization3_name: string | null
          organization4_name: string | null
          parquet_cache_build_id: string | null
          parquet_cache_build_started_at: string | null
          parquet_cache_built_at: string | null
          parquet_cache_byte_size: number | null
          parquet_cache_checked_at: string | null
          parquet_cache_checked_source_version: string | null
          parquet_cache_failure_code: string | null
          parquet_cache_folder_path: string | null
          parquet_cache_part_count: number | null
          parquet_cache_row_count: number | null
          parquet_cache_source_version: string | null
          parquet_cache_status:
            | Database["public"]["Enums"]["data_catalog_listings__parquet_cache_status"]
            | null
          parquet_file_name: string | null
          pipeline_name: string | null
          pipeline_run_id: string | null
          pipeline_scope_keys: string[]
          search_vector: unknown
          source_asset_type: string | null
          source_download_url: string | null
          source_url: string | null
          tags: string[] | null
          update_frequency: string | null
          updated_at: string
        }
        Insert: {
          access_kind?: Database["public"]["Enums"]["data_catalog_listings__access_kind"]
          additional_source_metadata?: Json | null
          api_base_url?: string | null
          api_freshness_probe?: Json | null
          api_resource_format?: string | null
          api_resource_id?: string | null
          api_service?:
            | Database["public"]["Enums"]["data_catalog_listings__api_service"]
            | null
          canonical_urls?: string[] | null
          companion_listings?: Json
          coverage_end_date?: string | null
          coverage_start_date?: string | null
          created_at?: string
          date_column_type_last_verified?: string | null
          date_of_last_sync?: string | null
          date_of_last_update?: string | null
          description?: string | null
          display_name: string
          domains?: string[] | null
          drive_id?: string | null
          external_dataset_id?: string | null
          external_service_name?: string | null
          id?: string
          invalid_dataset_reason?:
            | Database["public"]["Enums"]["data_catalog_listings__invalid_dataset_reason"]
            | null
          is_invalid?: boolean
          is_workspace_loadable?: boolean
          license?: string | null
          metadata?: Json | null
          notes?: string | null
          organization1_name: string
          organization2_name?: string | null
          organization3_name?: string | null
          organization4_name?: string | null
          parquet_cache_build_id?: string | null
          parquet_cache_build_started_at?: string | null
          parquet_cache_built_at?: string | null
          parquet_cache_byte_size?: number | null
          parquet_cache_checked_at?: string | null
          parquet_cache_checked_source_version?: string | null
          parquet_cache_failure_code?: string | null
          parquet_cache_folder_path?: string | null
          parquet_cache_part_count?: number | null
          parquet_cache_row_count?: number | null
          parquet_cache_source_version?: string | null
          parquet_cache_status?:
            | Database["public"]["Enums"]["data_catalog_listings__parquet_cache_status"]
            | null
          parquet_file_name?: string | null
          pipeline_name?: string | null
          pipeline_run_id?: string | null
          pipeline_scope_keys?: string[]
          search_vector?: unknown
          source_asset_type?: string | null
          source_download_url?: string | null
          source_url?: string | null
          tags?: string[] | null
          update_frequency?: string | null
          updated_at?: string
        }
        Update: {
          access_kind?: Database["public"]["Enums"]["data_catalog_listings__access_kind"]
          additional_source_metadata?: Json | null
          api_base_url?: string | null
          api_freshness_probe?: Json | null
          api_resource_format?: string | null
          api_resource_id?: string | null
          api_service?:
            | Database["public"]["Enums"]["data_catalog_listings__api_service"]
            | null
          canonical_urls?: string[] | null
          companion_listings?: Json
          coverage_end_date?: string | null
          coverage_start_date?: string | null
          created_at?: string
          date_column_type_last_verified?: string | null
          date_of_last_sync?: string | null
          date_of_last_update?: string | null
          description?: string | null
          display_name?: string
          domains?: string[] | null
          drive_id?: string | null
          external_dataset_id?: string | null
          external_service_name?: string | null
          id?: string
          invalid_dataset_reason?:
            | Database["public"]["Enums"]["data_catalog_listings__invalid_dataset_reason"]
            | null
          is_invalid?: boolean
          is_workspace_loadable?: boolean
          license?: string | null
          metadata?: Json | null
          notes?: string | null
          organization1_name?: string
          organization2_name?: string | null
          organization3_name?: string | null
          organization4_name?: string | null
          parquet_cache_build_id?: string | null
          parquet_cache_build_started_at?: string | null
          parquet_cache_built_at?: string | null
          parquet_cache_byte_size?: number | null
          parquet_cache_checked_at?: string | null
          parquet_cache_checked_source_version?: string | null
          parquet_cache_failure_code?: string | null
          parquet_cache_folder_path?: string | null
          parquet_cache_part_count?: number | null
          parquet_cache_row_count?: number | null
          parquet_cache_source_version?: string | null
          parquet_cache_status?:
            | Database["public"]["Enums"]["data_catalog_listings__parquet_cache_status"]
            | null
          parquet_file_name?: string | null
          pipeline_name?: string | null
          pipeline_run_id?: string | null
          pipeline_scope_keys?: string[]
          search_vector?: unknown
          source_asset_type?: string | null
          source_download_url?: string | null
          source_url?: string | null
          tags?: string[] | null
          update_frequency?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_catalog_listings_drive_id_fkey"
            columns: ["drive_id"]
            isOneToOne: false
            referencedRelation: "data_catalog_drives"
            referencedColumns: ["id"]
          },
        ]
      }
      data_catalog_listings__relation_columns: {
        Row: {
          cast_data_type: Database["public"]["Enums"]["datasets__duckdb_data_type"]
          catalog_listing_id: string
          column_name: string
          created_at: string | null
          display_order: number | null
          id: string
          original_data_type: string
          updated_at: string | null
        }
        Insert: {
          cast_data_type: Database["public"]["Enums"]["datasets__duckdb_data_type"]
          catalog_listing_id: string
          column_name: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          original_data_type: string
          updated_at?: string | null
        }
        Update: {
          cast_data_type?: Database["public"]["Enums"]["datasets__duckdb_data_type"]
          catalog_listing_id?: string
          column_name?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          original_data_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_catalog_listings__relation_columns_catalog_listing_id_fkey"
            columns: ["catalog_listing_id"]
            isOneToOne: false
            referencedRelation: "data_catalog_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      dataset_columns: {
        Row: {
          column_idx: number
          created_at: string
          data_type: Database["public"]["Enums"]["datasets__ava_data_type"]
          dataset_id: string
          description: string | null
          detected_data_type: Database["public"]["Enums"]["datasets__duckdb_data_type"]
          id: string
          name: string
          original_data_type: string
          original_name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          column_idx: number
          created_at?: string
          data_type: Database["public"]["Enums"]["datasets__ava_data_type"]
          dataset_id: string
          description?: string | null
          detected_data_type: Database["public"]["Enums"]["datasets__duckdb_data_type"]
          id?: string
          name: string
          original_data_type: string
          original_name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          column_idx?: number
          created_at?: string
          data_type?: Database["public"]["Enums"]["datasets__ava_data_type"]
          dataset_id?: string
          description?: string | null
          detected_data_type?: Database["public"]["Enums"]["datasets__duckdb_data_type"]
          id?: string
          name?: string
          original_data_type?: string
          original_name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dataset_columns_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dataset_columns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      datasets: {
        Row: {
          created_at: string
          date_of_last_sync: string | null
          description: string | null
          id: string
          is_restricted: boolean
          name: string
          owner_id: string
          owner_profile_id: string
          source_type: Database["public"]["Enums"]["datasets__source_type"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          date_of_last_sync?: string | null
          description?: string | null
          id?: string
          is_restricted?: boolean
          name: string
          owner_id?: string
          owner_profile_id: string
          source_type: Database["public"]["Enums"]["datasets__source_type"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          date_of_last_sync?: string | null
          description?: string | null
          id?: string
          is_restricted?: boolean
          name?: string
          owner_id?: string
          owner_profile_id?: string
          source_type?: Database["public"]["Enums"]["datasets__source_type"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "datasets_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datasets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      datasets__csv_file: {
        Row: {
          comment_char: string | null
          created_at: string
          dataset_id: string
          date_format: string | null
          delimiter: string
          escape_char: string | null
          has_header: boolean
          id: string
          is_in_cloud_storage: boolean
          newline_delimiter: string
          quote_char: string | null
          rows_to_skip: number
          size_in_bytes: number
          timestamp_format: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          comment_char?: string | null
          created_at?: string
          dataset_id: string
          date_format?: string | null
          delimiter: string
          escape_char?: string | null
          has_header?: boolean
          id?: string
          is_in_cloud_storage?: boolean
          newline_delimiter?: string
          quote_char?: string | null
          rows_to_skip?: number
          size_in_bytes: number
          timestamp_format?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          comment_char?: string | null
          created_at?: string
          dataset_id?: string
          date_format?: string | null
          delimiter?: string
          escape_char?: string | null
          has_header?: boolean
          id?: string
          is_in_cloud_storage?: boolean
          newline_delimiter?: string
          quote_char?: string | null
          rows_to_skip?: number
          size_in_bytes?: number
          timestamp_format?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "datasets__csv_file_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: true
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datasets__csv_file_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      datasets__google_sheets: {
        Row: {
          created_at: string
          dataset_id: string
          google_account_id: string
          google_document_id: string
          id: string
          rows_to_skip: number
          sheet_name: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          dataset_id: string
          google_account_id: string
          google_document_id: string
          id?: string
          rows_to_skip?: number
          sheet_name?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          dataset_id?: string
          google_account_id?: string
          google_document_id?: string
          id?: string
          rows_to_skip?: number
          sheet_name?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "datasets__google_sheets_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: true
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datasets__google_sheets_google_account_id_fkey"
            columns: ["google_account_id"]
            isOneToOne: false
            referencedRelation: "tokens__google"
            referencedColumns: ["google_account_id"]
          },
          {
            foreignKeyName: "datasets__google_sheets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      datasets__open_data: {
        Row: {
          catalog_listing_id: string
          created_at: string
          dataset_id: string
          id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          catalog_listing_id: string
          created_at?: string
          dataset_id: string
          id?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          catalog_listing_id?: string
          created_at?: string
          dataset_id?: string
          id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "datasets__open_data_catalog_listing_id_fkey"
            columns: ["catalog_listing_id"]
            isOneToOne: false
            referencedRelation: "data_catalog_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datasets__open_data_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: true
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datasets__open_data_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      datasets__pdf_file: {
        Row: {
          created_at: string
          dataset_id: string
          fingerprint: Json
          has_original_file: boolean
          id: string
          is_in_cloud_storage: boolean
          llm_model: string | null
          output_mode: Database["public"]["Enums"]["datasets__pdf_output_mode"]
          page_range_end: number | null
          page_range_start: number | null
          regions: Json
          size_in_bytes: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          dataset_id: string
          fingerprint: Json
          has_original_file?: boolean
          id?: string
          is_in_cloud_storage?: boolean
          llm_model?: string | null
          output_mode?: Database["public"]["Enums"]["datasets__pdf_output_mode"]
          page_range_end?: number | null
          page_range_start?: number | null
          regions: Json
          size_in_bytes: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          dataset_id?: string
          fingerprint?: Json
          has_original_file?: boolean
          id?: string
          is_in_cloud_storage?: boolean
          llm_model?: string | null
          output_mode?: Database["public"]["Enums"]["datasets__pdf_output_mode"]
          page_range_end?: number | null
          page_range_start?: number | null
          regions?: Json
          size_in_bytes?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "datasets__pdf_file_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: true
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datasets__pdf_file_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      datasets__postgres_table: {
        Row: {
          connection_id: string
          created_at: string
          dataset_id: string
          id: string
          relation_kind: Database["public"]["Enums"]["datasets__postgres_table_relation_kind"]
          schema_name: string
          table_name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          dataset_id: string
          id?: string
          relation_kind: Database["public"]["Enums"]["datasets__postgres_table_relation_kind"]
          schema_name: string
          table_name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          dataset_id?: string
          id?: string
          relation_kind?: Database["public"]["Enums"]["datasets__postgres_table_relation_kind"]
          schema_name?: string
          table_name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "datasets__postgres_table__connection_in_workspace_fkey"
            columns: ["connection_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "datasets__postgres_table__dataset_in_workspace_fkey"
            columns: ["dataset_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "datasets__postgres_table_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      datasets__virtual: {
        Row: {
          created_at: string
          dataset_id: string
          id: string
          is_places: boolean
          raw_sql: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          dataset_id: string
          id?: string
          is_places?: boolean
          raw_sql: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          dataset_id?: string
          id?: string
          is_places?: boolean
          raw_sql?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "datasets__virtual_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: true
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datasets__virtual_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      datasets__xlsx_file: {
        Row: {
          created_at: string
          dataset_id: string
          date_format: string | null
          has_header: boolean
          id: string
          is_in_cloud_storage: boolean
          rows_to_skip: number
          sheet_name: string | null
          size_in_bytes: number
          timestamp_format: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          dataset_id: string
          date_format?: string | null
          has_header?: boolean
          id?: string
          is_in_cloud_storage?: boolean
          rows_to_skip?: number
          sheet_name?: string | null
          size_in_bytes: number
          timestamp_format?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          dataset_id?: string
          date_format?: string | null
          has_header?: boolean
          id?: string
          is_in_cloud_storage?: boolean
          rows_to_skip?: number
          sheet_name?: string | null
          size_in_bytes?: number
          timestamp_format?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "datasets__xlsx_file_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: true
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datasets__xlsx_file_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dexie_dbs: {
        Row: {
          created_at: string
          db_id: string
          id: string
          last_seen_at: string
          user_agent: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          db_id: string
          id?: string
          last_seen_at?: string
          user_agent: string
          user_id?: string
          version: number
        }
        Update: {
          created_at?: string
          db_id?: string
          id?: string
          last_seen_at?: string
          user_agent?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      individuals: {
        Row: {
          assigned_to: string | null
          concept_id: string
          created_at: string
          external_id: string
          id: string
          missing_from_source_at: string | null
          name: string
          status_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          concept_id: string
          created_at?: string
          external_id: string
          id?: string
          missing_from_source_at?: string | null
          name: string
          status_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          concept_id?: string
          created_at?: string
          external_id?: string
          id?: string
          missing_from_source_at?: string | null
          name?: string
          status_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "individuals__status_fkey"
            columns: ["status_id", "concept_id"]
            isOneToOne: false
            referencedRelation: "concept_statuses"
            referencedColumns: ["id", "concept_id"]
          },
          {
            foreignKeyName: "individuals_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "individuals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      map_jitter_salts: {
        Row: {
          map_id: string
          salt: string
        }
        Insert: {
          map_id: string
          salt?: string
        }
        Update: {
          map_id?: string
          salt?: string
        }
        Relationships: [
          {
            foreignKeyName: "map_jitter_salts_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: true
            referencedRelation: "maps"
            referencedColumns: ["id"]
          },
        ]
      }
      maps: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          is_restricted: boolean
          name: string
          owner_id: string
          owner_profile_id: string
          slug: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          config: Json
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          is_restricted?: boolean
          name: string
          owner_id?: string
          owner_profile_id: string
          slug?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          is_restricted?: boolean
          name?: string
          owner_id?: string
          owner_profile_id?: string
          slug?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maps_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maps_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_execution_scopes: {
        Row: {
          avg_columns_per_listing: number | null
          checkpoint_after: string | null
          checkpoint_before: string | null
          checkpoint_write_ms: number
          checkpoints_deleted: number
          columns_considered: number
          columns_written: number
          created_at: string
          datasets_fetched: number
          drive_key: string
          duration_ms: number | null
          error: string | null
          execution_id: string
          extract_ms: number
          finished_at: string
          id: string
          listings_considered: number
          listings_deleted: number
          listings_detached: number
          listings_kept_in_use: number
          listings_unchanged: number
          listings_written: number
          load_parquet_build_ms: number
          load_parquet_upload_ms: number
          load_read_ms: number
          load_write_ms: number
          max_columns_per_listing: number
          page_count: number
          parquet_bytes_written: number
          parquet_rows_written: number
          parquet_uploads_skipped: number
          pipeline_metrics: Json
          pipeline_name: string
          scope_key: string
          setup_ms: number
          source_bytes_reported: number | null
          source_csv_bytes: number
          started_at: string
          status: Database["public"]["Enums"]["pipeline_execution_scopes__status"]
          transform_ms: number
          window_since: string | null
          window_until: string | null
          write_batches: number
        }
        Insert: {
          avg_columns_per_listing?: number | null
          checkpoint_after?: string | null
          checkpoint_before?: string | null
          checkpoint_write_ms?: number
          checkpoints_deleted?: number
          columns_considered?: number
          columns_written?: number
          created_at?: string
          datasets_fetched?: number
          drive_key: string
          duration_ms?: number | null
          error?: string | null
          execution_id: string
          extract_ms?: number
          finished_at: string
          id?: string
          listings_considered?: number
          listings_deleted?: number
          listings_detached?: number
          listings_kept_in_use?: number
          listings_unchanged?: number
          listings_written?: number
          load_parquet_build_ms?: number
          load_parquet_upload_ms?: number
          load_read_ms?: number
          load_write_ms?: number
          max_columns_per_listing?: number
          page_count?: number
          parquet_bytes_written?: number
          parquet_rows_written?: number
          parquet_uploads_skipped?: number
          pipeline_metrics?: Json
          pipeline_name: string
          scope_key: string
          setup_ms?: number
          source_bytes_reported?: number | null
          source_csv_bytes?: number
          started_at: string
          status: Database["public"]["Enums"]["pipeline_execution_scopes__status"]
          transform_ms?: number
          window_since?: string | null
          window_until?: string | null
          write_batches?: number
        }
        Update: {
          avg_columns_per_listing?: number | null
          checkpoint_after?: string | null
          checkpoint_before?: string | null
          checkpoint_write_ms?: number
          checkpoints_deleted?: number
          columns_considered?: number
          columns_written?: number
          created_at?: string
          datasets_fetched?: number
          drive_key?: string
          duration_ms?: number | null
          error?: string | null
          execution_id?: string
          extract_ms?: number
          finished_at?: string
          id?: string
          listings_considered?: number
          listings_deleted?: number
          listings_detached?: number
          listings_kept_in_use?: number
          listings_unchanged?: number
          listings_written?: number
          load_parquet_build_ms?: number
          load_parquet_upload_ms?: number
          load_read_ms?: number
          load_write_ms?: number
          max_columns_per_listing?: number
          page_count?: number
          parquet_bytes_written?: number
          parquet_rows_written?: number
          parquet_uploads_skipped?: number
          pipeline_metrics?: Json
          pipeline_name?: string
          scope_key?: string
          setup_ms?: number
          source_bytes_reported?: number | null
          source_csv_bytes?: number
          started_at?: string
          status?: Database["public"]["Enums"]["pipeline_execution_scopes__status"]
          transform_ms?: number
          window_since?: string | null
          window_until?: string | null
          write_batches?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_execution_scopes__execution_fkey"
            columns: ["execution_id", "pipeline_name"]
            isOneToOne: false
            referencedRelation: "pipeline_executions"
            referencedColumns: ["id", "pipeline_name"]
          },
        ]
      }
      pipeline_executions: {
        Row: {
          actor: string | null
          arguments: Json
          catalog_api_listings: number | null
          catalog_columns: number | null
          catalog_listings: number | null
          catalog_prebuilt_listings: number | null
          catalog_unverified_listings: number | null
          catalog_verified_listings: number | null
          checkpoint_write_ms: number
          checkpoints_deleted: number
          cli_argv: string[] | null
          code_version: string | null
          columns_considered: number
          columns_written: number
          command: Database["public"]["Enums"]["pipeline_executions__command"]
          created_at: string
          datasets_fetched: number
          drive_count: number
          duration_ms: number | null
          error: string | null
          extract_ms: number
          finished_at: string | null
          host: string | null
          id: string
          invoked_via: Database["public"]["Enums"]["pipeline_executions__invoked_via"]
          is_dry_run: boolean
          is_limited: boolean
          is_scoped: boolean
          is_windowed: boolean
          listings_considered: number
          listings_deleted: number
          listings_detached: number
          listings_kept_in_use: number
          listings_unchanged: number
          listings_written: number
          load_parquet_build_ms: number
          load_parquet_upload_ms: number
          load_read_ms: number
          load_write_ms: number
          max_columns_per_listing: number
          page_count: number
          parquet_bytes_written: number
          parquet_rows_written: number
          parquet_uploads_skipped: number
          pipeline_name: string
          request_body: Json | null
          run_mode:
            | Database["public"]["Enums"]["pipeline_executions__run_mode"]
            | null
          scope_count: number
          setup_ms: number
          source_bytes_reported: number | null
          source_csv_bytes: number
          started_at: string
          status: Database["public"]["Enums"]["pipeline_executions__status"]
          transform_ms: number
          updated_at: string
          workspace_datasets_deleted: number
          write_batches: number
        }
        Insert: {
          actor?: string | null
          arguments?: Json
          catalog_api_listings?: number | null
          catalog_columns?: number | null
          catalog_listings?: number | null
          catalog_prebuilt_listings?: number | null
          catalog_unverified_listings?: number | null
          catalog_verified_listings?: number | null
          checkpoint_write_ms?: number
          checkpoints_deleted?: number
          cli_argv?: string[] | null
          code_version?: string | null
          columns_considered?: number
          columns_written?: number
          command: Database["public"]["Enums"]["pipeline_executions__command"]
          created_at?: string
          datasets_fetched?: number
          drive_count?: number
          duration_ms?: number | null
          error?: string | null
          extract_ms?: number
          finished_at?: string | null
          host?: string | null
          id?: string
          invoked_via: Database["public"]["Enums"]["pipeline_executions__invoked_via"]
          is_dry_run?: boolean
          is_limited?: boolean
          is_scoped?: boolean
          is_windowed?: boolean
          listings_considered?: number
          listings_deleted?: number
          listings_detached?: number
          listings_kept_in_use?: number
          listings_unchanged?: number
          listings_written?: number
          load_parquet_build_ms?: number
          load_parquet_upload_ms?: number
          load_read_ms?: number
          load_write_ms?: number
          max_columns_per_listing?: number
          page_count?: number
          parquet_bytes_written?: number
          parquet_rows_written?: number
          parquet_uploads_skipped?: number
          pipeline_name: string
          request_body?: Json | null
          run_mode?:
            | Database["public"]["Enums"]["pipeline_executions__run_mode"]
            | null
          scope_count?: number
          setup_ms?: number
          source_bytes_reported?: number | null
          source_csv_bytes?: number
          started_at?: string
          status?: Database["public"]["Enums"]["pipeline_executions__status"]
          transform_ms?: number
          updated_at?: string
          workspace_datasets_deleted?: number
          write_batches?: number
        }
        Update: {
          actor?: string | null
          arguments?: Json
          catalog_api_listings?: number | null
          catalog_columns?: number | null
          catalog_listings?: number | null
          catalog_prebuilt_listings?: number | null
          catalog_unverified_listings?: number | null
          catalog_verified_listings?: number | null
          checkpoint_write_ms?: number
          checkpoints_deleted?: number
          cli_argv?: string[] | null
          code_version?: string | null
          columns_considered?: number
          columns_written?: number
          command?: Database["public"]["Enums"]["pipeline_executions__command"]
          created_at?: string
          datasets_fetched?: number
          drive_count?: number
          duration_ms?: number | null
          error?: string | null
          extract_ms?: number
          finished_at?: string | null
          host?: string | null
          id?: string
          invoked_via?: Database["public"]["Enums"]["pipeline_executions__invoked_via"]
          is_dry_run?: boolean
          is_limited?: boolean
          is_scoped?: boolean
          is_windowed?: boolean
          listings_considered?: number
          listings_deleted?: number
          listings_detached?: number
          listings_kept_in_use?: number
          listings_unchanged?: number
          listings_written?: number
          load_parquet_build_ms?: number
          load_parquet_upload_ms?: number
          load_read_ms?: number
          load_write_ms?: number
          max_columns_per_listing?: number
          page_count?: number
          parquet_bytes_written?: number
          parquet_rows_written?: number
          parquet_uploads_skipped?: number
          pipeline_name?: string
          request_body?: Json | null
          run_mode?:
            | Database["public"]["Enums"]["pipeline_executions__run_mode"]
            | null
          scope_count?: number
          setup_ms?: number
          source_bytes_reported?: number | null
          source_csv_bytes?: number
          started_at?: string
          status?: Database["public"]["Enums"]["pipeline_executions__status"]
          transform_ms?: number
          updated_at?: string
          workspace_datasets_deleted?: number
          write_batches?: number
        }
        Relationships: []
      }
      pipeline_scope_checkpoints: {
        Row: {
          created_at: string
          drive_key: string
          high_water_mark: string
          pipeline_name: string
          pipeline_run_id: string
          scope_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          drive_key: string
          high_water_mark: string
          pipeline_name: string
          pipeline_run_id: string
          scope_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          drive_key?: string
          high_water_mark?: string
          pipeline_name?: string
          pipeline_run_id?: string
          scope_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      plugin_installations: {
        Row: {
          created_at: string
          granted_permissions: string[]
          id: string
          installed_by: string | null
          installed_version: string
          is_enabled: boolean
          plugin_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          granted_permissions?: string[]
          id?: string
          installed_by?: string | null
          installed_version: string
          is_enabled?: boolean
          plugin_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          granted_permissions?: string[]
          id?: string
          installed_by?: string | null
          installed_version?: string
          is_enabled?: boolean
          plugin_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plugin_installations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_shares: {
        Row: {
          created_at: string
          id: string
          principal_id: string | null
          principal_type: Database["public"]["Enums"]["share_principal_type"]
          requires_app_access: boolean
          resource_id: string
          resource_type: Database["public"]["Enums"]["resource_type"]
          role: Database["public"]["Enums"]["role_level"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          principal_id?: string | null
          principal_type: Database["public"]["Enums"]["share_principal_type"]
          requires_app_access?: boolean
          resource_id: string
          resource_type: Database["public"]["Enums"]["resource_type"]
          role: Database["public"]["Enums"]["role_level"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          principal_id?: string | null
          principal_type?: Database["public"]["Enums"]["share_principal_type"]
          requires_app_access?: boolean
          resource_id?: string
          resource_type?: Database["public"]["Enums"]["resource_type"]
          role?: Database["public"]["Enums"]["role_level"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_shares_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      role_group_app_roles: {
        Row: {
          app: Database["public"]["Enums"]["app_type"]
          created_at: string
          id: string
          role: Database["public"]["Enums"]["role_level"]
          role_group_id: string
          updated_at: string
        }
        Insert: {
          app: Database["public"]["Enums"]["app_type"]
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["role_level"]
          role_group_id: string
          updated_at?: string
        }
        Update: {
          app?: Database["public"]["Enums"]["app_type"]
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["role_level"]
          role_group_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_group_app_roles_role_group_id_fkey"
            columns: ["role_group_id"]
            isOneToOne: false
            referencedRelation: "role_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      role_groups: {
        Row: {
          created_at: string
          id: string
          is_builtin: boolean
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_builtin?: boolean
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_builtin?: boolean
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_groups_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          ended_at: string | null
          ends_at: string | null
          feature_plan_type: Database["public"]["Enums"]["subscriptions__feature_plan_type"]
          id: string
          max_dashboards_allowed: number | null
          max_datasets_allowed: number | null
          max_seats_allowed: number
          max_shareable_dashboards_allowed: number | null
          polar_customer_email: string | null
          polar_customer_id: string | null
          polar_product_id: string | null
          polar_subscription_id: string | null
          started_at: string | null
          subscription_owner_id: string
          subscription_status: Database["public"]["Enums"]["subscriptions__status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          ended_at?: string | null
          ends_at?: string | null
          feature_plan_type: Database["public"]["Enums"]["subscriptions__feature_plan_type"]
          id?: string
          max_dashboards_allowed?: number | null
          max_datasets_allowed?: number | null
          max_seats_allowed: number
          max_shareable_dashboards_allowed?: number | null
          polar_customer_email?: string | null
          polar_customer_id?: string | null
          polar_product_id?: string | null
          polar_subscription_id?: string | null
          started_at?: string | null
          subscription_owner_id: string
          subscription_status: Database["public"]["Enums"]["subscriptions__status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          ended_at?: string | null
          ends_at?: string | null
          feature_plan_type?: Database["public"]["Enums"]["subscriptions__feature_plan_type"]
          id?: string
          max_dashboards_allowed?: number | null
          max_datasets_allowed?: number | null
          max_seats_allowed?: number
          max_shareable_dashboards_allowed?: number | null
          polar_customer_email?: string | null
          polar_customer_id?: string | null
          polar_product_id?: string | null
          polar_subscription_id?: string | null
          started_at?: string | null
          subscription_owner_id?: string
          subscription_status?: Database["public"]["Enums"]["subscriptions__status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tokens__google: {
        Row: {
          access_token: string
          created_at: string
          expiry_date: string
          google_account_id: string
          google_email: string
          id: string
          refresh_token: string
          scope: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expiry_date: string
          google_account_id: string
          google_email: string
          id?: string
          refresh_token: string
          scope: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expiry_date?: string
          google_account_id?: string
          google_email?: string
          id?: string
          refresh_token?: string
          scope?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_analytics_events: {
        Row: {
          app: Database["public"]["Enums"]["app_type"] | null
          app_version: string | null
          client: Database["public"]["Enums"]["usage_analytics_events__client"]
          created_at: string
          event_category: Database["public"]["Enums"]["usage_analytics_events__category"]
          event_name: string
          id: string
          payload: Json | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          app?: Database["public"]["Enums"]["app_type"] | null
          app_version?: string | null
          client?: Database["public"]["Enums"]["usage_analytics_events__client"]
          created_at?: string
          event_category?: Database["public"]["Enums"]["usage_analytics_events__category"]
          event_name: string
          id?: string
          payload?: Json | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          app?: Database["public"]["Enums"]["app_type"] | null
          app_version?: string | null
          client?: Database["public"]["Enums"]["usage_analytics_events__client"]
          created_at?: string
          event_category?: Database["public"]["Enums"]["usage_analytics_events__category"]
          event_name?: string
          id?: string
          payload?: Json | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_analytics_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_group_memberships: {
        Row: {
          created_at: string
          id: string
          user_group_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_group_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_group_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_group_memberships_user_group_id_fkey"
            columns: ["user_group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_groups: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_groups_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_nux_progress: {
        Row: {
          catch_up_suppressed: boolean
          completed_milestones: string[]
          created_at: string
          id: string
          status: Database["public"]["Enums"]["nux_status"]
          tutorial_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          catch_up_suppressed?: boolean
          completed_milestones?: string[]
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["nux_status"]
          tutorial_key?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          catch_up_suppressed?: boolean
          completed_milestones?: string[]
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["nux_status"]
          tutorial_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          display_name: string
          full_name: string
          id: string
          membership_id: string
          polar_product_id: string | null
          subscription_id: string | null
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
          polar_product_id?: string | null
          subscription_id?: string | null
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
          polar_product_id?: string | null
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: true
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
      workspace_invites: {
        Row: {
          created_at: string
          email: string
          id: string
          invite_status: Database["public"]["Enums"]["workspace_invites__status"]
          invite_user_group_ids: string[]
          invited_by: string
          role: string
          role_group_id: string | null
          role_overrides: Json
          updated_at: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invite_status: Database["public"]["Enums"]["workspace_invites__status"]
          invite_user_group_ids?: string[]
          invited_by: string
          role: string
          role_group_id?: string | null
          role_overrides?: Json
          updated_at?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invite_status?: Database["public"]["Enums"]["workspace_invites__status"]
          invite_user_group_ids?: string[]
          invited_by?: string
          role?: string
          role_group_id?: string | null
          role_overrides?: Json
          updated_at?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_role_group_id_fkey"
            columns: ["role_group_id"]
            isOneToOne: false
            referencedRelation: "role_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
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
          role_group_id: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_group_id?: string | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_group_id?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_memberships_role_group_id_fkey"
            columns: ["role_group_id"]
            isOneToOne: false
            referencedRelation: "role_groups"
            referencedColumns: ["id"]
          },
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
      data_catalog_facet_counts__refresh: { Args: never; Returns: undefined }
      data_catalog_listings__count_facet: {
        Args: {
          p_count_cap: number
          p_domains: string[]
          p_facet: string
          p_formats: string[]
          p_is_loadable_only: boolean
          p_organization2_names: string[]
          p_query: string
          p_sources: string[]
          p_tags: string[]
          p_updated_within: string
        }
        Returns: {
          is_counted: boolean
          listing_count: number
          value: string
        }[]
      }
      data_catalog_listings__facet_value_rows: {
        Args: {
          p_chosen_values: string[]
          p_count_cap: number
          p_domains: string[]
          p_facet: string
          p_formats: string[]
          p_is_catalog_wide: boolean
          p_is_loadable_only: boolean
          p_organization2_names: string[]
          p_parent_values: string[]
          p_query: string
          p_sources: string[]
          p_tags: string[]
          p_updated_within: string
          p_value_limit: number
          p_value_search: string
        }
        Returns: {
          listing_count: number
          value: string
        }[]
      }
      data_catalog_listings__facets_for_one_search: {
        Args: {
          p_count_cap: number
          p_is_loadable_only: boolean
          p_query: string
        }
        Returns: {
          facet: string
          listing_count: number
          value: string
        }[]
      }
      data_catalog_listings__is_updated_within: {
        Args: { p_last_updated_at: string; p_updated_within: string }
        Returns: boolean
      }
      data_catalog_listings__search_facet_rows: {
        Args: {
          p_count_cap?: number
          p_domains?: string[]
          p_formats?: string[]
          p_is_loadable_only?: boolean
          p_organization2_names?: string[]
          p_query: string
          p_sources?: string[]
          p_tags?: string[]
          p_updated_within?: string
        }
        Returns: {
          facet: string
          listing_count: number
          value: string
        }[]
      }
      data_catalog_listings__search_matches: {
        Args: {
          p_domains: string[]
          p_formats: string[]
          p_is_loadable_only: boolean
          p_limit?: number
          p_offset?: number
          p_organization2_names: string[]
          p_query: string
          p_sort_by?: string
          p_sources: string[]
          p_tags: string[]
          p_updated_within: string
        }
        Returns: {
          display_name: string
          domains: string[]
          drive_id: string
          file_format: string
          id: string
          is_invalid: boolean
          is_workspace_loadable: boolean
          last_updated_at: string
          organization1_name: string
          organization2_name: string
          organization3_name: string
          organization4_name: string
          pipeline_name: string
          score: number
          tags: string[]
        }[]
      }
      data_catalog_listings__updated_window: {
        Args: { p_updated_within: string }
        Returns: unknown
      }
      datasets__auth_user_may_add_column: {
        Args: { p_dataset_id: string }
        Returns: boolean
      }
      datasets__is_postgres_table: {
        Args: { p_dataset_id: string }
        Returns: boolean
      }
      maps__auth_user_may_select: {
        Args: { p_map_id: string }
        Returns: boolean
      }
      maps__auth_user_may_select_grant: {
        Args: {
          p_is_restricted: boolean
          p_map_id: string
          p_owner_id: string
          p_workspace_id: string
        }
        Returns: boolean
      }
      maps__owner_id_matches_stored: {
        Args: { p_map_id: string; p_owner_id: string }
        Returns: boolean
      }
      rpc_activity_events__get_case_page: {
        Args: {
          p_before_id?: string
          p_before_occurred_at?: string
          p_before_recorded_at?: string
          p_individual_id: string
          p_kinds: Database["public"]["Enums"]["activity_events__kind"][]
          p_limit: number
        }
        Returns: {
          actor_user_id: string | null
          comment_id: string | null
          id: string
          individual_id: string | null
          kind: Database["public"]["Enums"]["activity_events__kind"]
          occurred_at: string
          payload: Json
          payload_version: number
          recorded_at: string
          source: Database["public"]["Enums"]["activity_events__source"]
          workspace_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "activity_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      rpc_concept_statuses__save: {
        Args: {
          p_concept_id: string
          p_default_status_id: string
          p_replacements: Json
          p_statuses: Json
        }
        Returns: undefined
      }
      rpc_concepts__create: {
        Args: {
          p_attributes: Json
          p_concept: Json
          p_dataset_column_mappings: Json
          p_manual_entry_mappings: Json
          p_statuses: Json
        }
        Returns: string
      }
      rpc_connections__create_vault_secret: {
        Args: { p_description: string; p_name: string; p_secret: string }
        Returns: string
      }
      rpc_connections__delete_vault_secret: {
        Args: { p_secret_id: string; p_workspace_id: string }
        Returns: undefined
      }
      rpc_connections__get_decrypted_secret: {
        Args: { p_vault_secret_id: string; p_workspace_id: string }
        Returns: string
      }
      rpc_connections__update_vault_secret: {
        Args: {
          p_new_secret: string
          p_secret_id: string
          p_workspace_id: string
        }
        Returns: undefined
      }
      rpc_data_catalog_listings__fail_parquet_cache: {
        Args: {
          p_build_id: string
          p_catalog_listing_id: string
          p_failure_code: string
        }
        Returns: boolean
      }
      rpc_data_catalog_listings__get_companions: {
        Args: { p_catalog_listing_id: string; p_workspace_id: string }
        Returns: {
          catalog_listing_id: string
          display_name: string
          is_in_workspace: boolean
          is_invalid: boolean
          is_workspace_loadable: boolean
          join_on: Json
          kind: string
        }[]
      }
      rpc_data_catalog_listings__list_pipeline_scopes: {
        Args: { p_pipeline_name: string }
        Returns: {
          drive_key: string
          scope_key: string
        }[]
      }
      rpc_data_catalog_listings__mark_invalid: {
        Args: {
          p_catalog_listing_id: string
          p_reason: Database["public"]["Enums"]["data_catalog_listings__invalid_dataset_reason"]
        }
        Returns: {
          access_kind: Database["public"]["Enums"]["data_catalog_listings__access_kind"]
          additional_source_metadata: Json | null
          api_base_url: string | null
          api_freshness_probe: Json | null
          api_resource_format: string | null
          api_resource_id: string | null
          api_service:
            | Database["public"]["Enums"]["data_catalog_listings__api_service"]
            | null
          canonical_urls: string[] | null
          companion_listings: Json
          coverage_end_date: string | null
          coverage_start_date: string | null
          created_at: string
          date_column_type_last_verified: string | null
          date_of_last_sync: string | null
          date_of_last_update: string | null
          description: string | null
          display_name: string
          domains: string[] | null
          drive_id: string | null
          external_dataset_id: string | null
          external_service_name: string | null
          id: string
          invalid_dataset_reason:
            | Database["public"]["Enums"]["data_catalog_listings__invalid_dataset_reason"]
            | null
          is_invalid: boolean
          is_workspace_loadable: boolean
          license: string | null
          metadata: Json | null
          notes: string | null
          organization1_name: string
          organization2_name: string | null
          organization3_name: string | null
          organization4_name: string | null
          parquet_cache_build_id: string | null
          parquet_cache_build_started_at: string | null
          parquet_cache_built_at: string | null
          parquet_cache_byte_size: number | null
          parquet_cache_checked_at: string | null
          parquet_cache_checked_source_version: string | null
          parquet_cache_failure_code: string | null
          parquet_cache_folder_path: string | null
          parquet_cache_part_count: number | null
          parquet_cache_row_count: number | null
          parquet_cache_source_version: string | null
          parquet_cache_status:
            | Database["public"]["Enums"]["data_catalog_listings__parquet_cache_status"]
            | null
          parquet_file_name: string | null
          pipeline_name: string | null
          pipeline_run_id: string | null
          pipeline_scope_keys: string[]
          search_vector: unknown
          source_asset_type: string | null
          source_download_url: string | null
          source_url: string | null
          tags: string[] | null
          update_frequency: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "data_catalog_listings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_data_catalog_listings__prune_pipeline_scope: {
        Args: {
          p_drive_key: string
          p_is_dry_run: boolean
          p_pipeline_name: string
          p_scope_key: string
        }
        Returns: {
          checkpoints_deleted: number
          listings_deleted: number
          listings_detached: number
          listings_kept_in_use: number
        }[]
      }
      rpc_data_catalog_listings__record_freshness_check: {
        Args: { p_catalog_listing_id: string; p_source_version: string }
        Returns: boolean
      }
      rpc_data_catalog_listings__request_parquet_cache: {
        Args: { p_catalog_listing_id: string; p_lost_build_after: string }
        Returns: string
      }
      rpc_data_catalog_listings__search: {
        Args: {
          p_count_cap?: number
          p_domains?: string[]
          p_formats?: string[]
          p_is_loadable_only?: boolean
          p_limit?: number
          p_offset?: number
          p_organization2_names?: string[]
          p_query: string
          p_sort_by?: string
          p_sources?: string[]
          p_tags?: string[]
          p_updated_within?: string
        }
        Returns: {
          display_name: string
          file_format: string
          id: string
          is_invalid: boolean
          is_total_capped: boolean
          is_workspace_loadable: boolean
          last_updated_at: string
          organization1_name: string
          organization2_name: string
          organization3_name: string
          organization4_name: string
          pipeline_name: string
          total_count: number
        }[]
      }
      rpc_data_catalog_listings__search_facets: {
        Args: {
          p_domains?: string[]
          p_formats?: string[]
          p_is_loadable_only?: boolean
          p_organization2_names?: string[]
          p_query: string
          p_sources?: string[]
          p_tags?: string[]
          p_updated_within?: string
        }
        Returns: Json
      }
      rpc_data_catalog_listings__search_tag_options: {
        Args: {
          p_domains?: string[]
          p_formats?: string[]
          p_is_loadable_only?: boolean
          p_organization2_names?: string[]
          p_query: string
          p_sources?: string[]
          p_tag_search: string
          p_tags?: string[]
          p_updated_within?: string
        }
        Returns: {
          listing_count: number
          value: string
        }[]
      }
      rpc_data_catalog_listings__upsert_with_relation_columns: {
        Args: { p_listings: Json }
        Returns: string[]
      }
      rpc_data_catalog_listings__write_parquet_cache: {
        Args: {
          p_build_id: string
          p_byte_size: number
          p_catalog_listing_id: string
          p_folder_path: string
          p_part_count: number
          p_row_count: number
          p_source_version: string
        }
        Returns: {
          is_applied: boolean
          previous_folder_path: string
        }[]
      }
      rpc_data_catalog_listings__write_verified_column_types: {
        Args: { p_catalog_listing_id: string; p_columns: Json }
        Returns: {
          access_kind: Database["public"]["Enums"]["data_catalog_listings__access_kind"]
          additional_source_metadata: Json | null
          api_base_url: string | null
          api_freshness_probe: Json | null
          api_resource_format: string | null
          api_resource_id: string | null
          api_service:
            | Database["public"]["Enums"]["data_catalog_listings__api_service"]
            | null
          canonical_urls: string[] | null
          companion_listings: Json
          coverage_end_date: string | null
          coverage_start_date: string | null
          created_at: string
          date_column_type_last_verified: string | null
          date_of_last_sync: string | null
          date_of_last_update: string | null
          description: string | null
          display_name: string
          domains: string[] | null
          drive_id: string | null
          external_dataset_id: string | null
          external_service_name: string | null
          id: string
          invalid_dataset_reason:
            | Database["public"]["Enums"]["data_catalog_listings__invalid_dataset_reason"]
            | null
          is_invalid: boolean
          is_workspace_loadable: boolean
          license: string | null
          metadata: Json | null
          notes: string | null
          organization1_name: string
          organization2_name: string | null
          organization3_name: string | null
          organization4_name: string | null
          parquet_cache_build_id: string | null
          parquet_cache_build_started_at: string | null
          parquet_cache_built_at: string | null
          parquet_cache_byte_size: number | null
          parquet_cache_checked_at: string | null
          parquet_cache_checked_source_version: string | null
          parquet_cache_failure_code: string | null
          parquet_cache_folder_path: string | null
          parquet_cache_part_count: number | null
          parquet_cache_row_count: number | null
          parquet_cache_source_version: string | null
          parquet_cache_status:
            | Database["public"]["Enums"]["data_catalog_listings__parquet_cache_status"]
            | null
          parquet_file_name: string | null
          pipeline_name: string | null
          pipeline_run_id: string | null
          pipeline_scope_keys: string[]
          search_vector: unknown
          source_asset_type: string | null
          source_download_url: string | null
          source_url: string | null
          tags: string[] | null
          update_frequency: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "data_catalog_listings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_datasets__add_csv_file_dataset: {
        Args: {
          p_columns: Database["public"]["CompositeTypes"]["dataset_column_input"][]
          p_comment_char: Database["public"]["CompositeTypes"]["util__nullable_text"]
          p_dataset_description: string
          p_dataset_id: string
          p_dataset_name: string
          p_date_format: Database["public"]["CompositeTypes"]["datasets__csv_file__date_format"]
          p_delimiter: string
          p_escape_char: Database["public"]["CompositeTypes"]["util__nullable_text"]
          p_has_header: boolean
          p_is_in_cloud_storage: boolean
          p_newline_delimiter: string
          p_quote_char: Database["public"]["CompositeTypes"]["util__nullable_text"]
          p_rows_to_skip: number
          p_size_in_bytes: number
          p_workspace_id: string
        }
        Returns: {
          created_at: string
          date_of_last_sync: string | null
          description: string | null
          id: string
          is_restricted: boolean
          name: string
          owner_id: string
          owner_profile_id: string
          source_type: Database["public"]["Enums"]["datasets__source_type"]
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "datasets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_datasets__add_dataset: {
        Args: {
          p_columns: Database["public"]["CompositeTypes"]["dataset_column_input"][]
          p_dataset_description: string
          p_dataset_id: string
          p_dataset_name: string
          p_dataset_source_type: Database["public"]["Enums"]["datasets__source_type"]
          p_workspace_id: string
        }
        Returns: {
          created_at: string
          date_of_last_sync: string | null
          description: string | null
          id: string
          is_restricted: boolean
          name: string
          owner_id: string
          owner_profile_id: string
          source_type: Database["public"]["Enums"]["datasets__source_type"]
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "datasets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_datasets__add_google_sheets_dataset: {
        Args: {
          p_columns: Database["public"]["CompositeTypes"]["dataset_column_input"][]
          p_dataset_description: string
          p_dataset_id: string
          p_dataset_name: string
          p_google_account_id: string
          p_google_document_id: string
          p_rows_to_skip?: number
          p_sheet_name?: Database["public"]["CompositeTypes"]["util__nullable_text"]
          p_workspace_id: string
        }
        Returns: {
          created_at: string
          date_of_last_sync: string | null
          description: string | null
          id: string
          is_restricted: boolean
          name: string
          owner_id: string
          owner_profile_id: string
          source_type: Database["public"]["Enums"]["datasets__source_type"]
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "datasets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_datasets__add_open_data_dataset: {
        Args: {
          p_catalog_listing_id: string
          p_columns: Database["public"]["CompositeTypes"]["dataset_column_input"][]
          p_dataset_description: string
          p_dataset_id: string
          p_dataset_name: string
          p_workspace_id: string
        }
        Returns: {
          created_at: string
          date_of_last_sync: string | null
          description: string | null
          id: string
          is_restricted: boolean
          name: string
          owner_id: string
          owner_profile_id: string
          source_type: Database["public"]["Enums"]["datasets__source_type"]
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "datasets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_datasets__add_pdf_file_dataset: {
        Args: {
          p_columns: Database["public"]["CompositeTypes"]["dataset_column_input"][]
          p_dataset_description: string
          p_dataset_id: string
          p_dataset_name: string
          p_fingerprint: Json
          p_has_original_file: boolean
          p_is_in_cloud_storage: boolean
          p_llm_model?: string
          p_output_mode?: Database["public"]["Enums"]["datasets__pdf_output_mode"]
          p_page_range_end: number
          p_page_range_start: number
          p_regions: Json
          p_size_in_bytes: number
          p_workspace_id: string
        }
        Returns: {
          created_at: string
          date_of_last_sync: string | null
          description: string | null
          id: string
          is_restricted: boolean
          name: string
          owner_id: string
          owner_profile_id: string
          source_type: Database["public"]["Enums"]["datasets__source_type"]
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "datasets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_datasets__add_places_dataset: {
        Args: {
          p_columns: Database["public"]["CompositeTypes"]["dataset_column_input"][]
          p_dataset_description: string
          p_dataset_id: string
          p_dataset_name: string
          p_raw_sql: string
          p_workspace_id: string
        }
        Returns: {
          created_at: string
          date_of_last_sync: string | null
          description: string | null
          id: string
          is_restricted: boolean
          name: string
          owner_id: string
          owner_profile_id: string
          source_type: Database["public"]["Enums"]["datasets__source_type"]
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "datasets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_datasets__add_postgres_table_dataset: {
        Args: {
          p_columns: Database["public"]["CompositeTypes"]["dataset_column_input"][]
          p_connection_id: string
          p_dataset_description: string
          p_dataset_id: string
          p_dataset_name: string
          p_relation_kind: Database["public"]["Enums"]["datasets__postgres_table_relation_kind"]
          p_schema_name: string
          p_table_name: string
          p_workspace_id: string
        }
        Returns: {
          created_at: string
          date_of_last_sync: string | null
          description: string | null
          id: string
          is_restricted: boolean
          name: string
          owner_id: string
          owner_profile_id: string
          source_type: Database["public"]["Enums"]["datasets__source_type"]
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "datasets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_datasets__add_virtual_dataset: {
        Args: {
          p_columns: Database["public"]["CompositeTypes"]["dataset_column_input"][]
          p_dataset_description: string
          p_dataset_id: string
          p_dataset_name: string
          p_raw_sql: string
          p_workspace_id: string
        }
        Returns: {
          created_at: string
          date_of_last_sync: string | null
          description: string | null
          id: string
          is_restricted: boolean
          name: string
          owner_id: string
          owner_profile_id: string
          source_type: Database["public"]["Enums"]["datasets__source_type"]
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "datasets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_datasets__add_xlsx_file_dataset: {
        Args: {
          p_columns: Database["public"]["CompositeTypes"]["dataset_column_input"][]
          p_dataset_description: string
          p_dataset_id: string
          p_dataset_name: string
          p_date_format: Database["public"]["CompositeTypes"]["datasets__csv_file__date_format"]
          p_has_header: boolean
          p_is_in_cloud_storage: boolean
          p_rows_to_skip: number
          p_sheet_name: Database["public"]["CompositeTypes"]["util__nullable_text"]
          p_size_in_bytes: number
          p_workspace_id: string
        }
        Returns: {
          created_at: string
          date_of_last_sync: string | null
          description: string | null
          id: string
          is_restricted: boolean
          name: string
          owner_id: string
          owner_profile_id: string
          source_type: Database["public"]["Enums"]["datasets__source_type"]
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "datasets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_gadgets__search: {
        Args: { p_limit?: number; p_query: string; p_workspace_id: string }
        Returns: {
          gadget_id: string
          gadget_type: Database["public"]["Enums"]["gadget_type"]
          has_limited_audience: boolean
          label: string
          rank: number
          sub_id: string
          sub_label: string
          updated_at: string
        }[]
      }
      rpc_maps__get_or_create_jitter_salt: {
        Args: { p_map_id: string }
        Returns: string
      }
      rpc_pipeline_executions__finish: {
        Args: { p_execution_id: string; p_outcome: Json }
        Returns: undefined
      }
      rpc_pipeline_executions__record_scope: {
        Args: { p_execution_id: string; p_scope: Json }
        Returns: undefined
      }
      rpc_pipeline_executions__start: {
        Args: { p_execution: Json }
        Returns: string
      }
      rpc_resources__make_private: {
        Args: {
          p_resource_id: string
          p_resource_type: Database["public"]["Enums"]["resource_type"]
        }
        Returns: undefined
      }
      rpc_resources__transfer_ownership: {
        Args: {
          p_new_owner_id: string
          p_resource_id: string
          p_resource_type: Database["public"]["Enums"]["resource_type"]
        }
        Returns: undefined
      }
      rpc_workspaces__create_with_owner: {
        Args: {
          p_display_name: string
          p_full_name: string
          p_workspace_name: string
          p_workspace_slug: string
        }
        Returns: {
          created_at: string
          id: string
          name: string
          owner_id: string
          slug: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "workspaces"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_workspaces__private_resource_counts: {
        Args: { p_workspace_id: string }
        Returns: {
          private_dashboard_count: number
          private_dataset_count: number
          private_map_count: number
          user_id: string
        }[]
      }
      rpc_workspaces__transfer_all_owned_resources: {
        Args: {
          p_from_user_id: string
          p_new_owner_id: string
          p_workspace_id: string
        }
        Returns: number
      }
      util__analytics_event_category: {
        Args: { p_event_name: string }
        Returns: Database["public"]["Enums"]["usage_analytics_events__category"]
      }
      util__auth_user_can_access_resource: {
        Args: {
          p_min_role: Database["public"]["Enums"]["role_level"]
          p_resource_id: string
          p_resource_type: Database["public"]["Enums"]["resource_type"]
        }
        Returns: boolean
      }
      util__auth_user_can_access_resource_in_workspace: {
        Args: {
          p_required_role: Database["public"]["Enums"]["role_level"]
          p_resource_id: string
          p_resource_type: Database["public"]["Enums"]["resource_type"]
          p_workspace_id: string
        }
        Returns: boolean
      }
      util__auth_user_can_delete_resource: {
        Args: {
          p_resource_id: string
          p_resource_type: Database["public"]["Enums"]["resource_type"]
        }
        Returns: boolean
      }
      util__auth_user_can_insert_workspace_resource: {
        Args: {
          p_owner_id: string
          p_resource_type: Database["public"]["Enums"]["resource_type"]
          p_workspace_id: string
        }
        Returns: boolean
      }
      util__auth_user_can_update_resource: {
        Args: {
          p_resource_id: string
          p_resource_type: Database["public"]["Enums"]["resource_type"]
        }
        Returns: boolean
      }
      util__auth_user_has_resource_share: {
        Args: {
          p_app: Database["public"]["Enums"]["app_type"]
          p_resource_id: string
          p_resource_type: Database["public"]["Enums"]["resource_type"]
          p_workspace_id: string
        }
        Returns: boolean
      }
      util__auth_user_may_select_dashboard: {
        Args: { p_dashboard_id: string }
        Returns: boolean
      }
      util__auth_user_may_select_dataset: {
        Args: { p_dataset_id: string }
        Returns: boolean
      }
      util__auth_user_may_select_resource_base: {
        Args: {
          p_resource_id: string
          p_resource_type: Database["public"]["Enums"]["resource_type"]
          p_workspace_id: string
        }
        Returns: boolean
      }
      util__auth_user_meets_min_app_role: {
        Args: {
          p_app: Database["public"]["Enums"]["app_type"]
          p_min_role: Database["public"]["Enums"]["role_level"]
          p_workspace_id: string
        }
        Returns: boolean
      }
      util__can_manage_workspace_settings: {
        Args: { p_workspace_id: string }
        Returns: boolean
      }
      util__dashboard_counts_as_shareable: {
        Args: { p_dashboard_id: string }
        Returns: boolean
      }
      util__email_domain: { Args: { p_email: string }; Returns: string }
      util__get_auth_user_app_role: {
        Args: {
          p_app: Database["public"]["Enums"]["app_type"]
          p_workspace_id: string
        }
        Returns: Database["public"]["Enums"]["role_level"]
      }
      util__get_auth_user_owned_workspaces: { Args: never; Returns: string[] }
      util__get_auth_user_user_group_ids: {
        Args: { p_workspace_id: string }
        Returns: string[]
      }
      util__get_auth_user_workspaces: { Args: never; Returns: string[] }
      util__get_user_id_by_email: { Args: { p_email: string }; Returns: string }
      util__has_non_owner_share: {
        Args: {
          p_owner_id: string
          p_resource_id: string
          p_resource_type: Database["public"]["Enums"]["resource_type"]
          p_workspace_id: string
        }
        Returns: boolean
      }
      util__is_resource_private_to_owner: {
        Args: {
          p_resource_id: string
          p_resource_type: Database["public"]["Enums"]["resource_type"]
        }
        Returns: boolean
      }
      util__is_settings_admin: {
        Args: { p_workspace_id: string }
        Returns: boolean
      }
      util__is_workspace_member: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: boolean
      }
      util__log_analytics_event: {
        Args: {
          p_app?: Database["public"]["Enums"]["app_type"]
          p_event_name: string
          p_payload?: Json
          p_user_id?: string
          p_workspace_id?: string
        }
        Returns: undefined
      }
      util__rank_to_role_level: {
        Args: { p_rank: number }
        Returns: Database["public"]["Enums"]["role_level"]
      }
      util__resource_effective_role: {
        Args: {
          p_resource_id: string
          p_resource_type: Database["public"]["Enums"]["resource_type"]
        }
        Returns: Database["public"]["Enums"]["role_level"]
      }
      util__resource_type_to_app_type: {
        Args: { p_resource_type: Database["public"]["Enums"]["resource_type"] }
        Returns: Database["public"]["Enums"]["app_type"]
      }
      util__role_level_rank: {
        Args: { p_role: Database["public"]["Enums"]["role_level"] }
        Returns: number
      }
      util__seed_builtin_role_groups_for_workspace: {
        Args: { p_workspace_id: string }
        Returns: undefined
      }
      util__storage_object_dashboard_id: {
        Args: { p_object_name: string }
        Returns: string
      }
      util__storage_object_dataset_id: {
        Args: { p_object_name: string }
        Returns: string
      }
      util__storage_object_snapshot_revision: {
        Args: { p_object_name: string }
        Returns: string
      }
      util__storage_object_workspace_id: {
        Args: { p_object_name: string }
        Returns: string
      }
      util__subscription_plan_rank: {
        Args: {
          p_plan: Database["public"]["Enums"]["subscriptions__feature_plan_type"]
        }
        Returns: number
      }
      util__text_array_to_text: {
        Args: { p_values: string[] }
        Returns: string
      }
      util__workspace_max_shareable_dashboards: {
        Args: { p_workspace_id: string }
        Returns: number
      }
    }
    Enums: {
      activity_events__kind:
        | "comment_created"
        | "comment_edited"
        | "comment_deleted"
      activity_events__source: "avandar" | "external"
      app_type:
        | "data_sources"
        | "data_explorer"
        | "dashboards"
        | "settings"
        | "gis"
        | "case_types"
        | "case_records"
      attribute_mappings__value_picker_rule_type:
        | "most_frequent"
        | "first"
        | "sum"
        | "avg"
        | "count"
        | "max"
        | "min"
      comment_reactions__kind:
        | "like"
        | "celebrate"
        | "support"
        | "love"
        | "insightful"
        | "funny"
      comment_revisions__reason: "edit" | "delete"
      concept_attributes__bucket_grain:
        | "day"
        | "week"
        | "month"
        | "quarter"
        | "year"
      concept_attributes__mapping_type: "dataset_column" | "manual_entry"
      connections__connection_type: "postgres"
      connections__postgres_ssl_mode: "disable" | "require"
      dashboard_snapshot_transition_kind:
        | "publish"
        | "abort_publish"
        | "unpublish"
        | "delete"
      dashboard_visibility: "draft" | "workspace" | "public"
      data_catalog_listings__access_kind: "pipeline_parquet" | "api_resource"
      data_catalog_listings__api_service: "ckan" | "socrata" | "odata"
      data_catalog_listings__invalid_dataset_reason:
        | "empty_dataset"
        | "dataset_not_found"
        | "authorization_required"
        | "unsupported_format"
        | "external_host"
        | "unparseable_dataset"
        | "unreachable_dataset"
      data_catalog_listings__parquet_cache_status:
        | "building"
        | "ready"
        | "failed"
      datasets__ava_data_type:
        | "boolean"
        | "bigint"
        | "double"
        | "time"
        | "date"
        | "timestamp"
        | "varchar"
      datasets__duckdb_data_type:
        | "BOOLEAN"
        | "TINYINT"
        | "SMALLINT"
        | "INTEGER"
        | "BIGINT"
        | "UBIGINT"
        | "UTINYINT"
        | "USMALLINT"
        | "UINTEGER"
        | "FLOAT"
        | "DOUBLE"
        | "DECIMAL"
        | "DATE"
        | "TIME"
        | "TIMESTAMP"
        | "TIMESTAMP_TZ"
        | "TIMESTAMP WITH TIME ZONE"
        | "INTERVAL"
        | "VARCHAR"
        | "BLOB"
        | "UUID"
        | "HUGEINT"
        | "BIT"
        | "ENUM"
        | "MAP"
        | "STRUCT"
        | "LIST"
        | "UNION"
        | "JSON"
        | "GEOMETRY"
      datasets__pdf_detection_mode: "tagged" | "lattice" | "stream" | "manual"
      datasets__pdf_output_mode: "natural" | "observations"
      datasets__pdf_region_shape:
        | "grid_table"
        | "labelled_graphic"
        | "repeating_blocks"
        | "prose_measures"
      datasets__postgres_table_relation_kind: "table" | "view"
      datasets__source_type:
        | "csv_file"
        | "google_sheets"
        | "virtual"
        | "open_data"
        | "xlsx_file"
        | "pdf_file"
        | "postgres_table"
      gadget_type:
        | "dashboard"
        | "dashboard_tile"
        | "dataset"
        | "map"
        | "concept"
        | "individual"
      nux_status: "not_started" | "in_progress" | "completed" | "dismissed"
      pipeline_execution_scopes__status: "succeeded" | "failed" | "skipped"
      pipeline_executions__command: "run" | "reset" | "prune_retired_scopes"
      pipeline_executions__invoked_via: "cli_local" | "cli_server" | "http"
      pipeline_executions__run_mode: "full" | "incremental"
      pipeline_executions__status:
        | "running"
        | "succeeded"
        | "partially_failed"
        | "failed"
        | "cancelled"
      resource_type: "dashboard" | "dataset" | "map"
      role_level: "viewer" | "editor" | "admin"
      share_principal_type: "user" | "user_group" | "workspace"
      subscriptions__feature_plan_type: "free" | "basic" | "premium"
      subscriptions__status:
        | "incomplete"
        | "incomplete_expired"
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "unpaid"
      subscriptions__update_status: "pending" | "completed"
      usage_analytics_events__category:
        | "acquisition"
        | "activation"
        | "engagement"
        | "expansion"
        | "revenue"
        | "other"
      usage_analytics_events__client: "web" | "desktop" | "server" | "db"
      workspace_invites__status: "pending" | "accepted"
    }
    CompositeTypes: {
      dataset_column_input: {
        original_name: string | null
        name: string | null
        description: string | null
        original_data_type: string | null
        detected_data_type:
          | Database["public"]["Enums"]["datasets__duckdb_data_type"]
          | null
        data_type: Database["public"]["Enums"]["datasets__ava_data_type"] | null
        column_idx: number | null
      }
      datasets__csv_file__date_format: {
        date_format: string | null
        timestamp_format: string | null
      }
      util__nullable_text: {
        value: string | null
      }
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
    Enums: {
      activity_events__kind: [
        "comment_created",
        "comment_edited",
        "comment_deleted",
      ],
      activity_events__source: ["avandar", "external"],
      app_type: [
        "data_sources",
        "data_explorer",
        "dashboards",
        "settings",
        "gis",
        "case_types",
        "case_records",
      ],
      attribute_mappings__value_picker_rule_type: [
        "most_frequent",
        "first",
        "sum",
        "avg",
        "count",
        "max",
        "min",
      ],
      comment_reactions__kind: [
        "like",
        "celebrate",
        "support",
        "love",
        "insightful",
        "funny",
      ],
      comment_revisions__reason: ["edit", "delete"],
      concept_attributes__bucket_grain: [
        "day",
        "week",
        "month",
        "quarter",
        "year",
      ],
      concept_attributes__mapping_type: ["dataset_column", "manual_entry"],
      connections__connection_type: ["postgres"],
      connections__postgres_ssl_mode: ["disable", "require"],
      dashboard_snapshot_transition_kind: [
        "publish",
        "abort_publish",
        "unpublish",
        "delete",
      ],
      dashboard_visibility: ["draft", "workspace", "public"],
      data_catalog_listings__access_kind: ["pipeline_parquet", "api_resource"],
      data_catalog_listings__api_service: ["ckan", "socrata", "odata"],
      data_catalog_listings__invalid_dataset_reason: [
        "empty_dataset",
        "dataset_not_found",
        "authorization_required",
        "unsupported_format",
        "external_host",
        "unparseable_dataset",
        "unreachable_dataset",
      ],
      data_catalog_listings__parquet_cache_status: [
        "building",
        "ready",
        "failed",
      ],
      datasets__ava_data_type: [
        "boolean",
        "bigint",
        "double",
        "time",
        "date",
        "timestamp",
        "varchar",
      ],
      datasets__duckdb_data_type: [
        "BOOLEAN",
        "TINYINT",
        "SMALLINT",
        "INTEGER",
        "BIGINT",
        "UBIGINT",
        "UTINYINT",
        "USMALLINT",
        "UINTEGER",
        "FLOAT",
        "DOUBLE",
        "DECIMAL",
        "DATE",
        "TIME",
        "TIMESTAMP",
        "TIMESTAMP_TZ",
        "TIMESTAMP WITH TIME ZONE",
        "INTERVAL",
        "VARCHAR",
        "BLOB",
        "UUID",
        "HUGEINT",
        "BIT",
        "ENUM",
        "MAP",
        "STRUCT",
        "LIST",
        "UNION",
        "JSON",
        "GEOMETRY",
      ],
      datasets__pdf_detection_mode: ["tagged", "lattice", "stream", "manual"],
      datasets__pdf_output_mode: ["natural", "observations"],
      datasets__pdf_region_shape: [
        "grid_table",
        "labelled_graphic",
        "repeating_blocks",
        "prose_measures",
      ],
      datasets__postgres_table_relation_kind: ["table", "view"],
      datasets__source_type: [
        "csv_file",
        "google_sheets",
        "virtual",
        "open_data",
        "xlsx_file",
        "pdf_file",
        "postgres_table",
      ],
      gadget_type: [
        "dashboard",
        "dashboard_tile",
        "dataset",
        "map",
        "concept",
        "individual",
      ],
      nux_status: ["not_started", "in_progress", "completed", "dismissed"],
      pipeline_execution_scopes__status: ["succeeded", "failed", "skipped"],
      pipeline_executions__command: ["run", "reset", "prune_retired_scopes"],
      pipeline_executions__invoked_via: ["cli_local", "cli_server", "http"],
      pipeline_executions__run_mode: ["full", "incremental"],
      pipeline_executions__status: [
        "running",
        "succeeded",
        "partially_failed",
        "failed",
        "cancelled",
      ],
      resource_type: ["dashboard", "dataset", "map"],
      role_level: ["viewer", "editor", "admin"],
      share_principal_type: ["user", "user_group", "workspace"],
      subscriptions__feature_plan_type: ["free", "basic", "premium"],
      subscriptions__status: [
        "incomplete",
        "incomplete_expired",
        "trialing",
        "active",
        "past_due",
        "canceled",
        "unpaid",
      ],
      subscriptions__update_status: ["pending", "completed"],
      usage_analytics_events__category: [
        "acquisition",
        "activation",
        "engagement",
        "expansion",
        "revenue",
        "other",
      ],
      usage_analytics_events__client: ["web", "desktop", "server", "db"],
      workspace_invites__status: ["pending", "accepted"],
    },
  },
} as const

