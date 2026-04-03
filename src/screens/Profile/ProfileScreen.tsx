import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDatabase } from '../../context/DatabaseContext';
import {
  uploadToGoogleDrive,
  getBackupFilePath,
} from '../../utils/googleDriveService';
import RNFS from 'react-native-fs';
import { checkInternetSpeed } from '../../utils/networkUtils';

export const ProfileScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { db, refreshDatabase } = useDatabase();
  const [userProfile, setUserProfile] = React.useState<any>(null);
  const [loggingOut, setLoggingOut] = React.useState(false);

  React.useEffect(() => {
    const loadUser = async () => {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        setUserProfile(JSON.parse(userStr));
      }
    };
    loadUser();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    const network = await checkInternetSpeed();
    setLoggingOut(false);

    if (network.status === 'none') {
      Alert.alert(
        'No Internet Connection',
        'Data backup to Google Drive is NOT possible right now. If you logout, your local data will still be cleared from this device for privacy. Do you want to proceed without backup?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Logout Anyway',
            style: 'destructive',
            onPress: performLogout,
          },
        ],
      );
      return;
    }

    if (network.status === 'slow') {
      Alert.alert(
        'Slow Internet Connection',
        'Your internet connection is too slow. Backup might fail or take a long time. Do you still want to try backing up and logging out?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Try Backup & Logout',
            style: 'destructive',
            onPress: performLogout,
          },
        ],
      );
      return;
    }

    // Internet is fine, proceed with normal flow
    Alert.alert(
      'Backup & Logout',
      'This will backup your data to Google Drive and remove it from this device for privacy. Do you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Backup & Logout',
          style: 'destructive',
          onPress: performLogout,
        },
      ],
    );
  };

  const performLogout = async () => {
    setLoggingOut(true);
    try {
      const userStr = await AsyncStorage.getItem('user');
      let userId: string | undefined;
      if (userStr) {
        const user = JSON.parse(userStr);
        userId = user?.user?.id;
      }

      // 1. Take Backup
      const path = getBackupFilePath(userId);
      const fileName = `SimpleLedger_Backup_Logout_${new Date().toISOString()}.db`;

      const fileExists = await RNFS.exists(path);
      if (fileExists) {
        try {
          await uploadToGoogleDrive(path, fileName);
          console.log('Logout backup successful');
        } catch (backupError) {
          console.error('Backup failed during logout:', backupError);
          // We might want to ask user if they want to proceed without backup
          // but for privacy, clearing local SQL as requested.
        }
      }

      // 2. Close and Delete Local SQL
      if (db) {
        try {
          await db.close();
        } catch (e) {
          // ignore
        }
      }

      if (fileExists) {
        await RNFS.unlink(path);
        console.log('Local database cleared for account:', userId);
      }

      // 3. Clear Session
      await GoogleSignin.signOut();
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('isLoggedIn');

      // 4. Refresh Context (will open guest DB)
      await refreshDatabase();

      navigation.replace('Login');
    } catch (error) {
      console.error('Logout failed:', error);
      Alert.alert('Error', 'An error occurred during logout.');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <Modal transparent visible={loggingOut} animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>
              Backing up & Safely Logging out...
            </Text>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => navigation.navigate('Settings')}
        >
          <Icon name="settings" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileInfo}>
          <View style={styles.avatarContainer}>
            {userProfile?.user?.photo ? (
              <Image
                source={{ uri: userProfile.user.photo }}
                style={styles.avatarImage}
              />
            ) : (
              <Icon name="user" size={40} color={Colors.primary} />
            )}
            <TouchableOpacity style={styles.editAvatarBtn}>
              <Icon name="camera" size={12} color={Colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>
            {userProfile?.user?.name || 'Business Owner'}
          </Text>
          <Text style={styles.userPhone}>
            {userProfile?.user?.email || 'No email associated'}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>150</Text>
            <Text style={styles.statLabel}>Customers</Text>
          </View>
          <View style={[styles.statItem, styles.statBorder]}>
            <Text style={styles.statValue}>₹45k</Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Bills</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Details</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: Colors.primaryLight },
                  ]}
                >
                  <Icon name="home" size={18} color={Colors.primary} />
                </View>
                <Text style={styles.menuText}>Business Name</Text>
              </View>
              <Text style={styles.menuValue}>Global Traders</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: Colors.successLight },
                  ]}
                >
                  <Icon name="map-pin" size={18} color={Colors.success} />
                </View>
                <Text style={styles.menuText}>Business Address</Text>
              </View>
              <Icon name="chevron-right" size={18} color={Colors.border} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#FFEECC' }]}>
                  <Icon name="file-text" size={18} color="#FF9900" />
                </View>
                <Text style={styles.menuText}>GST Number</Text>
              </View>
              <Text style={styles.menuValue}>Not Set</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('Reports')}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#E0F2F1' }]}>
                  <Icon name="pie-chart" size={18} color="#00796B" />
                </View>
                <Text style={styles.menuText}>View All Reports</Text>
              </View>
              <Icon name="chevron-right" size={18} color={Colors.border} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('Backup')}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#F3E5F5' }]}>
                  <Icon name="cloud-off" size={18} color="#7B1FA2" />
                </View>
                <Text style={styles.menuText}>Local Backup</Text>
              </View>
              <Icon name="chevron-right" size={18} color={Colors.border} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.versionText}>Simple Ledger v1.0.0</Text>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Icon name="log-out" size={18} color={Colors.danger} />
            <Text style={styles.logoutText}>Log Out Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.text,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingBottom: 40,
  },
  profileInfo: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: Colors.white,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  userName: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: 4,
  },
  userPhone: {
    ...Typography.caption,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    ...Typography.h3,
    fontSize: 18,
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text,
  },
  menuValue: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: Colors.border,
    marginBottom: 15,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  logoutText: {
    marginLeft: 8,
    color: Colors.danger,
    fontWeight: '600',
    fontSize: 14,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    backgroundColor: Colors.white,
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    width: '80%',
  },
  loadingText: {
    ...Typography.body,
    marginTop: 15,
    textAlign: 'center',
    color: Colors.text,
  },
});
