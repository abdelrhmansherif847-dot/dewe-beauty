// Generated from the dewe-beauty Supabase project schema. Regenerate after
// every migration (Supabase CLI: `supabase gen types typescript`).
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
      brands: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_sample: boolean
          logo_url: string | null
          name: string
          slug: string
          sort_order: number
          tagline: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_sample?: boolean
          logo_url?: string | null
          name: string
          slug: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_sample?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      collection_products: {
        Row: {
          collection_id: string
          product_id: string
          sort_order: number
        }
        Insert: {
          collection_id: string
          product_id: string
          sort_order?: number
        }
        Update: {
          collection_id?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_products_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_listing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          brand_name: string
          id: string
          line_total_cents: number
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          sku: string
          unit_price_cents: number
          variant_id: string | null
          variant_name: string
        }
        Insert: {
          brand_name: string
          id?: string
          line_total_cents: number
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          sku: string
          unit_price_cents: number
          variant_id?: string | null
          variant_name: string
        }
        Update: {
          brand_name?: string
          id?: string
          line_total_cents?: number
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sku?: string
          unit_price_cents?: number
          variant_id?: string | null
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_listing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          code: string
          created_at: string
          delivery_fee_cents: number | null
          is_active: boolean
          name: string
          name_ar: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          delivery_fee_cents?: number | null
          is_active?: boolean
          name: string
          name_ar: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          delivery_fee_cents?: number | null
          is_active?: boolean
          name?: string
          name_ar?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          created_at: string
          currency: string
          customer_name: string
          delivery_fee_cents: number
          delivery_zone_code: string | null
          email: string | null
          guest_access_hash: string | null
          id: string
          idempotency_key: string
          notes: string | null
          order_number: number
          payment_method: string
          phone: string
          region: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal_cents: number
          total_cents: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          created_at?: string
          currency: string
          customer_name: string
          delivery_fee_cents: number
          delivery_zone_code?: string | null
          email?: string | null
          guest_access_hash?: string | null
          id?: string
          idempotency_key: string
          notes?: string | null
          order_number?: never
          payment_method?: string
          phone: string
          region?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents: number
          total_cents: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          created_at?: string
          currency?: string
          customer_name?: string
          delivery_fee_cents?: number
          delivery_zone_code?: string | null
          email?: string | null
          guest_access_hash?: string | null
          id?: string
          idempotency_key?: string
          notes?: string | null
          order_number?: never
          payment_method?: string
          phone?: string
          region?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_delivery_zone_code_fkey"
            columns: ["delivery_zone_code"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["code"]
          },
        ]
      }
      product_images: {
        Row: {
          alt: string
          created_at: string
          id: string
          is_placeholder: boolean
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt?: string
          created_at?: string
          id?: string
          is_placeholder?: boolean
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          alt?: string
          created_at?: string
          id?: string
          is_placeholder?: boolean
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_listing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          compare_at_cents: number | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          price_cents: number
          product_id: string
          sku: string
          sort_order: number
          stock: number
          swatch_hex: string | null
          updated_at: string
        }
        Insert: {
          compare_at_cents?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          price_cents: number
          product_id: string
          sku: string
          sort_order?: number
          stock?: number
          swatch_hex?: string | null
          updated_at?: string
        }
        Update: {
          compare_at_cents?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          product_id?: string
          sku?: string
          sort_order?: number
          stock?: number
          swatch_hex?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_listing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string
          category_id: string | null
          created_at: string
          description: string | null
          how_to_use: string | null
          id: string
          ingredients: string | null
          is_active: boolean
          is_featured: boolean
          is_sample: boolean
          name: string
          short_description: string | null
          slug: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          brand_id: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          how_to_use?: string | null
          id?: string
          ingredients?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_sample?: boolean
          name: string
          short_description?: string | null
          slug: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          brand_id?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          how_to_use?: string | null
          id?: string
          ingredients?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_sample?: boolean
          name?: string
          short_description?: string | null
          slug?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          cod_enabled: boolean
          currency: string
          delivery_fee_cents: number
          free_delivery_threshold_cents: number | null
          id: boolean
          max_quantity_per_item: number
          updated_at: string
        }
        Insert: {
          cod_enabled?: boolean
          currency?: string
          delivery_fee_cents?: number
          free_delivery_threshold_cents?: number | null
          id?: boolean
          max_quantity_per_item?: number
          updated_at?: string
        }
        Update: {
          cod_enabled?: boolean
          currency?: string
          delivery_fee_cents?: number
          free_delivery_threshold_cents?: number | null
          id?: boolean
          max_quantity_per_item?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      product_listing: {
        Row: {
          brand_name: string | null
          brand_slug: string | null
          category_name: string | null
          category_slug: string | null
          compare_at_cents: number | null
          created_at: string | null
          default_variant_id: string | null
          default_variant_name: string | null
          default_variant_swatch: string | null
          id: string | null
          image_alt: string | null
          image_is_placeholder: boolean | null
          image_url: string | null
          is_featured: boolean | null
          is_sample: boolean | null
          max_price_cents: number | null
          min_price_cents: number | null
          name: string | null
          short_description: string | null
          slug: string | null
          tags: string[] | null
          total_stock: number | null
          variant_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_set_order_status: {
        Args: {
          p_order_id: string
          p_status: Database["public"]["Enums"]["order_status"]
        }
        Returns: Database["public"]["Enums"]["order_status"]
      }
      escape_like: { Args: { p_value: string }; Returns: string }
      get_guest_order: {
        Args: { p_access_token: string; p_order_id: string }
        Returns: Json
      }
      place_cod_order: {
        Args: { p_idempotency_key: string; p_items: Json; p_shipping: Json }
        Returns: {
          order_id: string
          order_number: number
        }[]
      }
      place_guest_cod_order: {
        Args: {
          p_access_token: string
          p_idempotency_key: string
          p_items: Json
          p_shipping: Json
        }
        Returns: {
          order_id: string
          order_number: number
        }[]
      }
      search_products: {
        Args: {
          p_brand?: string
          p_category?: string
          p_in_stock?: boolean
          p_limit?: number
          p_offset?: number
          p_query?: string
          p_sort?: string
        }
        Returns: Database["public"]["Views"]["product_listing"]["Row"][]
        SetofOptions: {
          from: "*"
          to: "product_listing"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      order_status:
        | "pending"
        | "confirmed"
        | "shipped"
        | "delivered"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof (PublicSchema["Tables"] & PublicSchema["Views"])> =
  (PublicSchema["Tables"] & PublicSchema["Views"])[T] extends { Row: infer R } ? R : never

export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]

export const Constants = {
  public: {
    Enums: {
      order_status: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
    },
  },
} as const
