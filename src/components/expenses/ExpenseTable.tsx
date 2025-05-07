
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Category, ExpenseRecord, FilterOptions } from "@/types";
import { formatDate } from "@/lib/date-utils";

interface ExpenseTableProps {
  expenses: ExpenseRecord[];
  categories: Category[];
  filterOptions: FilterOptions;
  onViewDetails: (expense: ExpenseRecord) => void;
  onEditExpense: (expense: ExpenseRecord) => void;
}

export default function ExpenseTable({
  expenses,
  categories,
  filterOptions,
  onViewDetails,
  onEditExpense,
}: ExpenseTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Calculate pagination values
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = expenses.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(expenses.length / itemsPerPage);

  // Change page
  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Generate page numbers array
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  // Get time period title
  const getTimeFilterTitle = (): string => {
    switch (filterOptions.timeFilter) {
      case "current-month":
        return "Current Month";
      case "last-month":
        return "Last Month";
      case "this-year":
        return "This Year";
      case "custom":
        return "Custom Period";
      default:
        return "All Expenses";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expenses</CardTitle>
        <CardDescription>
          Showing expenses for {getTimeFilterTitle()} ({expenses.length} items)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="border-b [&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-4 text-left align-middle text-muted-foreground font-medium">Date</th>
                  <th className="h-12 px-4 text-left align-middle text-muted-foreground font-medium">Title</th>
                  <th className="h-12 px-4 text-left align-middle text-muted-foreground font-medium">Category</th>
                  <th className="h-12 px-4 text-left align-middle text-muted-foreground font-medium">Amount</th>
                  <th className="h-12 px-4 text-right align-middle text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="h-16 text-center text-muted-foreground">
                      No expenses found
                    </td>
                  </tr>
                ) : (
                  currentItems.map((expense) => (
                    <tr
                      key={expense.id}
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                    >
                      <td className="p-4 align-middle">{formatDate(expense.date)}</td>
                      <td className="p-4 align-middle">{expense.title}</td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: expense.category?.color || "#888888" }}
                          ></div>
                          <span>{expense.category?.name || "Unknown"}</span>
                        </div>
                      </td>
                      <td className="p-4 align-middle font-medium">${expense.amount.toFixed(2)}</td>
                      <td className="p-4 align-middle text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewDetails(expense)}
                          >
                            Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEditExpense(expense)}
                          >
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-end space-x-2 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {pageNumbers.map((number) => (
                <Button
                  key={number}
                  variant={currentPage === number ? "default" : "outline"}
                  size="sm"
                  onClick={() => paginate(number)}
                  className="w-9"
                >
                  {number}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
