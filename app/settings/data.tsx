import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { IconButton } from "@/components/IconButton";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { TextField } from "@/components/TextField";
import {
  BackupCancelledError,
  exportToFile,
  importMerge,
  importReplace,
  pickAndReadBackup,
  type BackupV1,
  type MergeResult,
} from "@/lib/backup";
import { useTheme } from "@/theme";

export default function DataScreen() {
  const theme = useTheme();
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const [pending, setPending] = useState<BackupV1 | null>(null);
  const [replaceConfirm, setReplaceConfirm] = useState(false);
  const [replaceTyped, setReplaceTyped] = useState("");

  const handleExport = async () => {
    setBusy("export");
    try {
      await exportToFile();
    } catch (err: unknown) {
      Alert.alert(
        "Couldn't export",
        err instanceof Error ? err.message : "Unknown error",
      );
    } finally {
      setBusy(null);
    }
  };

  const handleImport = async () => {
    setBusy("import");
    try {
      const backup = await pickAndReadBackup();
      setPending(backup);
    } catch (err: unknown) {
      if (err instanceof BackupCancelledError) {
        // silent
      } else {
        Alert.alert(
          "Couldn't import",
          err instanceof Error ? err.message : "Unknown error",
        );
      }
    } finally {
      setBusy(null);
    }
  };

  const doMerge = async () => {
    if (!pending) return;
    setBusy("import");
    try {
      const result = await importMerge(pending);
      setPending(null);
      announce(result, "Merged");
    } catch (err: unknown) {
      Alert.alert(
        "Import failed",
        err instanceof Error ? err.message : "Unknown error",
      );
    } finally {
      setBusy(null);
    }
  };

  const doReplace = async () => {
    if (!pending) return;
    setBusy("import");
    try {
      const result = await importReplace(pending);
      setPending(null);
      setReplaceConfirm(false);
      setReplaceTyped("");
      announce(result, "Replaced with");
    } catch (err: unknown) {
      Alert.alert(
        "Import failed",
        err instanceof Error ? err.message : "Unknown error",
      );
    } finally {
      setBusy(null);
    }
  };

  const closeSheet = () => {
    setPending(null);
    setReplaceConfirm(false);
    setReplaceTyped("");
  };

  return (
    <Screen>
      <AppHeader
        title="Import / Export"
        subtitle="Back up all data to a file"
        showBack
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: theme.spacing.lg }}
      >
        <Card padded>
          <Text variant="subheading">Back up to file</Text>
          <Text variant="caption" tone="muted" style={{ marginTop: 4 }}>
            Saves every trip, expense, person, and category as a JSON file you
            can email or move to another phone.
          </Text>
          <View style={{ marginTop: theme.spacing.md }}>
            <Button
              label={busy === "export" ? "Preparing…" : "Export"}
              onPress={handleExport}
              disabled={busy !== null}
            />
          </View>
        </Card>

        <Card padded>
          <Text variant="subheading">Restore from file</Text>
          <Text variant="caption" tone="muted" style={{ marginTop: 4 }}>
            Pick a previously-exported Baraabar backup. Choose Merge to add to
            what&apos;s here, or Replace to wipe and load the backup.
          </Text>
          <View style={{ marginTop: theme.spacing.md }}>
            <Button
              label={busy === "import" ? "Loading…" : "Import"}
              onPress={handleImport}
              disabled={busy !== null}
            />
          </View>
        </Card>
      </ScrollView>

      <ModalSheet visible={!!pending} onClose={closeSheet}>
        {pending ? (
          <>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text variant="heading">Import backup</Text>
              <IconButton
                variant="soft"
                size={36}
                onPress={closeSheet}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={18} color={theme.colors.text} />
              </IconButton>
            </View>
            <Text variant="caption" tone="muted">
              Backup created{" "}
              {new Date(pending.exportedAt).toLocaleDateString()} ·{" "}
              {pending.trips.length} trips · {pending.persons.length} people ·{" "}
              {pending.categories.length} categories.
            </Text>
            {!replaceConfirm ? (
              <View style={{ gap: theme.spacing.sm }}>
                <Button label="Merge" block onPress={doMerge} />
                <Button
                  variant="secondary"
                  label="Replace everything"
                  block
                  onPress={() => setReplaceConfirm(true)}
                />
              </View>
            ) : (
              <View style={{ gap: theme.spacing.sm }}>
                <Text variant="body" tone="negative">
                  Type REPLACE to wipe everything on this device and load the
                  backup.
                </Text>
                <TextField
                  value={replaceTyped}
                  onChangeText={setReplaceTyped}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                <Button
                  label="Replace"
                  block
                  onPress={doReplace}
                  disabled={replaceTyped.trim() !== "REPLACE"}
                />
                <Button
                  variant="secondary"
                  label="Cancel"
                  block
                  onPress={() => {
                    setReplaceConfirm(false);
                    setReplaceTyped("");
                  }}
                />
              </View>
            )}
          </>
        ) : null}
      </ModalSheet>
    </Screen>
  );
}

function announce(result: MergeResult, verb: string) {
  Alert.alert(
    "Import complete",
    `${verb} ${result.trips} trip${result.trips === 1 ? "" : "s"} and ${result.persons} ${result.persons === 1 ? "person" : "people"}.`,
  );
}

function ModalSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: theme.colors.overlay,
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: theme.colors.bgElevated,
            padding: theme.spacing.xl,
            gap: theme.spacing.md,
            borderTopLeftRadius: theme.radii.xl,
            borderTopRightRadius: theme.radii.xl,
          }}
        >
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
