import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  center: { alignItems: "center" },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
    maxWidth: 320,
  },
  bodyEm: { color: "#000", fontWeight: "600" },
  metaText: {
    fontSize: 13,
    color: "#888",
    marginBottom: 12,
  },
  input: {
    width: "100%",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  codeInput: {
    fontSize: 22,
    letterSpacing: 6,
    textAlign: "center",
  },
  primaryButton: {
    width: "100%",
    backgroundColor: "#000",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: "#007AFF",
    fontSize: 15,
  },
  disabled: { opacity: 0.6 },

  // Picker
  pickerHeader: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  pickerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
  },
  pickerSubtitle: {
    fontSize: 13,
    color: "#888",
    marginTop: 4,
  },
  pickerSearchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pickerSearch: {
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  pickerListContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  pickerRowPressed: {
    backgroundColor: "#f7f7f7",
  },
  pickerLogo: {
    width: 36,
    height: 36,
    marginRight: 12,
    borderRadius: 6,
    backgroundColor: "#fafafa",
  },
  pickerLogoFallback: {
    backgroundColor: "#eee",
  },
  pickerRowText: {
    flex: 1,
    minWidth: 0,
  },
  pickerRowName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1a1a1a",
  },
  pickerRowHost: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  pickerChevron: {
    fontSize: 22,
    color: "#bbb",
    marginLeft: 8,
  },
  pickerFooter: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    alignItems: "center",
  },
  pickerEmpty: {
    paddingVertical: 32,
    alignItems: "center",
  },
  pickerEmptyText: {
    fontSize: 14,
    color: "#888",
    marginBottom: 8,
    textAlign: "center",
  },

  // Selected instance summary on the credentials step
  selectedInstance: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f7f7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  selectedInstanceLogo: {
    width: 36,
    height: 36,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: "#fff",
  },
  selectedInstanceName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  selectedInstanceHost: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  selectedInstanceChange: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
