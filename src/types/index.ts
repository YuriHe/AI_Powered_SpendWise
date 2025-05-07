
export interface User {
  id: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface ExpenseRecord {
  id: string;
  userId: string;
  title: string;
  amount: number;
  date: Date;
  categoryId: string;
  category?: Category;
  notes?: string;
  receiptUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TimeFilter = 'current-month' | 'last-month' | 'this-year' | 'custom';

export interface FilterOptions {
  timeFilter: TimeFilter;
  startDate?: Date;
  endDate?: Date;
  categories?: string[];
  minAmount?: number;
  maxAmount?: number;
  searchQuery?: string;
}
