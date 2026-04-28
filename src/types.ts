export interface User {
  id: string;
  name: string;
  role: 'admin' | 'waiter';
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  price: number;
}

export interface Table {
  id: string;
  number: string;
  status: 'available' | 'occupied';
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  tableId: string;
  waiterId: string;
  waiterName: string;
  items: OrderItem[];
  total: number;
  discount?: number;
  tip?: number;
  observations?: string;
  status: 'pending' | 'finished';
  isPaid: boolean;
  paymentMethod?: string;
  createdAt: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
}

export interface CashRegister {
  isOpen: boolean;
  openedAt: string | null;
  openedBy: string | null;
  initialValue: number;
  history: {
    openedAt: string;
    openedBy: string;
    closedAt: string;
    initialValue: number;
    totalSales: number;
    ordersCount: number;
  }[];
}
