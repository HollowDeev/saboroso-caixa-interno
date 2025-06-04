import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type Database = {
  public: {
    Tables: {
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          product_name: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          product_name: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          product_name?: string;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          }
        ];
      };
      orders: {
        Row: {
          id: string;
          customer_name: string | null;
          table_number: number | null;
          subtotal: number;
          tax: number;
          total: number;
          status: string;
          payment_method: string | null;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_name?: string | null;
          table_number?: number | null;
          subtotal: number;
          tax: number;
          total: number;
          status: string;
          payment_method?: string | null;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_name?: string | null;
          table_number?: number | null;
          subtotal?: number;
          tax?: number;
          total?: number;
          status?: string;
          payment_method?: string | null;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ];
      };
      sales: {
        Row: {
          id: string;
          order_id: string;
          total: number;
          payment_method: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          total: number;
          payment_method: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          total?: number;
          payment_method?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sales_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ];
      };
      service_taxes: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          percentage: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          percentage: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          percentage?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      cash_register_sales: {
        Row: {
          id: string;
          cash_register_id: string;
          order_id: string;
          product_name: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          product_cost: number;
          profit: number;
          sale_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          cash_register_id: string;
          order_id: string;
          product_name: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          product_cost: number;
          profit: number;
          sale_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          cash_register_id?: string;
          order_id?: string;
          product_name?: string;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          product_cost?: number;
          profit?: number;
          sale_date?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cash_register_sales_cash_register_id_fkey"
            columns: ["cash_register_id"]
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_sales_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          }
        ];
      };
    };
  };
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey); 