import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  Platform,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../../navigation/types';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  uploadToGoogleDrive,
  getBackupFilePath,
} from '../../utils/googleDriveService';
import RNFS from 'react-native-fs';
import {
  pick,
  isErrorWithCode,
  errorCodes,
  types,
} from '@react-native-documents/picker';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Backup'>;

interface Props {
  navigation: NavigationProp;
}

export const BackupScreen: React.FC<Props> = ({ navigation }) => {
  const [isAutoBackupEnabled, setIsAutoBackupEnabled] = useState(false);
  const [frequency, setFrequency] = useState('Daily'); // Daily, Weekly, Monthly
  const [backupTime, setBackupTime] = useState('02:00 AM');
  const [backupDay, setBackupDay] = useState('Sunday');
  const [loading, setLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const enabled = await AsyncStorage.getItem('auto_backup_enabled');
      const freq = await AsyncStorage.getItem('backup_frequency');
      const time = await AsyncStorage.getItem('backup_time');
      const day = await AsyncStorage.getItem('backup_day');
      const last = await AsyncStorage.getItem('last_backup_date');

      if (enabled !== null) setIsAutoBackupEnabled(enabled === 'true');
      if (freq !== null) setFrequency(freq);
      if (time !== null) setBackupTime(time);
      if (day !== null) setBackupDay(day);
      if (last !== null) setLastBackup(last);
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  };

  const saveSetting = async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.error(`Failed to save ${key}`, e);
    }
  };

  const toggleAutoBackup = async (value: boolean) => {
    setIsAutoBackupEnabled(value);
    await saveSetting('auto_backup_enabled', value.toString());
  };

  const handleManualBackup = async () => {
    setLoading(true);
    try {
      const userStr = await AsyncStorage.getItem('user');
      let userId: string | undefined;
      if (userStr) {
        const user = JSON.parse(userStr);
        userId = user?.user?.id;
      }

      const path = getBackupFilePath(userId);
      const fileName = `SimpleLedger_Backup_${new Date().toISOString()}.db`;
      await uploadToGoogleDrive(path, fileName);

      const now = new Date().toLocaleString();
      setLastBackup(now);
      await saveSetting('last_backup_date', now);

      Alert.alert('Success', 'Backup uploaded to Google Drive successfully!');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to upload backup to Google Drive.');
    } finally {
      setLoading(false);
    }
  };

  const handleLocalStore = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      let userId: string | undefined;
      if (userStr) {
        const user = JSON.parse(userStr);
        userId = user?.user?.id;
      }

      const dbPath = getBackupFilePath(userId);
      const downloadPath =
        Platform.OS === 'android'
          ? `${RNFS.DownloadDirectoryPath}/SimpleLedger_Backup.db`
          : `${RNFS.DocumentDirectoryPath}/SimpleLedger_Backup.db`;

      await RNFS.copyFile(dbPath, downloadPath);
      Alert.alert('Success', `Backup stored locally at: ${downloadPath}`);
    } catch (e) {
      Alert.alert('Error', 'Failed to store locally');
    }
  };

  const handleRestore = async () => {
    try {
      const res = await pick({
        type: [types.allFiles],
      });

      const selectedFile = res[0];

      const userStr = await AsyncStorage.getItem('user');
      let userId: string | undefined;
      if (userStr) {
        const user = JSON.parse(userStr);
        userId = user?.user?.id;
      }

      const dbPath = getBackupFilePath(userId);

      Alert.alert(
        'Restore Data',
        'This will overwrite all current data with the selected backup file. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: async () => {
              try {
                // Ensure the directory exists
                const dbDir = dbPath.substring(0, dbPath.lastIndexOf('/'));
                await RNFS.mkdir(dbDir);

                await RNFS.copyFile(selectedFile.uri, dbPath);
                Alert.alert(
                  'Success',
                  'Data restored successfully. Please restart the app.',
                );
                navigation.replace('Splash');
              } catch (e) {
                console.error(e);
                Alert.alert('Error', 'Failed to restore file.');
              }
            },
          },
        ],
      );
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        // User cancelled the picker
      } else {
        console.error(err);
      }
    }
  };

  const selectFrequency = (freq: string) => {
    setFrequency(freq);
    saveSetting('backup_frequency', freq);
  };

  const selectTime = () => {
    // In a real app, use a TimePicker. Mocking with alert for now.
    Alert.alert('Select Time', 'Choose a time for backup', [
      {
        text: '02:00 AM',
        onPress: () => {
          setBackupTime('02:00 AM');
          saveSetting('backup_time', '02:00 AM');
        },
      },
      {
        text: '10:00 PM',
        onPress: () => {
          setBackupTime('10:00 PM');
          saveSetting('backup_time', '10:00 PM');
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const selectDay = () => {
    const days = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    Alert.alert(
      'Select Day',
      'Choose a day for weekly backup',
      days.map(d => ({
        text: d,
        onPress: () => {
          setBackupDay(d);
          saveSetting('backup_day', d);
        },
      })),
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
        <Text style={styles.headerTitle}>Backup Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.googleDriveSection}>
          <View style={styles.driveHeader}>
            <View style={styles.driveIconContainer}>
              <Icon name="cloud" size={24} color="#4285F4" />
            </View>
            <View style={styles.driveTextContainer}>
              <Text style={styles.driveTitle}>Google Drive Backup</Text>
              <Text style={styles.driveSubtitle}>
                {lastBackup ? `Last backup: ${lastBackup}` : 'Never backed up'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.backupNowBtn}
            onPress={handleManualBackup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Icon
                  name="upload-cloud"
                  size={20}
                  color={Colors.white}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.backupNowText}>Backup Now</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <View>
              <Text style={styles.settingTitle}>Auto Backup</Text>
              <Text style={styles.settingSubtitle}>
                Automatically backup your data
              </Text>
            </View>
            <Switch
              value={isAutoBackupEnabled}
              onValueChange={toggleAutoBackup}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Platform.OS === 'ios' ? undefined : Colors.white}
            />
          </View>

          {isAutoBackupEnabled && (
            <View style={styles.autoBackupOptions}>
              <View style={styles.optionDivider} />

              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => {
                  Alert.alert('Frequency', 'Choose backup frequency', [
                    { text: 'Daily', onPress: () => selectFrequency('Daily') },
                    {
                      text: 'Weekly',
                      onPress: () => selectFrequency('Weekly'),
                    },
                    {
                      text: 'Monthly',
                      onPress: () => selectFrequency('Monthly'),
                    },
                  ]);
                }}
              >
                <Text style={styles.optionLabel}>Frequency</Text>
                <View style={styles.optionValueContainer}>
                  <Text style={styles.optionValue}>{frequency}</Text>
                  <Icon
                    name="chevron-right"
                    size={16}
                    color={Colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>

              <View style={styles.optionDivider} />

              {frequency === 'Weekly' && (
                <>
                  <TouchableOpacity
                    style={styles.optionRow}
                    onPress={selectDay}
                  >
                    <Text style={styles.optionLabel}>Day of week</Text>
                    <View style={styles.optionValueContainer}>
                      <Text style={styles.optionValue}>{backupDay}</Text>
                      <Icon
                        name="chevron-right"
                        size={16}
                        color={Colors.textSecondary}
                      />
                    </View>
                  </TouchableOpacity>
                  <View style={styles.optionDivider} />
                </>
              )}

              <TouchableOpacity style={styles.optionRow} onPress={selectTime}>
                <Text style={styles.optionLabel}>Time</Text>
                <View style={styles.optionValueContainer}>
                  <Text style={styles.optionValue}>{backupTime}</Text>
                  <Icon
                    name="chevron-right"
                    size={16}
                    color={Colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>Local Storage</Text>
        </View>

        <TouchableOpacity style={styles.localOption} onPress={handleLocalStore}>
          <View style={styles.localIconContainer}>
            <Icon name="smartphone" size={20} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.localTitle}>Store Locally</Text>
            <Text style={styles.localSubtitle}>
              Save a copy of data to your device storage
            </Text>
          </View>
          <Icon name="download" size={20} color={Colors.border} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.localOption} onPress={handleRestore}>
          <View style={styles.localIconContainer}>
            <Icon name="file-text" size={20} color={Colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.localTitle}>Retrieve Local File</Text>
            <Text style={styles.localSubtitle}>
              Import data from a local backup file
            </Text>
          </View>
          <Icon name="upload" size={20} color={Colors.border} />
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Icon
            name="info"
            size={18}
            color={Colors.primary}
            style={{ marginTop: 2, marginRight: 10 }}
          />
          <Text style={styles.infoText}>
            Monthly backups are created on the last day of each month. Weekly
            backups run on your selected day.
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
  googleDriveSection: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  driveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  driveIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  driveTextContainer: {
    flex: 1,
  },
  driveTitle: {
    ...Typography.h3,
    fontSize: 18,
    color: Colors.text,
    fontWeight: '700',
  },
  driveSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  backupNowBtn: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backupNowText: {
    ...Typography.body,
    color: Colors.white,
    fontWeight: '700',
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  settingTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text,
  },
  settingSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  autoBackupOptions: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  optionLabel: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '500',
  },
  optionValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionValue: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
    marginRight: 8,
  },
  optionDivider: {
    height: 1,
    backgroundColor: Colors.background,
  },
  sectionHeader: {
    marginBottom: 12,
    marginLeft: 4,
    marginTop: 8,
  },
  sectionHeaderText: {
    ...Typography.caption,
    fontWeight: '800',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  localOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  localIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  localTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text,
  },
  localSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  infoText: {
    ...Typography.caption,
    color: '#0369A1',
    flex: 1,
    lineHeight: 18,
  },
});
