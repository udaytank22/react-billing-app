import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import Icon from 'react-native-vector-icons/Feather';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

import { useDatabase } from '../../context/DatabaseContext';
import { restoreLatestBackup } from '../../utils/googleDriveService';

export const LoginScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(false);
  const { refreshDatabase } = useDatabase();

  const signIn = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      await AsyncStorage.setItem('user', JSON.stringify(userInfo));
      await AsyncStorage.setItem('isLoggedIn', 'true');

      // Show restore message
      setLoading(true);
      if ((userInfo as any).user?.id) {
        try {
          const restored = await restoreLatestBackup((userInfo as any).user.id);
          if (restored) {
            Alert.alert(
              'Sync Success',
              'Your previous cloud backup has been synchronized successfully.',
            );
          }
        } catch (restoreError) {
          console.error('Auto-restore failed:', restoreError);
        }
      }

      // Refresh database to use account-specific DB
      await refreshDatabase();

      navigation.replace('Main');
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled the login flow
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // operation (e.g. sign in) is in progress already
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Play services not available or outdated');
      } else {
        Alert.alert('Error', 'Something went wrong with Google Sign-In');
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <View style={styles.topSection}>
        <View style={styles.logoContainer}>
          <Icon name="layers" size={60} color={Colors.white} />
        </View>
        <Text style={styles.appName}>Simple Ledger</Text>
        <Text style={styles.appTagline}>Privacy-First Offline Ledger</Text>
      </View>

      <View style={styles.bottomSection}>
        <Text style={styles.welcomeText}>Welcome Back</Text>
        <Text style={styles.instructionText}>
          Sign in with Google to enable secure backups to your Google Drive.
        </Text>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={signIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <>
              <View style={styles.googleIconContainer}>
                <Image
                  source={{
                    uri: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg',
                  }}
                  style={styles.googleIcon}
                />
              </View>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Icon name="shield" size={18} color={Colors.success} />
            <Text style={styles.featureText}>100% Private</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="cloud" size={18} color={Colors.primary} />
            <Text style={styles.featureText}>G-Drive Backup</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="wifi-off" size={18} color={Colors.warning} />
            <Text style={styles.featureText}>Offline First</Text>
          </View>
        </View>

        <Text style={styles.privacyNote}>
          By continuing, you agree to our Privacy Policy and Terms of Service.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    ...Typography.h1,
    color: Colors.white,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  appTagline: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
  },
  bottomSection: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 30,
    paddingBottom: 50,
    alignItems: 'center',
  },
  welcomeText: {
    ...Typography.h2,
    color: Colors.text,
    fontWeight: '700',
    marginBottom: 10,
  },
  instructionText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  googleButton: {
    width: '100%',
    height: 60,
    backgroundColor: Colors.white,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  googleIconContainer: {
    marginRight: 12,
  },
  googleIcon: {
    width: 24,
    height: 24,
  },
  googleButtonText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 40,
    marginBottom: 30,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureText: {
    ...Typography.caption,
    marginTop: 8,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  privacyNote: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
