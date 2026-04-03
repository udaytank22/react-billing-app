import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  StatusBar,
  RefreshControl,
  Dimensions,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';
import { useDatabase } from '../../context/DatabaseContext';
import {
  getTodayCustomers,
  getStockSummary,
  getTasks,
  generateAutoTasks,
  Customer,
  Task,
} from '../../database/dbService';
import { RootStackParamList } from '../../navigation/types';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useIsFocused } from '@react-navigation/native';
import { useVoiceAssistant } from '../../hooks/useVoiceAssistant';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: NavigationProp;
}

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { db } = useDatabase();
  const isFocused = useIsFocused();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stockSummary, setStockSummary] = useState({
    total_value: 0,
    total_items: 0,
    stock_in: 0,
    stock_out: 0,
    today_profit: 0,
    today_loss: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { askQuestion, isListening, recognizedText, startListening } =
    useVoiceAssistant();
  const [hasAsked, setHasAsked] = useState(false);
  const [voicePreference, setVoicePreference] = useState<string | null>(null);
  const [showVoicePrompt, setShowVoicePrompt] = useState(false);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);

  const fetchData = useCallback(async () => {
    if (db) {
      const [customersData, stockData] = await Promise.all([
        getTodayCustomers(db), // Only today's customers
        getStockSummary(db),
      ]);
      setCustomers(customersData);
      setStockSummary(
        stockData || {
          total_value: 0,
          total_items: 0,
          stock_in: 0,
          stock_out: 0,
          today_profit: 0,
          today_loss: 0,
        },
      );

      // Fetch tasks and generate auto tasks
      await generateAutoTasks(db);
      const tasks = await getTasks(db);
      setPendingTasksCount(tasks.filter(t => t.status === 'pending').length);
    }
  }, [db]);

  useEffect(() => {
    const checkVoicePreference = async () => {
      const pref = await AsyncStorage.getItem('@voice_preference');
      setVoicePreference(pref);
      if (pref === null) {
        setShowVoicePrompt(true);
      }
    };
    checkVoicePreference();
  }, []);

  useEffect(() => {
    if (isFocused) {
      fetchData();
      if (!hasAsked && voicePreference === 'enabled') {
        const timer = setTimeout(() => {
          askQuestion('Welcome to Khata. What would you like to do today?');
          setHasAsked(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [isFocused, fetchData, hasAsked, askQuestion, voicePreference]);

  const handleSetVoicePreference = async (enabled: boolean) => {
    const pref = enabled ? 'enabled' : 'disabled';
    await AsyncStorage.setItem('@voice_preference', pref);
    setVoicePreference(pref);
    setShowVoicePrompt(false);

    if (enabled) {
      setTimeout(() => {
        askQuestion('Voice assistant enabled. You can now use voice commands.');
        setHasAsked(true);
      }, 500);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalReceive = customers
    .filter(c => (c.balance || 0) > 0)
    .reduce((acc, c) => acc + (c.balance || 0), 0);

  const totalPay = customers
    .filter(c => (c.balance || 0) < 0)
    .reduce((acc, c) => acc + Math.abs(c.balance || 0), 0);

  const renderItem = ({ item }: { item: Customer }) => {
    const balance = item.balance || 0;
    const isCredit = balance >= 0;

    return (
      <TouchableOpacity
        style={styles.customerCard}
        onPress={() =>
          navigation.navigate('CustomerDetail', { customerId: item.id })
        }
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <View
            style={[
              styles.customerAvatar,
              {
                backgroundColor: isCredit
                  ? Colors.successLight
                  : Colors.dangerLight,
              },
            ]}
          >
            <Text
              style={[
                styles.avatarText,
                { color: isCredit ? Colors.success : Colors.danger },
              ]}
            >
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.stockBadge}>
              <Icon name="package" size={10} color={Colors.textSecondary} />
              <Text style={styles.stockBadgeText}>
                {item.stock_balance || 0} Units
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardRight}>
          <Text
            style={[
              styles.balanceAmount,
              {
                color:
                  balance === 0
                    ? Colors.textSecondary
                    : isCredit
                    ? Colors.success
                    : Colors.danger,
              },
            ]}
          >
            ₹
            {Math.abs(balance).toLocaleString('en-IN', {
              minimumFractionDigits: 0,
            })}
          </Text>
          <Text style={styles.balanceStatus}>
            {balance === 0 ? 'Settled' : isCredit ? 'Receive' : 'Pay'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerSubtitle}>Your business at a glance</Text>
          </View>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => navigation.navigate('Tasks')}
          >
            <Icon name="clipboard" size={24} color={Colors.primary} />
            {pendingTasksCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingTasksCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <Modal
          visible={showVoicePrompt}
          transparent={true}
          animationType="fade"
          statusBarTranslucent
        >
          <View style={styles.modalOverlay}>
            <Animated.View entering={FadeIn} style={styles.voicePromptCard}>
              <View style={styles.voiceIconContainer}>
                <Icon name="mic" size={40} color={Colors.white} />
              </View>
              <Text style={styles.voicePromptTitle}>Voice Operation</Text>
              <Text style={styles.voicePromptDesc}>
                Would you like to use voice commands to navigate and add entries
                to your ledger?
              </Text>
              <View style={styles.voicePromptActions}>
                <TouchableOpacity
                  style={[styles.voiceActionBtn, styles.voiceActionBtnNo]}
                  onPress={() => handleSetVoicePreference(false)}
                >
                  <Text style={styles.voiceActionBtnNoText}>No, thanks</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.voiceActionBtn, styles.voiceActionBtnYes]}
                  onPress={() => handleSetVoicePreference(true)}
                >
                  <Text style={styles.voiceActionBtnYesText}>Yes, Enable</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </Modal>

        {isListening && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={styles.listeningOverlay}
          >
            <View style={styles.listeningCard}>
              <View style={styles.pulseContainer}>
                <View style={styles.pulse} />
                <Icon name="mic" size={32} color={Colors.primary} />
              </View>
              <Text style={styles.listeningText}>Listening...</Text>
              {recognizedText ? (
                <Text style={styles.recognizedText}>"{recognizedText}"</Text>
              ) : null}
            </View>
          </Animated.View>
        )}

        <View style={styles.summaryContainer}>
          <View style={styles.dualCardContainer}>
            <View
              style={[
                styles.miniSummaryCard,
                { borderColor: Colors.success + '40' },
              ]}
            >
              <View style={styles.miniCardHeader}>
                <Icon name="arrow-up-right" size={16} color={Colors.success} />
                <Text style={styles.miniCardLabel}>To Get</Text>
              </View>
              <Text
                style={[styles.miniCardValue, { color: Colors.success }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                ₹
                {(totalReceive || 0).toLocaleString('en-IN', {
                  minimumFractionDigits: 0,
                })}
              </Text>
              <View style={styles.miniCardFooter}>
                <Text style={styles.miniCardSubText}>Ledger Credit</Text>
              </View>
            </View>

            <View
              style={[
                styles.miniSummaryCard,
                { borderColor: Colors.danger + '40' },
              ]}
            >
              <View style={styles.miniCardHeader}>
                <Icon name="arrow-down-left" size={16} color={Colors.danger} />
                <Text style={styles.miniCardLabel}>To Pay</Text>
              </View>
              <Text
                style={[styles.miniCardValue, { color: Colors.danger }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                ₹
                {(totalPay || 0).toLocaleString('en-IN', {
                  minimumFractionDigits: 0,
                })}
              </Text>
              <View style={styles.miniCardFooter}>
                <Text style={styles.miniCardSubText}>Ledger Debit</Text>
              </View>
            </View>
          </View>

          <View style={[styles.dualCardContainer, { marginTop: 12 }]}>
            <View
              style={[
                styles.miniSummaryCard,
                { borderColor: Colors.primary + '40' },
              ]}
            >
              <View style={styles.miniCardHeader}>
                <Icon name="trending-up" size={16} color={Colors.primary} />
                <Text style={styles.miniCardLabel}>Today's Profit</Text>
              </View>
              <Text
                style={[styles.miniCardValue, { color: Colors.primary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                ₹
                {(stockSummary?.today_profit || 0).toLocaleString('en-IN', {
                  minimumFractionDigits: 0,
                })}
              </Text>
              <View style={styles.miniCardFooter}>
                <Text style={styles.miniCardSubText}>Net Earnings</Text>
              </View>
            </View>

            <View
              style={[
                styles.miniSummaryCard,
                { borderColor: Colors.accent + '40' },
              ]}
            >
              <View style={styles.miniCardHeader}>
                <Icon name="trending-down" size={16} color={Colors.accent} />
                <Text style={styles.miniCardLabel}>Today's Loss</Text>
              </View>
              <Text
                style={[styles.miniCardValue, { color: Colors.accent }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                ₹
                {(stockSummary?.today_loss || 0).toLocaleString('en-IN', {
                  minimumFractionDigits: 0,
                })}
              </Text>
              <View style={styles.miniCardFooter}>
                <Text style={styles.miniCardSubText}>Sales Return/Loss</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Icon
              name="search"
              size={20}
              color={Colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search customer by name..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={Colors.textSecondary}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn}>
            <Icon name="sliders" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredCustomers}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Icon name="users" size={48} color={Colors.border} />
              </View>
              <Text style={styles.emptyText}>No customers found</Text>
              <Text style={styles.emptySubText}>
                Add customers to start tracking payments
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </>
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
    paddingBottom: 10,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: -2,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  micBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  headerActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: Colors.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
    paddingHorizontal: 2,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 8,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  voicePromptCard: {
    backgroundColor: Colors.white,
    borderRadius: 30,
    padding: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 20,
  },
  voiceIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  voicePromptTitle: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  voicePromptDesc: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  voicePromptActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  voiceActionBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceActionBtnNo: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  voiceActionBtnYes: {
    backgroundColor: Colors.primary,
  },
  voiceActionBtnNoText: {
    ...Typography.button,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  voiceActionBtnYesText: {
    ...Typography.button,
    color: Colors.white,
    fontSize: 14,
  },
  listeningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listeningCard: {
    backgroundColor: Colors.white,
    padding: 30,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    width: '80%',
  },
  pulseContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  pulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '20',
    // We could add actual animation here if we had more time
  },
  listeningText: {
    ...Typography.h3,
    color: Colors.primary,
    marginBottom: 10,
  },
  recognizedText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  summaryContainer: {
    padding: 20,
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 5,
    zIndex: 10,
  },
  dualCardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  miniSummaryCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'space-between',
    minHeight: 100,
  },
  miniCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  miniCardLabel: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  miniCardValue: {
    ...Typography.h3,
    fontSize: 18,
    fontWeight: '800',
  },
  miniCardFooter: {
    marginTop: 4,
  },
  miniCardSubText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  movementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  movementBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  movementText: {
    fontSize: 12,
    fontWeight: '800',
  },
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  filterBtn: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  customerCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    ...Typography.h3,
    fontWeight: '700',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  stockBadgeText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginLeft: 4,
  },
  customerPhone: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  balanceAmount: {
    ...Typography.body,
    fontWeight: '800',
  },
  balanceStatus: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    ...Typography.h3,
    color: Colors.text,
    textAlign: 'center',
  },
  emptySubText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  addFirstButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addFirstButtonText: {
    ...Typography.button,
    color: Colors.white,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  fabText: {
    ...Typography.button,
    color: Colors.white,
    marginLeft: 10,
    letterSpacing: 0.5,
  },
});
