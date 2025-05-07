
import { format, isValid, parseISO } from "date-fns";

export const formatDate = (date: Date | string | null | undefined, formatStr: string = "MMM d, yyyy"): string => {
  if (!date) return "N/A";
  
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return isValid(dateObj) ? format(dateObj, formatStr) : "Invalid date";
  } catch (error) {
    console.error("Date formatting error:", error);
    return "Invalid date";
  }
};

export const getCurrentMonthName = (): string => {
  return format(new Date(), "MMMM yyyy");
};

export const getLastMonthName = (): string => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return format(date, "MMMM yyyy");
};

export const getCurrentYear = (): string => {
  return format(new Date(), "yyyy");
};

export const getMonthYearFromDate = (date: Date | string): string => {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return format(dateObj, "MMMM yyyy");
};
