import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';
import { useDatabase } from '../../context/DatabaseContext';
import { deleteAllData } from '../../database/dbService';
import { RootStackParamList } from '../../navigation/types';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

interface Props {
  navigation: NavigationProp;
}

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { db } = useDatabase();

  const handleDeleteAllData = () => {
    Alert.alert(
      'Delete All Data',
      'This will permanently delete all customers and transactions. This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            if (db) {
              await deleteAllData(db);
              Alert.alert('Success', 'All data has been deleted.');
              navigation.replace('Splash'); // Restart app logic
            }
          },
        },
      ],
    );
  };

  const showPrivacyPromise = () => {
    Alert.alert(
      'Privacy Promise',
      '1. No data is sent to our servers.\n2. No third-party ads or tracking.\n3. Your data stays on your device.\n4. You have full control over your data backups.',
      [{ text: 'Close' }],
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? Auto-backups will stop.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await GoogleSignin.signOut();
              await AsyncStorage.setItem('isLoggedIn', 'false');
              navigation.replace('Login');
            } catch (error) {
              console.error(error);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>Business Tools</Text>
        </View>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Reports')}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.menuIconContainer,
                { backgroundColor: Colors.primaryLight },
              ]}
            >
              <Icon name="bar-chart-2" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.menuText}>Business Reports</Text>
            <Icon name="chevron-right" size={20} color={Colors.border} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Backup')}
            activeOpacity={0.7}
          >
            <View
              style={[styles.menuIconContainer, { backgroundColor: '#F0F9FF' }]}
            >
              <Icon name="cloud" size={20} color="#0EA5E9" />
            </View>
            <Text style={styles.menuText}>Backup & Restore</Text>
            <Icon name="chevron-right" size={20} color={Colors.border} />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>Privacy & Security</Text>
        </View>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={showPrivacyPromise}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.menuIconContainer,
                { backgroundColor: Colors.successLight },
              ]}
            >
              <Icon name="shield" size={20} color={Colors.success} />
            </View>
            <Text style={styles.menuText}>Privacy Promise</Text>
            <Icon name="chevron-right" size={20} color={Colors.border} />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>Account</Text>
        </View>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View
              style={[styles.menuIconContainer, { backgroundColor: '#FEE2E2' }]}
            >
              <Icon name="log-out" size={20} color={Colors.danger} />
            </View>
            <Text style={styles.menuText}>Logout from Google</Text>
            <Icon name="chevron-right" size={20} color={Colors.border} />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>Danger Zone</Text>
        </View>
        <View
          style={[styles.sectionCard, { borderColor: Colors.danger + '40' }]}
        >
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleDeleteAllData}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.menuIconContainer,
                { backgroundColor: Colors.dangerLight },
              ]}
            >
              <Icon name="trash-2" size={20} color={Colors.danger} />
            </View>
            <Text style={[styles.menuText, { color: Colors.danger }]}>
              Delete All Data
            </Text>
            <Icon name="chevron-right" size={20} color={Colors.border} />
          </TouchableOpacity>
        </View>

        <View style={styles.footerInfo}>
          <View style={styles.appIconPlaceholder}>
            <Icon name="layers" size={32} color={Colors.border} />
          </View>
          <Text style={styles.versionText}>Simple Ledger App v1.0.0</Text>
          <Text style={styles.madeWithText}>
            Privacy-First Ledger for Small Businesses
          </Text>
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.text,
    fontWeight: '700',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionHeaderText: {
    ...Typography.caption,
    fontWeight: '800',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuText: {
    ...Typography.body,
    fontWeight: '600',
    flex: 1,
    color: Colors.text,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.background,
    marginLeft: 68,
    marginRight: 12,
  },
  footerInfo: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 20,
  },
  appIconPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  versionText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.text,
  },
  madeWithText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
});
