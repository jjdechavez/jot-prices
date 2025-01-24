export interface Product {
  id: number;
  name: string;
  search_query: string;
  created_at: string;
  current_price?: number;
  lowest_price?: number;
  highest_price?: number;
}

export interface PriceHistory {
  id: number;
  product_id: number;
  price: number;
  created_at: string;
}

export interface PriceData {
  price: string;
  productName: string;
} 