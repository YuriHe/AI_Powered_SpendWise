
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ExpenseTable from "@/components/expenses/ExpenseTable";
import ExpenseFilters from "@/components/expenses/ExpenseFilters";
import ExpenseForm from "@/components/expenses/ExpenseForm";
import { ExpenseDialog } from "@/components/expenses/ExpenseDialog";
import AppLayout from "@/components/layout/AppLayout";
import { Category, ExpenseRecord, FilterOptions } from "@/types";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

// Function to get authorization header
const getAuthHeader = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function Expenses() {
  const queryClient = useQueryClient();
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRecord | null>(null);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    timeFilter: "current-month",
  });

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

  // Fetch expenses based on filters
  const { 
    data: expensesData,
    isLoading: expensesLoading, 
    isError: expensesError 
  } = useQuery({
    queryKey: ['expenses', filterOptions],
    queryFn: async () => {
      let url = `${API_URL}/expenses?timeFilter=${filterOptions.timeFilter}`;
      
      if (filterOptions.categories?.length) {
        filterOptions.categories.forEach(cat => {
          url += `&categories=${encodeURIComponent(cat)}`;
        });
      }
      
      if (filterOptions.searchQuery) {
        url += `&searchQuery=${encodeURIComponent(filterOptions.searchQuery)}`;
      }
      
      if (filterOptions.minAmount) {
        url += `&minAmount=${filterOptions.minAmount}`;
      }
      
      if (filterOptions.maxAmount) {
        url += `&maxAmount=${filterOptions.maxAmount}`;
      }
      
      const response = await fetch(url, {
        headers: getAuthHeader()
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch expenses');
      }
      
      const data = await response.json();
      
      // Convert API response to ExpenseRecord format
      return {
        expenses: data.expenses.map((exp: any) => ({
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
        })),
        pagination: data.pagination
      };
    },
    enabled: !!localStorage.getItem('auth_token')
  });

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (formData: any) => {
      const response = await fetch(`${API_URL}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create expense');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success("Expense added successfully");
      setIsExpenseFormOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add expense");
    }
  });

  // Update expense mutation
  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const response = await fetch(`${API_URL}/expenses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update expense');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success("Expense updated successfully");
      setIsExpenseFormOpen(false);
      setIsEditMode(false);
      setSelectedExpense(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update expense");
    }
  });

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_URL}/expenses/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete expense');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success("Expense deleted successfully");
      setIsExpenseDialogOpen(false);
      setSelectedExpense(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete expense");
    }
  });

  // Handle creating or updating an expense
  const handleSubmitExpense = async (formData: any, receiptFile: File | null) => {
    setIsLoading(true);
    
    try {
      // TODO: Handle receipt file upload if needed
      
      if (isEditMode && selectedExpense) {
        // Update existing expense
        await updateExpenseMutation.mutateAsync({ 
          id: selectedExpense.id, 
          data: formData 
        });
      } else {
        // Create new expense
        await createExpenseMutation.mutateAsync(formData);
      }
    } catch (error) {
      console.error("Error saving expense:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle opening the expense form for editing
  const handleEditExpense = (expense: ExpenseRecord) => {
    setSelectedExpense(expense);
    setIsEditMode(true);
    setIsExpenseFormOpen(true);
  };

  // Handle expense deletion
  const handleDeleteExpense = async (id: string) => {
    await deleteExpenseMutation.mutateAsync(id);
  };

  // Handle opening the expense details dialog
  const handleViewExpenseDetails = (expense: ExpenseRecord) => {
    setSelectedExpense(expense);
    setIsExpenseDialogOpen(true);
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    setFilterOptions(prev => ({
      ...prev,
      ...newFilters
    }));
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-2xl font-bold">Expenses</h2>
          <Button 
            onClick={() => {
              setIsEditMode(false);
              setSelectedExpense(null);
              setIsExpenseFormOpen(true);
            }}
          >
            Add Expense
          </Button>
        </div>
        
        <ExpenseFilters 
          filterOptions={filterOptions}
          onFilterChange={handleFilterChange}
        />
        
        {expensesLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : expensesError ? (
          <div className="text-center py-10 text-red-500">
            Failed to load expenses. Please try again.
          </div>
        ) : (
          <ExpenseTable 
            expenses={expensesData?.expenses || []}
            categories={categories}
            filterOptions={filterOptions}
            onViewDetails={handleViewExpenseDetails}
            onEditExpense={handleEditExpense}
          />
        )}
      </div>

      {/* Expense form sheet */}
      <Sheet open={isExpenseFormOpen} onOpenChange={setIsExpenseFormOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isEditMode ? "Edit Expense" : "Add Expense"}</SheetTitle>
            <SheetDescription>
              {isEditMode 
                ? "Update the details of your expense record." 
                : "Fill out the form to create a new expense record."}
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6">
            <ExpenseForm 
              onSubmit={handleSubmitExpense}
              categories={categories}
              initialData={isEditMode ? selectedExpense : undefined}
              isLoading={isLoading || createExpenseMutation.isPending || updateExpenseMutation.isPending}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Expense details dialog */}
      <ExpenseDialog 
        expense={selectedExpense}
        isOpen={isExpenseDialogOpen}
        onClose={() => setIsExpenseDialogOpen(false)}
        onEdit={handleEditExpense}
        onDelete={handleDeleteExpense}
      />
    </AppLayout>
  );
}
