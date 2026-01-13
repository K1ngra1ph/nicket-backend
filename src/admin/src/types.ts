export interface EventData {
  _id: string;
  name: string;
  location: string;
  date: string;
  active: boolean;
  image?: string;
  eventId: string;
  price?: number;
  currency: string; 
  createdAt?: string;
  updatedAt?: string;
}

// Mirrors the Payment Mongoose schema
export interface PaymentData {
  _id: string;
  paymentReference: string;
  transactionReference?: string;
  amount: number;
  amountPaid: number;
  eventValue: string;
  name: string;
  email: string;
  phone: string;
  userId?: string;
  selectedNumbers: number[];
  status: 'pending' | 'successful' | 'failed' | 'refunded';
  createdAt: string;
  updatedAt: string;
  refunded?: boolean; 
}

export type ViewState = 'dashboard' | 'events' | 'payments' | 'users' | 'settings';

export interface UserData {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'merchant';
  permissions: ViewState[]; 
}

export interface AuditLogEntry {
  id: string;
  action: string;
  details: string;
  performedBy: string;
  userRole: string;
  timestamp: string;
}