export interface BookingSnapshot {
    property_name: string;
    property_address: string;
    property_city: string;
    property_state: string;
    property_coordinates: {
      latitude: number;
      longitude: number;
    };
    total_acres: number;
    provider_info?: {
      provider_name: string;
      provider_phone: string;
      provider_email: string;
    };
    hunting_package_details: {
      rules?: string;
      safety_info?: string;
      license_requirements?: string;
    };
  }
  
  export interface Booking {
    id: number;
    property_id: number;
    user_id: number;
    check_in_date: string;
    check_out_date: string;
    guest_count: number;
    lead_hunter_name: string;
    lead_hunter_phone: string;
    lead_hunter_email: string;
    hunting_package_id: string;
    hunting_package_name: string;
    hunting_package_type: string;
    hunting_package_duration: number;
    package_price: number;
    service_fee: number;
    taxes: number;
    total_price: number;
    accommodation_included: boolean;
    accommodation_type?: string;
    accommodation_name?: string;
    special_requests?: string;
    property_snapshot: BookingSnapshot;
    booking_source: string;
    referral_code?: string;
    booking_deadline: string;
    status: "pending" | "confirmed" | "completed" | "cancelled" | "refunded";
    payment_status: "pending" | "authorized" | "paid" | "failed" | "cancelled" | "refunded" | "partially_refunded";
    booking_notes?: string;
    cancellation_reason?: string;
    confirmed_at?: string;
    cancelled_at?: string;
    completed_at?: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface Payment {
    id: number;
    booking_id: number;
    stripe_payment_intent_id: string;
    stripe_charge_id?: string;
    amount: number;
    currency: string;
    status: "pending" | "authorized" | "paid" | "failed" | "cancelled" | "refunded" | "partially_refunded";
    payment_method: string;
    payment_method_type?: string;
    payment_method_brand?: string;
    payment_method_last4?: string;
    transaction_id?: string;
    refund_amount?: number;
    refund_reason?: string;
    failure_reason?: string;
    completed_at?: string;
    created_at: string;
    updated_at: string;
  }