import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

interface Props {
  navigation: NavigationProp;
}

export const SplashScreen: React.FC<Props> = ({ navigation }) => {
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);

  useEffect(() => {
    checkFirstLaunch();
  }, []);

  const checkFirstLaunch = async () => {
    try {
      const isFirstLaunch = await AsyncStorage.getItem('@is_first_launch');
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');

      if (isFirstLaunch === null) {
        setIsFirstLaunch(true);
      } else if (isLoggedIn === 'true') {
        navigation.replace('Main');
      } else {
        navigation.replace('Login');
      }
    } catch (e) {
      navigation.replace('Login');
    }
  };

  const handleContinue = async () => {
    await AsyncStorage.setItem('@is_first_launch', 'false');
    navigation.replace('Login');
  };

  if (isFirstLaunch === null) return <View style={styles.container} />;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Khata</Text>
          <Text style={styles.tagline}>Simple. Private. Secure.</Text>
        </View>

        <View style={styles.promiseContainer}>
          <Text style={styles.promiseTitle}>Our Privacy Promise</Text>

          <View style={styles.promiseItem}>
            <Text style={styles.promiseIcon}>🛡️</Text>
            <View>
              <Text style={styles.promiseItemTitle}>No Ads, Ever</Text>
              <Text style={styles.promiseItemText}>
                We don't sell your attention.
              </Text>
            </View>
          </View>

          <View style={styles.promiseItem}>
            <Text style={styles.promiseIcon}>🚫</Text>
            <View>
              <Text style={styles.promiseItemTitle}>No Forced Permissions</Text>
              <Text style={styles.promiseItemText}>
                We don't ask for contacts or SMS.
              </Text>
            </View>
          </View>

          <View style={styles.promiseItem}>
            <Text style={styles.promiseIcon}>📱</Text>
            <View>
              <Text style={styles.promiseItemTitle}>Offline First</Text>
              <Text style={styles.promiseItemText}>
                Your data stays on your device.
              </Text>
            </View>
          </View>

          <View style={styles.promiseItem}>
            <Text style={styles.promiseIcon}>🤝</Text>
            <View>
              <Text style={styles.promiseItemTitle}>Truly Private</Text>
              <Text style={styles.promiseItemText}>
                No analytics, no tracking.
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoText: {
    ...Typography.h1,
    fontSize: 48,
    color: Colors.primary,
  },
  tagline: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  promiseContainer: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  promiseTitle: {
    ...Typography.h3,
    marginBottom: 20,
    color: Colors.text,
  },
  promiseItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  promiseIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  promiseItemTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text,
  },
  promiseItemText: {
    ...Typography.caption,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    ...Typography.button,
    color: Colors.white,
  },
});
