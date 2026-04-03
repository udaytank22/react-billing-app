import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Alert,
  Share,
  Dimensions,
  Platform,
} from 'react-native';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useIsFocused } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useDatabase } from '../../context/DatabaseContext';
import {
  getCustomerById,
  getTransactions,
  deleteCustomer,
  Transaction,
  Customer,
} from '../../database/dbService';
import { RootStackParamList } from '../../navigation/types';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '../../context/ToastContext';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'CustomerDetail'
>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'CustomerDetail'>;

interface Props {
  navigation: NavigationProp;
  route: ScreenRouteProp;
}

export const CustomerDetailScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const { customerId } = route.params;
  const { db } = useDatabase();
  const { showToast } = useToast();
  const isFocused = useIsFocused();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (db) {
      setLoading(true);
      const customerData = await getCustomerById(db, customerId);
      const transactionData = await getTransactions(db, customerId);
      setCustomer(customerData);
      setTransactions(transactionData);
      setLoading(false);
    }
  }, [db, customerId]);

  useEffect(() => {
    if (isFocused) {
      fetchData();
    }
  }, [isFocused, fetchData]);

  const handleShare = async () => {
    if (!customer) return;

    let message = `Ledger Summary for ${customer.name}\n\n`;
    message += `Current Balance: ₹${Math.abs(
      customer.balance || 0,
    ).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${
      (customer.balance || 0) >= 0 ? 'To Receive' : 'To Pay'
    })\n\n`;
    message += `Last 5 Transactions:\n`;

    transactions.slice(0, 5).forEach(t => {
      const typeStr = t.type === 'credit' ? 'Credit (+)' : 'Debit (-)';
      const itemStr = t.item_name ? ` [${t.item_qty} ${t.item_name}]` : '';
      message += `${format(
        new Date(t.date),
        'dd MMM yyyy',
      )}: ₹${t.amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
      })}${itemStr} (${typeStr})\n`;
    });

    message += `\nShared via Simple Ledger App`;

    try {
      await Share.share({ message });
    } catch (error) {
      Alert.alert('Error', 'Failed to share');
    }
  };

  const handleDeleteCustomer = () => {
    if (!customer) return;

    Alert.alert(
      'Delete Customer',
      `Are you sure you want to delete ${customer.name}? All transaction history for this customer will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (db) {
              try {
                await deleteCustomer(db, customerId);
                showToast('Customer deleted successfully', 'success');
                navigation.goBack();
              } catch (error) {
                console.error(error);
                Alert.alert('Error', 'Failed to delete customer');
              }
            }
          },
        },
      ],
    );
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const isCredit = item.type === 'credit';
    const amountColor = isCredit ? Colors.success : Colors.danger;

    return (
      <TouchableOpacity
        style={styles.transactionCard}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('TransactionDetail', { transactionId: item.id })
        }
      >
        <View style={styles.transactionDateBox}>
          <Text style={styles.dateDay}>
            {format(new Date(item.date), 'dd')}
          </Text>
          <Text style={styles.dateMonth}>
            {format(new Date(item.date), 'MMM')}
          </Text>
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDesc} numberOfLines={1}>
            {item.description || (isCredit ? 'Credit Entry' : 'Debit Entry')}
          </Text>
          {item.item_name ? (
            <View style={styles.itemInfoRow}>
              <View style={styles.itemBadge}>
                <Icon name="package" size={10} color={Colors.primary} />
                <Text style={styles.itemBadgeText}>
                  {item.item_qty} {item.item_name}
                </Text>
              </View>
              {item.item_qty! > 0 && (
                <View style={styles.priceProfitInfo}>
                  <Text style={styles.unitPriceText}>
                    ₹{(item.amount / item.item_qty!).toFixed(1)}/unit
                  </Text>
                  {!isCredit &&
                    item.product_purchase_price !== undefined &&
                    item.product_purchase_price !== null && (
                      <Text style={styles.profitText}>
                        Profit: ₹
                        {(
                          item.amount -
                          item.product_purchase_price * item.item_qty!
                        ).toFixed(1)}
                      </Text>
                    )}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.transactionTimeRow}>
              <Icon name="clock" size={12} color={Colors.textSecondary} />
              <Text style={styles.transactionTime}>
                {format(new Date(item.date), 'hh:mm a')}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.transactionAmountContainer}>
          <View
            style={[
              styles.amountBadge,
              {
                backgroundColor: isCredit
                  ? Colors.successLight
                  : Colors.dangerLight,
              },
            ]}
          >
            <Text style={[styles.transactionAmount, { color: amountColor }]}>
              {isCredit ? '+' : '-'} ₹
              {item.amount.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
              })}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !customer) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  const balance = customer?.balance || 0;
  const isCredit = balance >= 0;

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
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {customer?.name}
          </Text>
          <Text style={styles.headerSubtitle}>
            {customer?.phone || 'No phone number'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.headerActionBtn, { marginRight: 10 }]}
          onPress={handleShare}
        >
          <Icon name="share-2" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.headerActionBtn,
            { backgroundColor: Colors.dangerLight },
          ]}
          onPress={handleDeleteCustomer}
        >
          <Icon name="trash-2" size={20} color={Colors.danger} />
        </TouchableOpacity>
      </View>

      <View style={styles.summaryContainer}>
        <View
          style={[
            styles.balanceSummary,
            { borderColor: isCredit ? Colors.success : Colors.danger },
          ]}
        >
          <Text style={styles.summaryLabel}>Total Net Balance</Text>
          <Text
            style={[
              styles.summaryValue,
              { color: isCredit ? Colors.success : Colors.danger },
            ]}
          >
            ₹
            {Math.abs(balance).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
            })}
          </Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isCredit
                  ? Colors.successLight
                  : Colors.dangerLight,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: isCredit ? Colors.success : Colors.danger },
              ]}
            >
              {isCredit ? 'YOU WILL RECEIVE' : 'YOU WILL PAY'}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Transaction History</Text>

      <FlatList
        data={transactions}
        keyExtractor={item => item.id.toString()}
        renderItem={renderTransaction}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Icon name="file-text" size={40} color={Colors.border} />
            </View>
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubText}>
              Add entries to start tracking
            </Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: Colors.danger }]}
          onPress={() =>
            navigation.navigate('AddEntry', {
              customerId,
              type: 'debit',
            })
          }
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText}>YOU GAVE ₹</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: Colors.success }]}
          onPress={() =>
            navigation.navigate('AddEntry', {
              customerId,
              type: 'credit',
            })
          }
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText}>YOU GOT ₹</Text>
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.text,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: -2,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContainer: {
    padding: 20,
    backgroundColor: Colors.white,
  },
  balanceSummary: {
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryValue: {
    ...Typography.h1,
    fontSize: 36,
    marginVertical: 8,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  transactionCard: {
    backgroundColor: Colors.white,
    padding: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  transactionDateBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dateDay: {
    ...Typography.body,
    fontWeight: '800',
    color: Colors.text,
    lineHeight: 18,
  },
  dateMonth: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text,
  },
  transactionTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  transactionTime: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  itemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  itemBadgeText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '800',
    marginLeft: 4,
  },
  itemInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
    flexWrap: 'wrap',
  },
  priceProfitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unitPriceText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
    backgroundColor: Colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  profitText: {
    fontSize: 10,
    color: Colors.success,
    fontWeight: '700',
    backgroundColor: Colors.successLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  amountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  transactionAmount: {
    ...Typography.bodySmall,
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text,
  },
  emptySubText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    ...Typography.button,
    color: Colors.white,
    fontSize: 14,
    letterSpacing: 1,
  },
});
