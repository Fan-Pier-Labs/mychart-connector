import { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getInstances,
  hostnameFromInstance,
  searchInstances,
  type MyChartInstance,
} from "@/lib/mychart-instances";
import { styles } from "../styles";

type Props = {
  onPick: (instance: MyChartInstance) => void;
  onManualEntry: () => void;
};

export function PickerStep({ onPick, onManualEntry }: Props) {
  const [query, setQuery] = useState("");

  const filteredInstances = useMemo(
    () => searchInstances(query, getInstances()),
    [query],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.pickerHeader}>
        <Text style={styles.pickerTitle}>Find your provider</Text>
        <Text style={styles.pickerSubtitle}>
          {filteredInstances.length} of {getInstances().length} MyChart sites
        </Text>
      </View>
      <View style={styles.pickerSearchWrap}>
        <TextInput
          testID="picker-search"
          style={styles.pickerSearch}
          placeholder="Search by hospital, system, or city"
          placeholderTextColor="#999"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>
      <FlatList
        data={filteredInstances}
        keyExtractor={(item, index) => `${item.url || ""}|${item.name}|${index}`}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={20}
        windowSize={8}
        contentContainerStyle={styles.pickerListContent}
        ListEmptyComponent={
          <View style={styles.pickerEmpty}>
            <Text style={styles.pickerEmptyText}>
              No MyChart sites match "{query}".
            </Text>
            <Pressable style={styles.secondaryButton} onPress={onManualEntry}>
              <Text style={styles.secondaryButtonText}>Enter hostname manually</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`picker-item-${item.name}`}
            style={({ pressed }) => [
              styles.pickerRow,
              pressed && styles.pickerRowPressed,
            ]}
            onPress={() => onPick(item)}
          >
            {item.logoUrl ? (
              <Image
                source={{ uri: item.logoUrl }}
                style={styles.pickerLogo}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.pickerLogo, styles.pickerLogoFallback]} />
            )}
            <View style={styles.pickerRowText}>
              <Text style={styles.pickerRowName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.url ? (
                <Text style={styles.pickerRowHost} numberOfLines={1}>
                  {hostnameFromInstance(item)}
                </Text>
              ) : null}
            </View>
            <Text style={styles.pickerChevron}>›</Text>
          </Pressable>
        )}
      />
      <View style={styles.pickerFooter}>
        <Pressable
          testID="picker-manual"
          style={styles.secondaryButton}
          onPress={onManualEntry}
        >
          <Text style={styles.secondaryButtonText}>
            Don't see yours? Enter hostname manually
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
