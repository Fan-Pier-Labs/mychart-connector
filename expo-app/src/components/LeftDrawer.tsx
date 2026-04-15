import { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  FlatList,
  TextInput,
  Alert,
  PanResponder,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { getChats, deleteChat, searchChats, type Chat } from "@/lib/storage/database";

const DRAWER_WIDTH = Math.min(320, Dimensions.get("window").width * 0.82);
const INITIAL_VISIBLE = 8;
const OPEN_THRESHOLD = DRAWER_WIDTH * 0.35;
const OPEN_EDGE_WIDTH = 24;

type Props = {
  visible: boolean;
  onOpen: () => void;
  onClose: () => void;
  currentChatId?: string | null;
  onNewChat?: () => void;
};

export function LeftDrawer({ visible, onOpen, onClose, currentChatId, onNewChat }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const loadChats = useCallback(async () => {
    const result = searchQuery ? await searchChats(searchQuery) : await getChats();
    setChats(result);
  }, [searchQuery]);

  useEffect(() => {
    if (visible) loadChats();
  }, [visible, loadChats]);

  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [loadChats])
  );

  const animateTo = useCallback(
    (toValue: number, cb?: () => void) => {
      Animated.spring(translateX, {
        toValue,
        useNativeDriver: true,
        bounciness: 0,
        speed: 18,
      }).start(() => cb?.());
    },
    [translateX]
  );

  useEffect(() => {
    animateTo(visible ? 0 : -DRAWER_WIDTH);
  }, [visible, animateTo]);

  // Pan on the drawer itself: drag left to close.
  const drawerPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_e, g) => {
        const clamped = Math.max(-DRAWER_WIDTH, Math.min(0, g.dx));
        translateX.setValue(clamped);
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dx < -OPEN_THRESHOLD || g.vx < -0.5) {
          animateTo(-DRAWER_WIDTH, () => onClose());
        } else {
          animateTo(0);
        }
      },
      onPanResponderTerminate: () => animateTo(0),
    }),
  ).current;

  // Edge pan: swipe from the left edge of the screen to open.
  const edgePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (e) => e.nativeEvent.pageX < OPEN_EDGE_WIDTH,
      onMoveShouldSetPanResponder: (e, g) =>
        e.nativeEvent.pageX < OPEN_EDGE_WIDTH && g.dx > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_e, g) => {
        const next = Math.max(-DRAWER_WIDTH, Math.min(0, -DRAWER_WIDTH + g.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dx > OPEN_THRESHOLD || g.vx > 0.5) {
          animateTo(0, () => onOpen());
        } else {
          animateTo(-DRAWER_WIDTH, () => onClose());
        }
      },
      onPanResponderTerminate: () => animateTo(-DRAWER_WIDTH),
    }),
  ).current;

  function handleSelect(chatId: string) {
    onClose();
    router.push(`/(auth)/chat/${chatId}`);
  }

  function handleNew() {
    onClose();
    if (onNewChat) onNewChat();
    else router.push("/(auth)");
  }

  function handleSettings() {
    onClose();
    router.push("/(auth)/settings");
  }

  function handleDelete(chat: Chat) {
    Alert.alert("Delete Chat", `Delete "${chat.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteChat(chat.id);
          await loadChats();
        },
      },
    ]);
  }

  const visibleChats = showAll || searchQuery ? chats : chats.slice(0, INITIAL_VISIBLE);
  const hiddenCount = chats.length - visibleChats.length;

  const backdropOpacity = translateX.interpolate({
    inputRange: [-DRAWER_WIDTH, 0],
    outputRange: [0, 0.45],
    extrapolate: "clamp",
  });
  const backdropPointerEvents = visible ? "auto" : "none";

  return (
    <>
      {/* Edge-swipe capture — thin invisible strip on the left side. Always mounted. */}
      <View
        pointerEvents="box-none"
        style={styles.edgeCapture}
        {...edgePan.panHandlers}
      />

      {/* Backdrop — darkens the screen behind the drawer. Tappable to close. */}
      <Animated.View
        pointerEvents={backdropPointerEvents}
        style={[styles.backdrop, { opacity: backdropOpacity }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Drawer itself. Mounted always so gestures can drag it in/out smoothly. */}
      <Animated.View
        style={[styles.drawer, { transform: [{ translateX }] }]}
        {...drawerPan.panHandlers}
      >
        <View
          style={[
            styles.drawerInner,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
        >
          <View style={styles.topSection}>
            <Pressable testID="drawer-new-chat" style={styles.newChatRow} onPress={handleNew}>
              <Text style={styles.newChatIcon}>+</Text>
              <Text style={styles.newChatText}>New Chat</Text>
            </Pressable>

            <TextInput
              style={styles.search}
              placeholder="Search"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>

          <FlatList
            data={visibleChats}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {searchQuery ? "No matches" : "No chats yet"}
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.chatRow,
                  item.id === currentChatId && styles.chatRowActive,
                ]}
                onPress={() => handleSelect(item.id)}
                onLongPress={() => handleDelete(item)}
              >
                <Text style={styles.chatTitle} numberOfLines={1}>
                  {item.title}
                </Text>
              </Pressable>
            )}
            ListFooterComponent={
              hiddenCount > 0 && !searchQuery ? (
                <Pressable style={styles.seeMore} onPress={() => setShowAll(true)}>
                  <Text style={styles.seeMoreText}>See more ({hiddenCount})</Text>
                </Pressable>
              ) : null
            }
          />

          <Pressable testID="drawer-settings" style={styles.settingsRow} onPress={handleSettings}>
            <Text style={styles.settingsIcon}>⚙</Text>
            <Text style={styles.settingsText}>Settings</Text>
          </Pressable>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  edgeCapture: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: OPEN_EDGE_WIDTH,
    zIndex: 10,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    zIndex: 20,
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: "#fff",
    borderRightWidth: 1,
    borderRightColor: "#eee",
    zIndex: 30,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 16,
  },
  drawerInner: { flex: 1 },
  topSection: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  newChatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#f5f5f7",
    marginBottom: 10,
  },
  newChatIcon: {
    fontSize: 18,
    color: "#000",
    width: 24,
    fontWeight: "600",
  },
  newChatText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },
  search: {
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    marginBottom: 4,
  },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 8, paddingVertical: 4 },
  empty: {
    textAlign: "center",
    color: "#999",
    marginTop: 32,
    fontSize: 14,
  },
  chatRow: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    marginVertical: 1,
  },
  chatRowActive: {
    backgroundColor: "#f0f0f0",
  },
  chatTitle: {
    fontSize: 14,
    color: "#1a1a1a",
  },
  seeMore: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  seeMoreText: {
    fontSize: 13,
    color: "#007AFF",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  settingsIcon: {
    fontSize: 18,
    width: 24,
    color: "#444",
  },
  settingsText: {
    fontSize: 15,
    color: "#1a1a1a",
    fontWeight: "500",
  },
});
