export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      cash_registers: {
        Row: {
          closed_at: string | null
          closing_amount: number | null
          created_at: string
          id: string
          is_open: boolean
          opened_at: string
          opening_amount: number | null
          owner_id: string
          total_cost: number
          total_expenses: number
          total_orders: number | null
          total_sales: number | null
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closing_amount?: number | null
          created_at?: string
          id?: string
          is_open?: boolean
          opened_at?: string
          opening_amount?: number | null
          owner_id: string
          total_cost?: number
          total_expenses?: number
          total_orders?: number | null
          total_sales?: number | null
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closing_amount?: number | null
          created_at?: string
          id?: string
          is_open?: boolean
          opened_at?: string
          opening_amount?: number | null
          owner_id?: string
          total_cost?: number
          total_expenses?: number
          total_orders?: number | null
          total_sales?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      discount_coupons: {
        Row: {
          created_at: string
          description: string | null
          discount_value: number
          id: string
          is_active: boolean
          name: string
          owner_id: string
          product_id: string | null
          scope: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_value: number
          id?: string
          is_active?: boolean
          name: string
          owner_id: string
          product_id?: string | null
          scope: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_value?: number
          id?: string
          is_active?: boolean
          name?: string
          owner_id?: string
          product_id?: string | null
          scope?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          access_key: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          owner_id: string
          password_hash: string
          updated_at: string
        }
        Insert: {
          access_key: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          owner_id: string
          password_hash: string
          updated_at?: string
        }
        Update: {
          access_key?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          owner_id?: string
          password_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          cash_register_id: string
          created_at: string
          description: string
          id: string
          ingredient_ids: Json | null
          product_id: string | null
          quantity: number | null
          reason: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          cash_register_id: string
          created_at?: string
          description: string
          id?: string
          ingredient_ids?: Json | null
          product_id?: string | null
          quantity?: number | null
          reason?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          cash_register_id?: string
          created_at?: string
          description?: string
          id?: string
          ingredient_ids?: Json | null
          product_id?: string | null
          quantity?: number | null
          reason?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
        ]
      }
      external_product_entries: {
        Row: {
          created_at: string
          id: string
          invoice_number: string | null
          notes: string | null
          owner_id: string
          product_id: string
          quantity: number
          remaining_quantity: number
          supplier: string | null
          total_cost: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          owner_id: string
          product_id: string
          quantity: number
          remaining_quantity: number
          supplier?: string | null
          total_cost: number
          unit_cost: number
        }
        Update: {
          created_at?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          owner_id?: string
          product_id?: string
          quantity?: number
          remaining_quantity?: number
          supplier?: string | null
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "external_product_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "external_products"
            referencedColumns: ["id"]
          },
        ]
      }
      external_products: {
        Row: {
          brand: string | null
          cost: number
          created_at: string | null
          current_stock: number
          description: string | null
          id: string
          min_stock: number
          name: string
          owner_id: string
          price: number
          updated_at: string | null
        }
        Insert: {
          brand?: string | null
          cost?: number
          created_at?: string | null
          current_stock?: number
          description?: string | null
          id?: string
          min_stock?: number
          name: string
          owner_id: string
          price?: number
          updated_at?: string | null
        }
        Update: {
          brand?: string | null
          cost?: number
          created_at?: string | null
          current_stock?: number
          description?: string | null
          id?: string
          min_stock?: number
          name?: string
          owner_id?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_products_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      food_ingredients: {
        Row: {
          created_at: string | null
          food_id: string
          id: string
          ingredient_id: string
          quantity: number
          unit: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          food_id: string
          id?: string
          ingredient_id: string
          quantity: number
          unit: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          food_id?: string
          id?: string
          ingredient_id?: string
          quantity?: number
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_ingredients_new_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_ingredients_new_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          available: boolean | null
          category: string
          cost: number
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          owner_id: string
          preparation_time: number
          price: number
          updated_at: string | null
        }
        Insert: {
          available?: boolean | null
          category: string
          cost?: number
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          owner_id: string
          preparation_time?: number
          price?: number
          updated_at?: string | null
        }
        Update: {
          available?: boolean | null
          category?: string
          cost?: number
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          preparation_time?: number
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          cost: number
          created_at: string | null
          current_stock: number
          description: string | null
          id: string
          min_stock: number
          name: string
          owner_id: string
          supplier: string | null
          unit: string
          updated_at: string | null
        }
        Insert: {
          cost?: number
          created_at?: string | null
          current_stock?: number
          description?: string | null
          id?: string
          min_stock?: number
          name: string
          owner_id: string
          supplier?: string | null
          unit: string
          updated_at?: string | null
        }
        Update: {
          cost?: number
          created_at?: string | null
          current_stock?: number
          description?: string | null
          id?: string
          min_stock?: number
          name?: string
          owner_id?: string
          supplier?: string | null
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          cash_register_id: string
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_name: string
          product_type: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          cash_register_id: string
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_name: string
          product_type?: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          cash_register_id?: string
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          product_type?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cash_register_id: string
          created_at: string
          customer_name: string | null
          id: string
          payment_method: string | null
          status: string
          subtotal: number
          table_number: number | null
          tax: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cash_register_id: string
          created_at?: string
          customer_name?: string | null
          id?: string
          payment_method?: string | null
          status: string
          subtotal: number
          table_number?: number | null
          tax: number
          total: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cash_register_id?: string
          created_at?: string
          customer_name?: string | null
          id?: string
          payment_method?: string | null
          status?: string
          subtotal?: number
          table_number?: number | null
          tax?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          available: boolean | null
          cost: number
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          owner_id: string
          price: number
          type: Database["public"]["Enums"]["product_type"]
          updated_at: string | null
        }
        Insert: {
          available?: boolean | null
          cost: number
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          owner_id: string
          price: number
          type: Database["public"]["Enums"]["product_type"]
          updated_at?: string | null
        }
        Update: {
          available?: boolean | null
          cost?: number
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          price?: number
          type?: Database["public"]["Enums"]["product_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admin_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles_duplicate: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          cash_register_id: string
          created_at: string
          customer_name: string | null
          id: string
          is_direct_sale: boolean
          items: Json | null
          order_id: string | null
          payments: Json | null
          subtotal: number
          tax: number
          total: number
          user_id: string
        }
        Insert: {
          cash_register_id: string
          created_at?: string
          customer_name?: string | null
          id?: string
          is_direct_sale?: boolean
          items?: Json | null
          order_id?: string | null
          payments?: Json | null
          subtotal?: number
          tax?: number
          total: number
          user_id: string
        }
        Update: {
          cash_register_id?: string
          created_at?: string
          customer_name?: string | null
          id?: string
          is_direct_sale?: boolean
          items?: Json | null
          order_id?: string | null
          payments?: Json | null
          subtotal?: number
          tax?: number
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_taxes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          percentage: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          percentage?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          percentage?: number
          updated_at?: string
        }
        Relationships: []
      }
      stock_entries: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          invoice_number: string | null
          notes: string | null
          owner_id: string
          quantity: number
          remaining_quantity: number
          supplier: string | null
          total_cost: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          invoice_number?: string | null
          notes?: string | null
          owner_id: string
          quantity: number
          remaining_quantity: number
          supplier?: string | null
          total_cost: number
          unit_cost: number
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          invoice_number?: string | null
          notes?: string | null
          owner_id?: string
          quantity?: number
          remaining_quantity?: number
          supplier?: string | null
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_entries_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          item_type: string
          movement_type: string
          new_stock: number
          previous_stock: number
          quantity: number
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          item_type: string
          movement_type: string
          new_stock: number
          previous_stock: number
          quantity: number
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string
          item_type?: string
          movement_type?: string
          new_stock?: number
          previous_stock?: number
          quantity?: number
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_stock: {
        Args: {
          p_item_type: string
          p_item_id: string
          p_quantity: number
          p_reason: string
          p_user_id: string
        }
        Returns: string
      }
      calculate_external_product_average_cost: {
        Args: { p_product_id: string }
        Returns: number
      }
      calculate_weighted_average_cost: {
        Args: { p_ingredient_id: string }
        Returns: number
      }
      create_employee: {
        Args: {
          p_owner_id: string
          p_access_key: string
          p_password: string
          p_name: string
        }
        Returns: string
      }
      delete_external_product_cascade: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      delete_ingredient_cascade: {
        Args: { p_ingredient_id: string }
        Returns: undefined
      }
      delete_ingredient_with_entries: {
        Args: { ingredient_id: string }
        Returns: undefined
      }
      get_open_cash_register: {
        Args: { p_owner_id: string }
        Returns: string
      }
      remove_stock: {
        Args: {
          p_item_type: string
          p_item_id: string
          p_quantity: number
          p_reason: string
          p_user_id: string
        }
        Returns: string
      }
      verify_employee_credentials: {
        Args: { p_access_key: string; p_password: string }
        Returns: {
          employee_id: string
          employee_name: string
          owner_id: string
        }[]
      }
    }
    Enums: {
      alert_type: "low_stock" | "critical_stock" | "expiration"
      product_type: "food" | "external"
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
  public: {
    Enums: {
      alert_type: ["low_stock", "critical_stock", "expiration"],
      product_type: ["food", "external"],
    },
  },
} as const
