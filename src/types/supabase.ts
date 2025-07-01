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
      organizations: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          role: string
          organization_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          first_name: string
          last_name: string
          role: string
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          role?: string
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      assessments: {
        Row: {
          id: string
          title: string
          description: string | null
          organization_id: string | null
          created_by_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          organization_id?: string | null
          created_by_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          organization_id?: string | null
          created_by_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      assessment_sections: {
        Row: {
          id: string
          assessment_id: string | null
          title: string
          description: string | null
          order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          assessment_id?: string | null
          title: string
          description?: string | null
          order: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          assessment_id?: string | null
          title?: string
          description?: string | null
          order?: number
          created_at?: string
          updated_at?: string
        }
      }
      assessment_questions: {
        Row: {
          id: string
          section_id: string | null
          text: string
          order: number
          question_type: string
          scale_max: number | null
          is_required: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          section_id?: string | null
          text: string
          order: number
          question_type?: string
          scale_max?: number | null
          is_required?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          section_id?: string | null
          text?: string
          order?: number
          question_type?: string
          scale_max?: number | null
          is_required?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      question_options: {
        Row: {
          id: string
          question_id: string | null
          text: string
          value: number | null
          order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          question_id?: string | null
          text: string
          value?: number | null
          order: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          question_id?: string | null
          text?: string
          value?: number | null
          order?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      question_type: "rating" | "multiple_choice" | "yes_no" | "text"
    }
  }
}