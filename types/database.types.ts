export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      business_profiles: {
        Row: {
          id: string
          user_id: string
          company_name: string | null
          email: string | null
          phone: string | null
          address: string | null
          logo_url: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          company_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          company_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string | null
          company: string | null
          phone: string | null
          address: string | null
          status: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email?: string | null
          company?: string | null
          phone?: string | null
          address?: string | null
          status?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string | null
          company?: string | null
          phone?: string | null
          address?: string | null
          status?: string | null
          created_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          id: string
          user_id: string
          customer_id: string | null
          doc_type: 'INVOICE' | 'ESTIMATE' | string
          invoice_number: string
          subtotal: number
          discount_amount: number
          tax_rate: number
          tax_amount: number
          amount: number
          status: string
          issue_date: string | null
          due_date: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          customer_id?: string | null
          doc_type?: string
          invoice_number: string
          subtotal?: number
          discount_amount?: number
          tax_rate?: number
          tax_amount?: number
          amount: number
          status?: string
          issue_date?: string | null
          due_date?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          customer_id?: string | null
          doc_type?: string
          invoice_number?: string
          subtotal?: number
          discount_amount?: number
          tax_rate?: number
          tax_amount?: number
          amount?: number
          status?: string
          issue_date?: string | null
          due_date?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          description: string
          quantity: number
          unit_price: number
          amount: number
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          description: string
          quantity?: number
          unit_price?: number
          amount?: number
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          description?: string
          quantity?: number
          unit_price?: number
          amount?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
