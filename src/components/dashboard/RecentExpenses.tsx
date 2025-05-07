
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseRecord } from "@/types";
import { formatDate } from "@/lib/date-utils";
import { useNavigate } from "react-router-dom";

interface RecentExpensesProps {
  expenses: ExpenseRecord[];
}

export default function RecentExpenses({ expenses }: RecentExpensesProps) {
  const navigate = useNavigate();
  
  // Take only the 5 most recent expenses
  const recentExpenses = expenses.slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Expenses</CardTitle>
        <button 
          className="text-sm text-primary hover:underline"
          onClick={() => navigate('/expenses')}
        >
          View All
        </button>
      </CardHeader>
      <CardContent>
        {recentExpenses.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No recent expenses</p>
        ) : (
          <div className="space-y-4">
            {recentExpenses.map((expense) => (
              <div 
                key={expense.id} 
                className="flex items-center justify-between py-2 border-b last:border-b-0"
              >
                <div className="flex items-start gap-3">
                  <div 
                    className="w-3 h-3 rounded-full mt-1.5"
                    style={{ backgroundColor: expense.category?.color || '#888' }}  
                  />
                  <div>
                    <p className="font-medium">{expense.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(expense.date)} • {expense.category?.name}
                    </p>
                  </div>
                </div>
                <span className="font-semibold">${expense.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
