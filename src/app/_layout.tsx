import { router, Stack } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { View, LogBox } from "react-native";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";

// react-native-render-html v6 uses defaultProps internally — suppress until they fix it upstream
LogBox.ignoreLogs(['Support for defaultProps will be removed from function components']);

function RootStack() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: colors.bgCard },
      headerTintColor: colors.text,
    }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="search" options={{ headerShown: false }} />
      <Stack.Screen name="categories" options={{ headerShown: false }} />
      <Stack.Screen name="category/[slug]" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="bookmarks" options={{ headerShown: false }} />
      <Stack.Screen name="contact" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="tos" options={{ headerShown: false }} />
      <Stack.Screen name="privacy" options={{ headerShown: false }} />
      <Stack.Screen name="cookies" options={{ headerShown: false }} />
      <Stack.Screen name="subscribe" options={{ headerShown: false }} />
      <Stack.Screen
        name="newsArticle/[id]"
        options={{
          headerTitle: '',
          headerLeft: () => (
            <Ionicons
              name="chevron-back"
              size={25}
              color={colors.iconBack}
              onPress={() => router.back()}
            />
          ),
          headerRight: () => (
            <View style={{ gap: 10, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name="share-outline"
                size={20}
                color={colors.icon}
                style={{ backgroundColor: colors.bgBtn, borderRadius: 15, padding: 5 }}
              />
              <MaterialCommunityIcons
                name="dots-horizontal"
                size={24}
                color={colors.icon}
                style={{ backgroundColor: colors.bgBtn, borderRadius: 15, padding: 2 }}
              />
            </View>
          ),
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <PaperProvider>
          <RootStack />
        </PaperProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
