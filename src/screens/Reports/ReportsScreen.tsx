import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDatabase } from '../../context/DatabaseContext';
import {
  getCustomers,
  getTransactions,
  getBusinessStats,
  Transaction,
  Customer,
} from '../../database/dbService';
import { RootStackParamList } from '../../navigation/types';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { exportToCSV } from '../../utils/export';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Reports'>;

interface Props {
  navigation: NavigationProp;
}

export const ReportsScreen: React.FC<Props> = ({ navigation }) => {
  const { db } = useDatabase();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState({
    totalReceive: 0,
    totalPay: 0,
    netBalance: 0,
    totalProfit: 0,
    totalSold: 0,
    todayProfit: 0,
    todaySold: 0,
  });

  const fetchData = useCallback(async () => {
    if (db) {
      const data = await getCustomers(db);
      setCustomers(data);

      let receive = 0;
      let pay = 0;
      data.forEach(c => {
        const balance = c.balance || 0;
        if (balance > 0) receive += balance;
        else if (balance < 0) pay += Math.abs(balance);
      });

      const businessStats = await getBusinessStats(db);
      setStats({
        totalReceive: receive,
        totalPay: pay,
        netBalance: receive - pay,
        totalProfit: businessStats.totalProfit,
        totalSold: businessStats.totalSold,
        todayProfit: businessStats.todayProfit,
        todaySold: businessStats.todaySold,
      });
    }
  }, [db]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExportCSV = async () => {
    try {
      const allTransactions: Transaction[] = [];
      for (const customer of customers) {
        if (db) {
          const txs = await getTransactions(db, customer.id);
          allTransactions.push(...txs);
        }
      }
      await exportToCSV(customers, allTransactions);
    } catch (error) {
      Alert.alert('Export Failed', 'Unable to generate CSV report.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business Reports</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Financial Summary</Text>

          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>You will receive</Text>
              <Text style={[styles.statValue, { color: Colors.success }]}>
                ₹{stats.totalReceive.toFixed(2)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>You will pay</Text>
              <Text style={[styles.statValue, { color: Colors.danger }]}>
                ₹{stats.totalPay.toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.netBalanceContainer}>
            <Text style={styles.netLabel}>Cash Balance</Text>
            <Text
              style={[
                styles.netValue,
                {
                  color: stats.netBalance >= 0 ? Colors.success : Colors.danger,
                },
              ]}
            >
              ₹{Math.abs(stats.netBalance).toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.performanceCard}>
          <Text style={styles.cardTitle}>Daily Performance (Today)</Text>
          <View style={styles.statRow}>
            <View style={styles.performanceStat}>
              <View
                style={[styles.perfIconBox, { backgroundColor: '#E1F5FE' }]}
              >
                <Icon name="shopping-bag" size={18} color="#0288D1" />
              </View>
              <View>
                <Text style={styles.statLabel}>Items Sold Today</Text>
                <Text style={styles.perfValue}>
                  {stats.todaySold.toFixed(0)}
                </Text>
              </View>
            </View>

            <View style={styles.performanceStat}>
              <View
                style={[styles.perfIconBox, { backgroundColor: '#F1F8E9' }]}
              >
                <Icon name="arrow-up-right" size={18} color="#558B2F" />
              </View>
              <View>
                <Text style={styles.statLabel}>Today's Profit</Text>
                <Text style={[styles.perfValue, { color: '#558B2F' }]}>
                  ₹
                  {stats.todayProfit.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.performanceCard}>
          <Text style={styles.cardTitle}>Total Business Sales</Text>

          <View style={styles.statRow}>
            <View style={styles.performanceStat}>
              <View style={styles.perfIconBox}>
                <Icon name="package" size={18} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.statLabel}>Total Items Sold</Text>
                <Text style={styles.perfValue}>
                  {stats.totalSold.toFixed(0)}
                </Text>
              </View>
            </View>

            <View style={styles.performanceStat}>
              <View
                style={[
                  styles.perfIconBox,
                  { backgroundColor: Colors.successLight },
                ]}
              >
                <Icon name="trending-up" size={18} color={Colors.success} />
              </View>
              <View>
                <Text style={styles.statLabel}>Total Profit Gain</Text>
                <Text style={[styles.perfValue, { color: Colors.success }]}>
                  ₹
                  {stats.totalProfit.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Customer-wise Summary</Text>
          <TouchableOpacity onPress={handleExportCSV}>
            <Text style={styles.exportText}>Export XL</Text>
          </TouchableOpacity>
        </View>

        {customers.map(customer => (
          <View key={customer.id} style={styles.customerRow}>
            <Text style={styles.customerName}>{customer.name}</Text>
            <Text
              style={[
                styles.customerBalance,
                {
                  color:
                    (customer.balance || 0) >= 0
                      ? Colors.success
                      : Colors.danger,
                },
              ]}
            >
              ₹{Math.abs(customer.balance || 0).toFixed(2)}
            </Text>
          </View>
        ))}

        {customers.length === 0 && (
          <Text style={styles.emptyText}>No data available for reports</Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.reportButton}
          onPress={() =>
            Alert.alert('Coming Soon', 'Full PDF report will be ready soon!')
          }
        >
          <Text style={styles.reportButtonText}>Download Business PDF</Text>
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
  backIcon: {
    fontSize: 24,
    color: Colors.text,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  content: {
    padding: 16,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  cardTitle: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    ...Typography.h3,
  },
  performanceCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  performanceStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  perfIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  perfValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 2,
  },
  netLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  netValue: {
    ...Typography.h1,
    fontSize: 28,
    marginTop: 4,
  },
  netBalanceContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text,
  },
  exportText: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '600',
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  customerName: {
    ...Typography.body,
    color: Colors.text,
  },
  customerBalance: {
    ...Typography.body,
    fontWeight: '600',
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
  footer: {
    padding: 16,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  reportButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  reportButtonText: {
    ...Typography.button,
    color: Colors.white,
  },
});
