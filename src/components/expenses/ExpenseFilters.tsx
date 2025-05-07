
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterOptions, TimeFilter } from "@/types";

interface ExpenseFiltersProps {
  filterOptions: FilterOptions;
  onFilterChange: (filters: Partial<FilterOptions>) => void;
}

export default function ExpenseFilters({
  filterOptions,
  onFilterChange,
}: ExpenseFiltersProps) {
  const handleTimeFilterChange = (value: TimeFilter) => {
    onFilterChange({ timeFilter: value });
  };

  return (
    <Card>
      <CardContent className="p-4 flex flex-row items-center justify-between flex-wrap gap-4">
        <div className="flex flex-row items-center gap-4">
          <div className="grid gap-2">
            <Label htmlFor="time-filter" className="text-xs font-medium">Time Period</Label>
            <Select
              value={filterOptions.timeFilter}
              onValueChange={(value) => handleTimeFilterChange(value as TimeFilter)}
            >
              <SelectTrigger className="w-[180px]" id="time-filter">
                <SelectValue placeholder="Select time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current-month">Current Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
