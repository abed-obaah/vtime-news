import { useState } from 'react';
import { Tabs } from 'expo-router';
import { Pressable, Text, View, Modal, SafeAreaView, StyleSheet, Switch } from 'react-native';
import { MaterialCommunityIcons, Entypo, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

const MORE_ITEMS = [
  { label: 'Search', icon: 'search-outline', route: '/search' },
  { label: 'Categories', icon: 'grid-outline', route: '/categories' },
  { label: 'Bookmarks', icon: 'bookmark-outline', route: '/bookmarks' },
  { label: 'Subscribe', icon: 'mail-open-outline', route: '/subscribe' },
  { label: 'Sign In', icon: 'person-outline', route: '/login' },
  { label: 'Contact Us', icon: 'chatbubble-ellipses-outline', route: '/contact' },
  { label: 'Privacy Policy', icon: 'shield-checkmark-outline', route: '/privacy' },
  { label: 'Terms of Service', icon: 'document-text-outline', route: '/tos' },
  { label: 'Cookie Policy', icon: 'information-circle-outline', route: '/cookies' },
];

function MoreButton({ color }: { color: string }) {
  const [visible, setVisible] = useState(false);
  const { colors, isDark, toggleTheme } = useTheme();

  return (
    <>
      <Pressable onPress={() => setVisible(true)} style={{ alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name="dots-horizontal-circle-outline" size={24} color={color} />
      </Pressable>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.bgCard }]}>
          <SafeAreaView>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>More</Text>

            {/* Dark mode toggle */}
            <View style={[styles.sheetItem, { borderBottomColor: colors.borderLight }]}>
              <Ionicons name={isDark ? 'moon' : 'sunny-outline'} size={22} color={colors.icon} />
              <Text style={[styles.sheetItemText, { color: colors.text }]}>Dark Mode</Text>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: '#DC2626' }}
                thumbColor="#fff"
                style={{ marginLeft: 'auto' }}
              />
            </View>

            {MORE_ITEMS.map((item) => (
              <Pressable
                key={item.label}
                style={[styles.sheetItem, { borderBottomColor: colors.borderLight }]}
                onPress={() => { setVisible(false); router.push(item.route as any); }}
              >
                <Ionicons name={item.icon as any} size={22} color={colors.icon} />
                <Text style={[styles.sheetItemText, { color: colors.text }]}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.border} style={{ marginLeft: 'auto' }} />
              </Pressable>
            ))}
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: '#DC2626',
      tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.border },
      tabBarInactiveTintColor: colors.icon,
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => <Entypo name="news" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="newsPlus"
        options={{
          title: 'News+',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="cards" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sports"
        options={{
          title: 'Forex',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="chart-line" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="audio"
        options={{
          title: 'Live',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="broadcast" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="following"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <MoreButton color={color} />,
          tabBarButton: (props) => (
            <Pressable
              {...(props as any)}
              onPress={undefined}
              style={props.style}
            >
              {props.children}
            </Pressable>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 15,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  sheetItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
