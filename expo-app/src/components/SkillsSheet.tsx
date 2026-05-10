import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SKILLS } from "@/lib/skills/catalog";
import type { Skill } from "@/lib/skills/types";

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (skill: Skill) => void;
};

export function SkillsSheet({ visible, onClose, onPick }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <SafeAreaView edges={["bottom"]}>
            <View style={styles.handle} />
            <Text style={styles.title}>Run a skill</Text>
            <Text style={styles.subtitle}>
              Pre-built playbooks the assistant can run end-to-end.
            </Text>
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {SKILLS.map((skill) => (
                <Pressable
                  key={skill.id}
                  testID={`skill-${skill.id}`}
                  accessibilityLabel={skill.title}
                  accessibilityHint={skill.description}
                  accessibilityRole="button"
                  style={styles.row}
                  onPress={() => {
                    onPick(skill);
                    onClose();
                  }}
                >
                  <View style={styles.iconBox}>
                    <Text style={styles.icon}>{skill.icon}</Text>
                  </View>
                  <View style={styles.text}>
                    <Text style={styles.rowTitle}>{skill.title}</Text>
                    <Text style={styles.rowDesc}>{skill.description}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              testID="skills-sheet-cancel"
              accessibilityLabel="Cancel skills sheet"
              accessibilityRole="button"
              style={styles.cancel}
              onPress={onClose}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: "80%",
  },
  handle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d0d0d0",
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#000" },
  subtitle: { fontSize: 13, color: "#666", marginTop: 4, marginBottom: 14 },
  list: { maxHeight: 480 },
  listContent: { paddingBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  icon: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  text: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
  rowDesc: { fontSize: 13, color: "#666", marginTop: 2, lineHeight: 18 },
  cancel: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: { fontSize: 15, color: "#007AFF", fontWeight: "500" },
});
