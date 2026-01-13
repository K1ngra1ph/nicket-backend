import { EventData, PaymentData, UserData } from '../types';

export const mockEvents: EventData[] = [
  {
    _id: 'evt1',
    name: 'Sample Event',
    location: 'New York',
    date: '2024-01-01',
    active: true,
    eventId: 'EVT-001',
    currency: 'USD',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

export const mockPayments: PaymentData[] = [
  {
    _id: 'pay1',
    paymentReference: 'PAY-123',
    transactionReference: 'TXN-999',
    amount: 100,
    amountPaid: 100,
    eventValue: 'EVT-001',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '1234567890',
    userId: 'user1',
    selectedNumbers: [1, 2, 3],
    status: 'successful',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

export const mockUsers: UserData[] = [
  {
    _id: 'user1',
    name: 'Admin',
    email: 'pauloanmove@gmail.com',
    role: 'admin',
    permissions: ['dashboard', 'events', 'payments', 'users', 'settings']
  }
];
