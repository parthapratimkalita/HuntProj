import { Property } from "./property";

export interface Wishlist {
  id: number;
  user_id: number;
  property_id: number;
  created_at: string;
  property?: Property;
}