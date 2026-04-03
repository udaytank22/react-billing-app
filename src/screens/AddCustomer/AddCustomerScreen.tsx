import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';
import { useDatabase } from '../../context/DatabaseContext';
import { addCustomer } from '../../database/dbService';
import { RootStackParamList } from '../../navigation/types';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '../../context/ToastContext';

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AddCustomer'
>;

interface Props {
  navigation: NavigationProp;
}

export const AddCustomerScreen: React.FC<Props> = ({ navigation }) => {
  const { db } = useDatabase();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('Customer name is required', 'error');
      return;
    }

    if (phone.trim() && !/^\+?[\d\s-]{10,}$/.test(phone.trim())) {
      showToast('Please enter a valid phone number', 'error');
      return;
    }

    if (!db) return;

    setLoading(true);
    try {
      await addCustomer(db, { name, phone, notes });
      navigation.goBack();
    } catch (error) {
      console.error(error);
      showToast('Failed to save customer', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Customer</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <View style={styles.inputWrapper}>
                <Icon
                  name="user"
                  size={18}
                  color={Colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. John Smith"
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor={Colors.textSecondary}
                  autoFocus
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <Icon
                  name="phone"
                  size={18}
                  color={Colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. +91 9876543210"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Additional Notes</Text>
              <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                <Icon
                  name="file-text"
                  size={18}
                  color={Colors.textSecondary}
                  style={[styles.inputIcon, { marginTop: 12 }]}
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Shop name, address, or other details..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
            </View>
          </View>

          <View style={styles.helperBox}>
            <Icon name="shield" size={16} color={Colors.success} />
            <Text style={styles.helperText}>
              All data is stored locally and securely on your device.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.disabledButton]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'CREATING CUSTOMER...' : 'SAVE CUSTOMER'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    ...Typography.caption,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
    marginLeft: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  textArea: {
    height: 100,
  },
  helperBox: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.successLight + '40',
    borderRadius: 16,
    marginTop: 20,
    alignItems: 'center',
  },
  helperText: {
    fontSize: 12,
    color: Colors.success,
    marginLeft: 12,
    flex: 1,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 30,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  saveButtonText: {
    ...Typography.button,
    color: Colors.white,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
