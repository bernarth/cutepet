
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"id": number,"new_data": Json | null,"old_data": Json | null,"reason": string | null,"record_id": string,"table_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"id"?: never,"new_data"?: Json | null,"old_data"?: Json | null,"reason"?: string | null,"record_id": string,"table_name": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"id"?: never,"new_data"?: Json | null,"old_data"?: Json | null,"reason"?: string | null,"record_id"?: string,"table_name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"categories": {
                  Row: {
                    "active": boolean,"id": number,"name": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"id"?: never,"name": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "active"?: boolean,"id"?: never,"name"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"order_items": {
                  Row: {
                    "id": number,"is_made_to_order": boolean,"order_id": string,"product_name": string,"quantity": number,"unit_price": number,"variant_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: never,"is_made_to_order": boolean,"order_id": string,"product_name": string,"quantity": number,"unit_price": number,"variant_id": number
                  }
                  Update: {
                    "id"?: never,"is_made_to_order"?: boolean,"order_id"?: string,"product_name"?: string,"quantity"?: number,"unit_price"?: number,"variant_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "catalog_variants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "variants"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "cancel_reason": string | null,"channel": Database["public"]['Enums']["order_channel"],"code": string,"created_at": string,"customer_id": string | null,"customer_name": string,"customer_phone": string,"delivery_method": Database["public"]['Enums']["delivery_method"],"destination_city": string | null,"id": string,"items_total": number,"needs_attention": boolean,"payment_proof_path": string | null,"pickup_fee": number,"recipient_id_number": string | null,"recipient_name": string | null,"reserved_until": string | null,"shipping_paid_by_store": boolean,"shipping_receipt_path": string | null,"status": Database["public"]['Enums']["order_status"],"status_before_cancel": Database["public"]['Enums']["order_status"] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cancel_reason"?: string | null,"channel": Database["public"]['Enums']["order_channel"],"code"?: string,"created_at"?: string,"customer_id"?: string | null,"customer_name": string,"customer_phone": string,"delivery_method": Database["public"]['Enums']["delivery_method"],"destination_city"?: string | null,"id"?: string,"items_total": number,"needs_attention"?: boolean,"payment_proof_path"?: string | null,"pickup_fee"?: number,"recipient_id_number"?: string | null,"recipient_name"?: string | null,"reserved_until"?: string | null,"shipping_paid_by_store"?: boolean,"shipping_receipt_path"?: string | null,"status": Database["public"]['Enums']["order_status"],"status_before_cancel"?: Database["public"]['Enums']["order_status"] | null
                  }
                  Update: {
                    "cancel_reason"?: string | null,"channel"?: Database["public"]['Enums']["order_channel"],"code"?: string,"created_at"?: string,"customer_id"?: string | null,"customer_name"?: string,"customer_phone"?: string,"delivery_method"?: Database["public"]['Enums']["delivery_method"],"destination_city"?: string | null,"id"?: string,"items_total"?: number,"needs_attention"?: boolean,"payment_proof_path"?: string | null,"pickup_fee"?: number,"recipient_id_number"?: string | null,"recipient_name"?: string | null,"reserved_until"?: string | null,"shipping_paid_by_store"?: boolean,"shipping_receipt_path"?: string | null,"status"?: Database["public"]['Enums']["order_status"],"status_before_cancel"?: Database["public"]['Enums']["order_status"] | null
                  }
                  Relationships: [
                    
                  ]
                },"pet_types": {
                  Row: {
                    "active": boolean,"id": number,"name": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"id"?: never,"name": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "active"?: boolean,"id"?: never,"name"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"product_photos": {
                  Row: {
                    "alt_text": string,"id": number,"product_id": number,"sort_order": number,"storage_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alt_text": string,"id"?: never,"product_id": number,"sort_order"?: number,"storage_path": string
                  }
                  Update: {
                    "alt_text"?: string,"id"?: never,"product_id"?: number,"sort_order"?: number,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_photos_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"products": {
                  Row: {
                    "availability": Database["public"]['Enums']["availability"],"category_id": number,"created_at": string,"description": string,"id": number,"is_active": boolean,"is_featured": boolean,"name": string,"pet_type_id": number,"price": number,"production_days": number | null,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "availability"?: Database["public"]['Enums']["availability"],"category_id": number,"created_at"?: string,"description"?: string,"id"?: never,"is_active"?: boolean,"is_featured"?: boolean,"name": string,"pet_type_id": number,"price": number,"production_days"?: number | null,"slug": string
                  }
                  Update: {
                    "availability"?: Database["public"]['Enums']["availability"],"category_id"?: number,"created_at"?: string,"description"?: string,"id"?: never,"is_active"?: boolean,"is_featured"?: boolean,"name"?: string,"pet_type_id"?: number,"price"?: number,"production_days"?: number | null,"slug"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "products_pet_type_id_fkey"
      columns: ["pet_type_id"]
isOneToOne: false
      referencedRelation: "pet_types"
      referencedColumns: ["id"]
    }
                  ]
                },"settings": {
                  Row: {
                    "free_pickup_min_items": number,"id": boolean,"pickup_address": string,"pickup_fee": number,"pickup_hours": string,"pickup_notice": string,"qr_checkout_enabled": boolean,"qr_disabled_message": string,"qr_expires_on": string | null,"qr_image_path": string | null,"reservation_minutes": number,"shipping_promo_enabled": boolean,"shipping_promo_min_items": number | null,"shipping_promo_min_total": number | null,"store_whatsapp": string | null,"validation_hours": string
                  }
                  ComputedFields: never
                  Insert: {
                    "free_pickup_min_items"?: number,"id"?: boolean,"pickup_address"?: string,"pickup_fee"?: number,"pickup_hours"?: string,"pickup_notice"?: string,"qr_checkout_enabled"?: boolean,"qr_disabled_message"?: string,"qr_expires_on"?: string | null,"qr_image_path"?: string | null,"reservation_minutes"?: number,"shipping_promo_enabled"?: boolean,"shipping_promo_min_items"?: number | null,"shipping_promo_min_total"?: number | null,"store_whatsapp"?: string | null,"validation_hours"?: string
                  }
                  Update: {
                    "free_pickup_min_items"?: number,"id"?: boolean,"pickup_address"?: string,"pickup_fee"?: number,"pickup_hours"?: string,"pickup_notice"?: string,"qr_checkout_enabled"?: boolean,"qr_disabled_message"?: string,"qr_expires_on"?: string | null,"qr_image_path"?: string | null,"reservation_minutes"?: number,"shipping_promo_enabled"?: boolean,"shipping_promo_min_items"?: number | null,"shipping_promo_min_total"?: number | null,"store_whatsapp"?: string | null,"validation_hours"?: string
                  }
                  Relationships: [
                    
                  ]
                },"sizes": {
                  Row: {
                    "active": boolean,"back_length_max": number,"back_length_min": number,"chest_max": number,"chest_min": number,"id": number,"label": string,"neck_max": number,"neck_min": number,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"back_length_max": number,"back_length_min": number,"chest_max": number,"chest_min": number,"id"?: never,"label": string,"neck_max": number,"neck_min": number,"sort_order": number
                  }
                  Update: {
                    "active"?: boolean,"back_length_max"?: number,"back_length_min"?: number,"chest_max"?: number,"chest_min"?: number,"id"?: never,"label"?: string,"neck_max"?: number,"neck_min"?: number,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"user_roles": {
                  Row: {
                    "created_at": string,"role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"role"?: Database["public"]['Enums']["app_role"],"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"variants": {
                  Row: {
                    "back_length_cm": number | null,"chest_cm": number | null,"id": number,"neck_cm": number | null,"product_id": number,"size_id": number,"stock": number
                  }
                  ComputedFields: never
                  Insert: {
                    "back_length_cm"?: number | null,"chest_cm"?: number | null,"id"?: never,"neck_cm"?: number | null,"product_id": number,"size_id": number,"stock"?: number
                  }
                  Update: {
                    "back_length_cm"?: number | null,"chest_cm"?: number | null,"id"?: never,"neck_cm"?: number | null,"product_id"?: number,"size_id"?: number,"stock"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "variants_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "variants_size_id_fkey"
      columns: ["size_id"]
isOneToOne: false
      referencedRelation: "sizes"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "catalog_variants": {
                  Row: {
                    "available_stock": number | null,"back_length_cm": number | null,"chest_cm": number | null,"id": number,"neck_cm": number | null,"product_id": number,"size_id": number,"stock": number
                  }
                  ComputedFields: never
                  Insert: {
                           "available_stock"?: never,"back_length_cm"?: number | null,"chest_cm"?: number | null,"id"?: number | null,"neck_cm"?: number | null,"product_id"?: number | null,"size_id"?: number | null,"stock"?: number | null
                         }
                        Update: {
                           "available_stock"?: never,"back_length_cm"?: number | null,"chest_cm"?: number | null,"id"?: number | null,"neck_cm"?: number | null,"product_id"?: number | null,"size_id"?: number | null,"stock"?: number | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "variants_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "variants_size_id_fkey"
      columns: ["size_id"]
isOneToOne: false
      referencedRelation: "sizes"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "adjust_stock":
{ Args: { "new_stock": number,"reason": string,"variant_id": number }; Returns: {
              "back_length_cm": number | null,
"chest_cm": number | null,
"id": number,
"neck_cm": number | null,
"product_id": number,
"size_id": number,
"stock": number
            }
                          SetofOptions: {
        from: "*"
        to: "variants"
        isOneToOne: true
        isSetofReturn: false
      } },
"advance_order":
{ Args: { "order_id": string }; Returns: {
              "cancel_reason": string | null,
"channel": Database["public"]['Enums']["order_channel"],
"code": string,
"created_at": string,
"customer_id": string | null,
"customer_name": string,
"customer_phone": string,
"delivery_method": Database["public"]['Enums']["delivery_method"],
"destination_city": string | null,
"id": string,
"items_total": number,
"needs_attention": boolean,
"payment_proof_path": string | null,
"pickup_fee": number,
"recipient_id_number": string | null,
"recipient_name": string | null,
"reserved_until": string | null,
"shipping_paid_by_store": boolean,
"shipping_receipt_path": string | null,
"status": Database["public"]['Enums']["order_status"],
"status_before_cancel": Database["public"]['Enums']["order_status"] | null
            }
                          SetofOptions: {
        from: "*"
        to: "orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"cancel_order":
{ Args: { "order_id": string,"reason"?: string }; Returns: {
              "cancel_reason": string | null,
"channel": Database["public"]['Enums']["order_channel"],
"code": string,
"created_at": string,
"customer_id": string | null,
"customer_name": string,
"customer_phone": string,
"delivery_method": Database["public"]['Enums']["delivery_method"],
"destination_city": string | null,
"id": string,
"items_total": number,
"needs_attention": boolean,
"payment_proof_path": string | null,
"pickup_fee": number,
"recipient_id_number": string | null,
"recipient_name": string | null,
"reserved_until": string | null,
"shipping_paid_by_store": boolean,
"shipping_receipt_path": string | null,
"status": Database["public"]['Enums']["order_status"],
"status_before_cancel": Database["public"]['Enums']["order_status"] | null
            }
                          SetofOptions: {
        from: "*"
        to: "orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"confirm_order":
{ Args: { "order_id": string }; Returns: {
              "cancel_reason": string | null,
"channel": Database["public"]['Enums']["order_channel"],
"code": string,
"created_at": string,
"customer_id": string | null,
"customer_name": string,
"customer_phone": string,
"delivery_method": Database["public"]['Enums']["delivery_method"],
"destination_city": string | null,
"id": string,
"items_total": number,
"needs_attention": boolean,
"payment_proof_path": string | null,
"pickup_fee": number,
"recipient_id_number": string | null,
"recipient_name": string | null,
"reserved_until": string | null,
"shipping_paid_by_store": boolean,
"shipping_receipt_path": string | null,
"status": Database["public"]['Enums']["order_status"],
"status_before_cancel": Database["public"]['Enums']["order_status"] | null
            }
                          SetofOptions: {
        from: "*"
        to: "orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_quick_sale":
{ Args: { "customer_name": string,"customer_phone": string,"delivery_method": Database["public"]['Enums']["delivery_method"],"destination_city"?: string,"items": Json,"recipient_id_number"?: string,"recipient_name"?: string }; Returns: {
              "cancel_reason": string | null,
"channel": Database["public"]['Enums']["order_channel"],
"code": string,
"created_at": string,
"customer_id": string | null,
"customer_name": string,
"customer_phone": string,
"delivery_method": Database["public"]['Enums']["delivery_method"],
"destination_city": string | null,
"id": string,
"items_total": number,
"needs_attention": boolean,
"payment_proof_path": string | null,
"pickup_fee": number,
"recipient_id_number": string | null,
"recipient_name": string | null,
"reserved_until": string | null,
"shipping_paid_by_store": boolean,
"shipping_receipt_path": string | null,
"status": Database["public"]['Enums']["order_status"],
"status_before_cancel": Database["public"]['Enums']["order_status"] | null
            }
                          SetofOptions: {
        from: "*"
        to: "orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"custom_access_token_hook":
{ Args: { "event": Json }; Returns: Json
                           },
"reserve_order":
{ Args: { "customer_name": string,"customer_phone": string,"delivery_method": Database["public"]['Enums']["delivery_method"],"destination_city"?: string,"items": Json,"recipient_id_number"?: string,"recipient_name"?: string }; Returns: {
              "cancel_reason": string | null,
"channel": Database["public"]['Enums']["order_channel"],
"code": string,
"created_at": string,
"customer_id": string | null,
"customer_name": string,
"customer_phone": string,
"delivery_method": Database["public"]['Enums']["delivery_method"],
"destination_city": string | null,
"id": string,
"items_total": number,
"needs_attention": boolean,
"payment_proof_path": string | null,
"pickup_fee": number,
"recipient_id_number": string | null,
"recipient_name": string | null,
"reserved_until": string | null,
"shipping_paid_by_store": boolean,
"shipping_receipt_path": string | null,
"status": Database["public"]['Enums']["order_status"],
"status_before_cancel": Database["public"]['Enums']["order_status"] | null
            }
                          SetofOptions: {
        from: "*"
        to: "orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"restore_order":
{ Args: { "order_id": string,"reason": string }; Returns: {
              "cancel_reason": string | null,
"channel": Database["public"]['Enums']["order_channel"],
"code": string,
"created_at": string,
"customer_id": string | null,
"customer_name": string,
"customer_phone": string,
"delivery_method": Database["public"]['Enums']["delivery_method"],
"destination_city": string | null,
"id": string,
"items_total": number,
"needs_attention": boolean,
"payment_proof_path": string | null,
"pickup_fee": number,
"recipient_id_number": string | null,
"recipient_name": string | null,
"reserved_until": string | null,
"shipping_paid_by_store": boolean,
"shipping_receipt_path": string | null,
"status": Database["public"]['Enums']["order_status"],
"status_before_cancel": Database["public"]['Enums']["order_status"] | null
            }
                          SetofOptions: {
        from: "*"
        to: "orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"revert_order_status":
{ Args: { "order_id": string,"reason": string }; Returns: {
              "cancel_reason": string | null,
"channel": Database["public"]['Enums']["order_channel"],
"code": string,
"created_at": string,
"customer_id": string | null,
"customer_name": string,
"customer_phone": string,
"delivery_method": Database["public"]['Enums']["delivery_method"],
"destination_city": string | null,
"id": string,
"items_total": number,
"needs_attention": boolean,
"payment_proof_path": string | null,
"pickup_fee": number,
"recipient_id_number": string | null,
"recipient_name": string | null,
"reserved_until": string | null,
"shipping_paid_by_store": boolean,
"shipping_receipt_path": string | null,
"status": Database["public"]['Enums']["order_status"],
"status_before_cancel": Database["public"]['Enums']["order_status"] | null
            }
                          SetofOptions: {
        from: "*"
        to: "orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"submit_payment_proof":
{ Args: { "order_id": string,"proof_path": string }; Returns: {
              "cancel_reason": string | null,
"channel": Database["public"]['Enums']["order_channel"],
"code": string,
"created_at": string,
"customer_id": string | null,
"customer_name": string,
"customer_phone": string,
"delivery_method": Database["public"]['Enums']["delivery_method"],
"destination_city": string | null,
"id": string,
"items_total": number,
"needs_attention": boolean,
"payment_proof_path": string | null,
"pickup_fee": number,
"recipient_id_number": string | null,
"recipient_name": string | null,
"reserved_until": string | null,
"shipping_paid_by_store": boolean,
"shipping_receipt_path": string | null,
"status": Database["public"]['Enums']["order_status"],
"status_before_cancel": Database["public"]['Enums']["order_status"] | null
            }
                          SetofOptions: {
        from: "*"
        to: "orders"
        isOneToOne: true
        isSetofReturn: false
      } }
          }
          Enums: {
            "app_role": "admin","availability": "in_stock"|"made_to_order","delivery_method": "pickup_point"|"bus_parcel","order_channel": "web"|"whatsapp","order_status": "pending_payment"|"proof_uploaded"|"confirmed"|"in_production"|"ready_for_pickup"|"shipped"|"delivered"|"cancelled"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "app_role": ["admin"],"availability": ["in_stock", "made_to_order"],"delivery_method": ["pickup_point", "bus_parcel"],"order_channel": ["web", "whatsapp"],"order_status": ["pending_payment", "proof_uploaded", "confirmed", "in_production", "ready_for_pickup", "shipped", "delivered", "cancelled"]
          }
        }
} as const
