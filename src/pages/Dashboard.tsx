
import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import ExpenseSummary from "@/components/dashboard/ExpenseSummary";
import RecentExpenses from "@/components/dashboard/RecentExpenses";
import ExpenseChart from "@/components/dashboard/ExpenseChart";
import { TimeFilter } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { getCurrentMonthName, getLastMonthName, getCurrentYear } from "@/lib/date-utils";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Function to get authorization header
const getAuthHeader = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function Dashboard() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("current-month");
  const [summaryTitle, setSummaryTitle] = useState(`Summary • ${getCurrentMonthName()}`);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/categories`, {
        headers: getAuthHeader()
      });
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      return data.categories.map((cat: any) => ({
        id: cat.id.toString(),
        name: cat.name,
        color: cat.color
      }));
    }
  });

  // Fetch expense summary
  const {
    data: summaryData,
    isLoading: summaryLoading,
    isError: summaryError
  } = useQuery({
    queryKey: ['expenseSummary', timeFilter],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/expenses/summary?timeFilter=${timeFilter}`, {
        headers: getAuthHeader()
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch expense summary');
      }
      
      const data = await response.json();
      
      // Format recent expenses
      const formattedRecentExpenses = data.recentExpenses.map((exp: any) => ({
        id: exp.id.toString(),
        userId: exp.user_id.toString(),
        title: exp.title,
        amount: parseFloat(exp.amount),
        date: new Date(exp.date),
        categoryId: exp.category_id?.toString(),
        category: exp.category_id ? {
          id: exp.category_id.toString(),
          name: exp.category_name || "Unknown",
          color: exp.category_color || "#AAAAAA"
        } : undefined,
        notes: exp.notes,
        receiptUrl: exp.receipt_url,
        createdAt: new Date(exp.created_at),
        updatedAt: new Date(exp.updated_at)
      }));
      
      return {
        total: data.total,
        byCategory: data.byCategory,
        recentExpenses: formattedRecentExpenses
      };
    },
    enabled: !!localStorage.getItem('auth_token')
  });

  // Fetch all expenses for specific time period
  const {
    data: expensesData,
    isLoading: expensesLoading
  } = useQuery({
    queryKey: ['expenses', { timeFilter }],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/expenses?timeFilter=${timeFilter}`, {
        headers: getAuthHeader()
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch expenses');
      }
      
      const data = await response.json();
      
      return data.expenses.map((exp: any) => ({
        id: exp.id.toString(),
        userId: exp.user_id.toString(),
        title: exp.title,
        amount: parseFloat(exp.amount),
        date: new Date(exp.date),
        categoryId: exp.category_id?.toString(),
        category: exp.category_id ? {
          id: exp.category_id.toString(),
          name: exp.category_name || "Unknown",
          color: exp.category_color || "#AAAAAA"
        } : undefined,
        notes: exp.notes,
        receiptUrl: exp.receipt_url,
        createdAt: new Date(exp.created_at),
        updatedAt: new Date(exp.updated_at)
      }));
    },
    enabled: !!localStorage.getItem('auth_token')
  });

  // Handle time filter change
  const handleTimeFilterChange = (filter: TimeFilter) => {
    setTimeFilter(filter);
    
    switch (filter) {
      case "current-month":
        setSummaryTitle(`Summary • ${getCurrentMonthName()}`);
        break;
      case "last-month":
        setSummaryTitle(`Summary • ${getLastMonthName()}`);
        break;
      case "this-year":
        setSummaryTitle(`Summary • ${getCurrentYear()}`);
        break;
      default:
        setSummaryTitle(`Summary • ${getCurrentMonthName()}`);
    }
  };

  const isLoading = summaryLoading || expensesLoading;
  const isError = summaryError;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold">Dashboard</h2>
          
          <div className="flex items-center gap-2">
            <Button
              variant={timeFilter === "current-month" ? "default" : "outline"}
              size="sm"
              onClick={() => handleTimeFilterChange("current-month")}
            >
              Current Month
            </Button>
            <Button
              variant={timeFilter === "last-month" ? "default" : "outline"}
              size="sm"
              onClick={() => handleTimeFilterChange("last-month")}
            >
              Last Month
            </Button>
            <Button
              variant={timeFilter === "this-year" ? "default" : "outline"}
              size="sm"
              onClick={() => handleTimeFilterChange("this-year")}
            >
              This Year
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : isError ? (
          <div className="text-center py-10 text-red-500">
            Failed to load dashboard data. Please try again.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ExpenseSummary 
                expenses={expensesData || []} 
                title={summaryTitle}
                totalAmount={summaryData?.total || 0}
                categoryData={summaryData?.byCategory || []}
              />
              <ExpenseChart 
                expenses={expensesData || []} 
                categories={categories} 
              />
            </div>

            <div className="mt-6">
              <RecentExpenses expenses={summaryData?.recentExpenses || []} />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
