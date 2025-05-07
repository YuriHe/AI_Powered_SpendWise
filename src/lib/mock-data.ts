import { Category, ExpenseRecord } from '@/types';

// Keep only categories for fallback
export const MOCK_CATEGORIES: Category[] = [
  { id: '1', name: 'Food & Dining', color: '#8B5CF6' },
  { id: '2', name: 'Transportation', color: '#0EA5E9' },
  { id: '3', name: 'Housing', color: '#10B981' },
  { id: '4', name: 'Entertainment', color: '#F59E0B' },
  { id: '5', name: 'Shopping', color: '#EC4899' },
  { id: '6', name: 'Healthcare', color: '#EF4444' },
  { id: '7', name: 'Education', color: '#6366F1' },
  { id: '8', name: 'Personal Care', color: '#14B8A6' },
  { id: '9', name: 'Travel', color: '#F97316' },
  { id: '10', name: 'Utilities', color: '#0891B2' },
  { id: '11', name: 'Gifts & Donations', color: '#9333EA' },
  { id: '12', name: 'Other', color: '#71717A' },
];

// Empty expense records array - we'll use real data from API
export const MOCK_EXPENSES: ExpenseRecord[] = [];

// Empty functions as fallbacks
export const getCurrentMonthExpenses = (): ExpenseRecord[] => [];
export const getLastMonthExpenses = (): ExpenseRecord[] => [];
export const getYearExpenses = (): ExpenseRecord[] => [];
