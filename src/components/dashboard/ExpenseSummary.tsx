
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseRecord } from "@/types";

interface ExpenseSummaryProps {
  expenses: ExpenseRecord[];
  title: string;
  totalAmount?: number;
  categoryData?: any[];
}

export default function ExpenseSummary({ expenses, title, totalAmount, categoryData }: ExpenseSummaryProps) {
  // Calculate totals if not provided directly
  const calculatedTotal = totalAmount !== undefined ? totalAmount : expenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  const avgAmount = expenses.length > 0 ? calculatedTotal / expenses.length : 0;
  
  const maxExpense = expenses.length > 0
    ? expenses.reduce((max, expense) => expense.amount > max.amount ? expense : max, expenses[0])
    : null;
    
  const categoryCounts = Array.isArray(expenses)
  ? expenses.reduce<Record<string, number>>((acc, expense) => {
      const { categoryId } = expense;
      acc[categoryId] = (acc[categoryId] || 0) + 1;
      return acc;
    }, {})
  : {};

  const topCategory = Object.entries(categoryCounts).length > 0
    ? Object.entries(categoryCounts).reduce(
        (max, [categoryId, count]) => 
          count > max[1] ? [categoryId, count] : max,
        ["", 0]
      )
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Expenses</span>
            <span className="text-2xl font-bold">${calculatedTotal.toFixed(2)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Average Amount</span>
            <span className="text-lg font-semibold">${avgAmount.toFixed(2)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Number of Expenses</span>
            <span className="text-lg font-semibold">{expenses.length}</span>
          </div>
          
          {maxExpense && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Highest Expense</span>
              <span className="text-lg font-semibold">${maxExpense.amount.toFixed(2)}</span>
            </div>
          )}
          
          {topCategory && topCategory[0] && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Most Common Category</span>
              <span className="text-lg font-semibold">
                {expenses.find(e => e.categoryId === topCategory[0])?.category?.name || 'Unknown'}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
