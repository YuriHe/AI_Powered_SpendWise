
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExpenseRecord } from "@/types";
import { formatDate } from "@/lib/date-utils";

interface ExpenseDialogProps {
  expense: ExpenseRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (expense: ExpenseRecord) => void;
  onDelete: (id: string) => void;
}

export function ExpenseDialog({
  expense,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: ExpenseDialogProps) {
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);
  
  if (!expense) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">{expense.title}</DialogTitle>
          <DialogDescription>{formatDate(expense.date)}</DialogDescription>
        </DialogHeader>

        {isDeleteConfirm ? (
          <div className="space-y-4">
            <p className="font-bold text-destructive">Are you sure you want to delete this expense?</p>
            <p>This action cannot be undone.</p>
            <DialogFooter className="flex flex-row justify-end gap-2 sm:space-x-0">
              <Button 
                variant="outline" 
                onClick={() => setIsDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  onDelete(expense.id);
                  onClose();
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="text-lg font-semibold">${expense.amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: expense.category?.color || '#888' }}
                    />
                    <p className="font-medium">{expense.category?.name || 'Unknown'}</p>
                  </div>
                </div>
              </div>
              
              {expense.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="mt-1">{expense.notes}</p>
                </div>
              )}
              
              {expense.receiptUrl && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Receipt</p>
                  <img 
                    src={expense.receiptUrl} 
                    alt="Receipt" 
                    className="max-h-48 rounded-md border"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-row justify-between sm:space-x-0">
              <Button 
                variant="destructive" 
                onClick={() => setIsDeleteConfirm(true)}
              >
                Delete
              </Button>
              <Button 
                variant="default" 
                onClick={() => {
                  onEdit(expense);
                  onClose();
                }}
              >
                Edit
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
