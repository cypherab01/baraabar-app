import { useLocalSearchParams } from "expo-router";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { ExpenseForm } from "@/components/ExpenseForm";
import { Screen } from "@/components/Screen";
import { useExpense, useTrip } from "@/hooks/useTrips";

export default function EditExpenseScreen() {
  const { id, expenseId } = useLocalSearchParams<{
    id: string;
    expenseId: string;
  }>();
  const trip = useTrip(id);
  const expense = useExpense(id, expenseId);

  if (!trip) {
    return (
      <Screen>
        <AppHeader title="Edit expense" showBack />
        <EmptyState emoji="🔍" title="Trip not found" />
      </Screen>
    );
  }
  if (!expense) {
    return (
      <Screen>
        <AppHeader title="Edit expense" showBack />
        <EmptyState emoji="🔍" title="Expense not found" />
      </Screen>
    );
  }

  return <ExpenseForm trip={trip} existing={expense} />;
}
