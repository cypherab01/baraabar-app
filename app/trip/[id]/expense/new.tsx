import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { ExpenseForm } from "@/components/ExpenseForm";
import { Screen } from "@/components/Screen";
import { useTrip } from "@/hooks/useTrips";

export default function NewExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const trip = useTrip(id);

  useEffect(() => {
    if (!trip) {
      const t = setTimeout(() => router.back(), 0);
      return () => clearTimeout(t);
    }
  }, [trip, router]);

  if (!trip) {
    return (
      <Screen>
        <AppHeader title="New expense" showBack />
        <EmptyState emoji="🔍" title="Trip not found" />
      </Screen>
    );
  }

  return <ExpenseForm trip={trip} />;
}
