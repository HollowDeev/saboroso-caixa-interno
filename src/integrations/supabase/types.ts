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
      cash_register_sales: {
        Row: {
          cash_register_id: string
          created_at: string
          id: string
          order_id: string
          product_cost: number
          product_name: string
          profit: number
          quantity: number
          sale_date: string
          total_price: number
          unit_price: number
        }
        Insert: {
          cash_register_id: string
          created_at?: string
          id?: string
          order_id: string
          product_cost?: number
          product_name: string
          profit?: number
          quantity: number
          sale_date?: string
          total_price: number
          unit_price: number
        }
        Update: {
          cash_register_id?: string
          created_at?: string
          id?: string
          order_id?: string
          product_cost?: number
          product_name?: string
          profit?: number
          quantity?: number
          sale_date?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_sales_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
        ]
      }
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
          total_orders?: number | null
          total_sales?: number | null
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
      orders: {
        Row: {
          created_at: string
          customer_name: string | null
          id: string
          items: Json
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
          created_at?: string
          customer_name?: string | null
          id?: string
          items?: Json
          payment_method?: string | null
          status?: string
          subtotal?: number
          table_number?: number | null
          tax?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          id?: string
          items?: Json
          payment_method?: string | null
          status?: string
          subtotal?: number
          table_number?: number | null
          tax?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
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
          created_at: string
          id: string
          order_id: string
          payment_method: string
          total: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          payment_method: string
          total?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          payment_method?: string
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          unit: string;
          current_stock: number;
          min_stock: number;
          cost: number;
          supplier: string | null;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          unit: string;
          current_stock?: number;
          min_stock: number;
          cost: number;
          supplier?: string | null;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          unit?: string;
          current_stock?: number;
          min_stock?: number;
          cost?: number;
          supplier?: string | null;
          owner_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      external_products: {
        Row: {
          id: string;
          name: string;
          brand: string | null;
          description: string | null;
          current_stock: number;
          min_stock: number;
          cost: number;
          price: number;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          brand?: string | null;
          description?: string | null;
          current_stock?: number;
          min_stock: number;
          cost: number;
          price: number;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          brand?: string | null;
          description?: string | null;
          current_stock?: number;
          min_stock?: number;
          cost?: number;
          price?: number;
          owner_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      stock_movements: {
        Row: {
          id: string;
          item_type: 'ingredient' | 'external_product';
          item_id: string;
          movement_type: 'add' | 'remove';
          quantity: number;
          previous_stock: number;
          new_stock: number;
          reason: string | null;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_type: 'ingredient' | 'external_product';
          item_id: string;
          movement_type: 'add' | 'remove';
          quantity: number;
          previous_stock: number;
          new_stock: number;
          reason?: string | null;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          item_type?: 'ingredient' | 'external_product';
          item_id?: string;
          movement_type?: 'add' | 'remove';
          quantity?: number;
          previous_stock?: number;
          new_stock?: number;
          reason?: string | null;
          user_id?: string;
          created_at?: string;
        };
      };
      stock_entries: {
        Row: {
          id: string
          ingredient_id: string
          quantity: number
          remaining_quantity: number
          unit_cost: number
          total_cost: number
          supplier: string | null
          invoice_number: string | null
          notes: string | null
          created_at: string
          owner_id: string
        }
        Insert: {
          id?: string
          ingredient_id: string
          quantity: number
          remaining_quantity: number
          unit_cost: number
          total_cost: number
          supplier?: string | null
          invoice_number?: string | null
          notes?: string | null
          created_at?: string
          owner_id: string
        }
        Update: {
          id?: string
          ingredient_id?: string
          quantity?: number
          remaining_quantity?: number
          unit_cost?: number
          total_cost?: number
          supplier?: string | null
          invoice_number?: string | null
          notes?: string | null
          created_at?: string
          owner_id?: string
        }
      }
      external_product_entries: {
        Row: {
          id: string;
          product_id: string;
          quantity: number;
          remaining_quantity: number;
          unit_cost: number;
          total_cost: number;
          supplier: string | null;
          invoice_number: string | null;
          notes: string | null;
          created_at: string;
          owner_id: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          quantity: number;
          remaining_quantity: number;
          unit_cost: number;
          total_cost: number;
          supplier?: string | null;
          invoice_number?: string | null;
          notes?: string | null;
          created_at?: string;
          owner_id: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          quantity?: number;
          remaining_quantity?: number;
          unit_cost?: number;
          total_cost?: number;
          supplier?: string | null;
          invoice_number?: string | null;
          notes?: string | null;
          created_at?: string;
          owner_id?: string;
        };
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_employee: {
        Args: {
          p_owner_id: string
          p_access_key: string
          p_password: string
          p_name: string
        }
        Returns: string
      }
      get_open_cash_register: {
        Args: { p_owner_id: string }
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
      add_stock: {
        Args: {
          p_item_type: string;
          p_item_id: string;
          p_quantity: number;
          p_reason: string;
          p_user_id: string;
        };
        Returns: string;
      };
      remove_stock: {
        Args: {
          p_item_type: string;
          p_item_id: string;
          p_quantity: number;
          p_reason: string;
          p_user_id: string;
        };
        Returns: string;
      };
      calculate_weighted_average_cost: {
        Args: {
          p_ingredient_id: string
        }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
