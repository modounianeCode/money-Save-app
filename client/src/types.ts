export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  isIncome: boolean;
  ownerId?: string | null;
}

export interface Transaction {
  id: string;
  userId: string;
  categoryId: string;
  type: "EXPENSE" | "INCOME";
  amount: number;
  description?: string | null;
  date: string;
  category: Category;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  month: string;
  category: Category;
}

export interface MonthSummary {
  month: string;
  totalExpenses: number;
  totalIncome: number;
  balance: number;
}

export interface CategorySpending {
  name: string;
  icon: string;
  color: string;
  total: number;
}

export interface MonthlyPoint {
  month: string;
  expenses: number;
  income: number;
  balance: number;
}

export interface BudgetAlert {
  budgetId: string;
  category: { id: string; name: string; icon: string; color: string };
  budgetAmount: number;
  spent: number;
  percentage: number;
  status: "exceeded" | "warning";
}