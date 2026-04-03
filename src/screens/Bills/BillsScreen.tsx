import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '../../context/DatabaseContext';
import { format } from 'date-fns';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useIsFocused } from '@react-navigation/native';
import { deleteTransaction, getBills, Bill } from '../../database/dbService';
import { Alert } from 'react-native';
import { useToast } from '../../context/ToastContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Bills'>;

interface Props {
  navigation: NavigationProp;
}

export const BillsScreen: React.FC<Props> = ({ navigation }) => {
  const { db } = useDatabase();
  const { showToast } = useToast();
  const isFocused = useIsFocused();
  const [bills, setBills] = useState<Bill[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchBillsData = useCallback(async () => {
    if (db) {
      setLoading(true);
      const data = await getBills(db);
      setBills(data);
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    if (isFocused) {
      fetchBillsData();
    }
  }, [isFocused, fetchBillsData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBillsData();
    setRefreshing(false);
  };

  const handleShareBill = (bill: Bill) => {
    const message = `Invoice: ${bill.bill_number}\nCustomer: ${
      bill.customer_name
    }\nAmount: ₹${bill.amount.toFixed(2)}\nDate: ${format(
      new Date(bill.date),
      'dd MMM yyyy',
    )}\n\nShared via Simple Ledger App`;
    Share.share({ message });
  };

  const handleDeleteBill = (bill: Bill) => {
    Alert.alert(
      'Delete Invoice',
      'Are you sure you want to delete this invoice and its transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (db) {
              try {
                await deleteTransaction(db, bill.transaction_id);
                showToast('Invoice deleted', 'success');
                fetchBillsData();
              } catch (error) {
                console.error(error);
                showToast('Failed to delete invoice', 'error');
              }
            }
          },
        },
      ],
    );
  };

  const renderBillItem = ({ item }: { item: Bill }) => (
    <TouchableOpacity
      style={styles.billCard}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('BillDetail', { billId: item.id })}
    >
      <View style={styles.billHeader}>
        <View style={styles.billIconContainer}>
          <Icon name="file-text" size={20} color={Colors.primary} />
        </View>
        <View style={styles.billMeta}>
          <Text style={styles.billNumber}>{item.bill_number}</Text>
          <Text style={styles.billDate}>
            {format(new Date(item.date), 'dd MMM yyyy, hh:mm a')}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={() => handleShareBill(item)}
        >
          <Icon name="share-2" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.shareBtn, { marginLeft: 8 }]}
          onPress={() => handleDeleteBill(item)}
        >
          <Icon name="trash-2" size={18} color={Colors.danger} />
        </TouchableOpacity>
      </View>

      <View style={styles.billDivider} />

      <View style={styles.billFooter}>
        <View>
          <Text style={styles.customerLabel}>Customer</Text>
          <Text style={styles.customerName}>{item.customer_name}</Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Total Amount</Text>
          <Text style={styles.billAmount}>₹{item.amount.toFixed(2)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bills & Invoices</Text>
        <TouchableOpacity style={styles.addBtn} onPress={fetchBillsData}>
          <Icon name="refresh-cw" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={bills}
        renderItem={renderBillItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.iconContainer}>
              <Icon name="file-text" size={60} color={Colors.border} />
            </View>
            <Text style={styles.emptyTitle}>No Bills Yet</Text>
            <Text style={styles.emptySubtitle}>
              Every transaction you add will automatically generate a bill here.
            </Text>
          </View>
        }
      />
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
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  billCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  billHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  billMeta: {
    flex: 1,
  },
  billNumber: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text,
  },
  billDate: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  shareBtn: {
    padding: 8,
  },
  billDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
    borderStyle: 'dashed',
    borderRadius: 1,
  },
  billFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  customerLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  customerName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 2,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  billAmount: {
    ...Typography.h3,
    color: Colors.primary,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 20,
  },
  iconContainer: {
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
  emptyTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
