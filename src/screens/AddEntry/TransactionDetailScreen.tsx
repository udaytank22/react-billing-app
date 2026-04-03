import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '../../context/DatabaseContext';
import {
  getTransactionById,
  getCustomerById,
  deleteTransaction,
} from '../../database/dbService';
import { Transaction, Customer } from '../../database/database';
import { format } from 'date-fns';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { generatePDF } from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import { useToast } from '../../context/ToastContext';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'TransactionDetail'
>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'TransactionDetail'>;

interface Props {
  navigation: NavigationProp;
  route: ScreenRouteProp;
}

export const TransactionDetailScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const { transactionId } = route.params;
  const { db } = useDatabase();
  const { showToast } = useToast();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (db) {
      setLoading(true);
      const txData = await getTransactionById(db, transactionId);
      if (txData) {
        setTransaction(txData);
        const customerData = await getCustomerById(db, txData.customer_id);
        setCustomer(customerData);
      }
      setLoading(false);
    }
  }, [db, transactionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const generatePDF = async () => {
    if (!transaction || !customer) return;

    setPdfLoading(true);
    try {
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica'; padding: 20px; color: #333; }
              .header { text-align: center; border-bottom: 2px solid #6200EE; padding-bottom: 20px; }
              .invoice-title { font-size: 28px; font-weight: bold; color: #6200EE; margin: 0; }
              .invoice-number { font-size: 14px; color: #666; margin-top: 5px; }
              .section { margin-top: 30px; }
              .section-title { font-size: 12px; font-weight: bold; color: #888; text-transform: uppercase; letter-spacing: 1px; }
              .detail-row { display: flex; justify-content: space-between; margin-top: 10px; border-bottom: 1px solid #EEE; padding-bottom: 5px; }
              .label { font-size: 14px; color: #555; }
              .value { font-size: 14px; font-weight: bold; }
              .item-table { width: 100%; margin-top: 30px; border-collapse: collapse; }
              .item-table th { text-align: left; border-bottom: 2px solid #EEE; padding: 10px 0; font-size: 12px; color: #888; }
              .item-table td { padding: 15px 0; border-bottom: 1px solid #F5F5F5; }
              .total-section { margin-top: 40px; text-align: right; }
              .total-line { display: flex; justify-content: flex-end; align-items: center; }
              .total-label { font-size: 16px; margin-right: 20px; color: #666; }
              .total-value { font-size: 24px; font-weight: bold; color: #6200EE; }
              .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #EEE; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 class="invoice-title">TRANSACTION RECEIPT</h1>
              <div class="invoice-number">Receipt #${transaction.id}</div>
            </div>

            <div class="section">
              <div class="section-title">Customer</div>
              <div class="detail-row">
                <div class="value">${customer.name}</div>
              </div>
            </div>

            <div class="section">
              <div class="detail-row">
                <div class="label">Date</div>
                <div class="value">${format(
                  new Date(transaction.date),
                  'dd MMM yyyy, hh:mm a',
                )}</div>
              </div>
              <div class="detail-row">
                <div class="label">Status</div>
                <div class="value" style="color: ${
                  transaction.type === 'credit' ? '#4CAF50' : '#F44336'
                }">
                  ${transaction.type.toUpperCase()}
                </div>
              </div>
            </div>

            <table class="item-table">
              <thead>
                <tr>
                  <th>DESCRIPTION</th>
                  <th style="text-align: center;">QTY</th>
                  <th style="text-align: right;">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${
                    transaction.item_name ||
                    (transaction.type === 'credit'
                      ? 'Credit Received'
                      : 'Payment Given')
                  }</td>
                  <td style="text-align: center;">${
                    transaction.item_qty || 1
                  }</td>
                  <td style="text-align: right;">₹${transaction.amount.toFixed(
                    2,
                  )}</td>
                </tr>
              </tbody>
            </table>

            <div class="total-section">
              <div class="total-line">
                <span class="total-label">Total Amount</span>
                <span class="total-value">₹${transaction.amount.toFixed(
                  2,
                )}</span>
              </div>
            </div>

            <div class="footer">
              This is a digital receipt generated by Simple Ledger App
            </div>
          </body>
        </html>
      `;

      const options = {
        html: htmlContent,
        fileName: `Receipt_${transaction.id}`,
        directory: 'Documents',
      };

      // @ts-ignore
      const file: any = await generatePDF(options);
      if (file.filePath) {
        await Share.open({
          url: `file://${file.filePath}`,
          type: 'application/pdf',
          title: 'Download Receipt',
        });
        showToast('Receipt PDF generated successfully', 'success');
      }
    } catch (error) {
      console.error(error);
      showToast('Failed to generate PDF', 'error');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleEdit = () => {
    if (!transaction) return;
    navigation.navigate('AddEntry', {
      customerId: transaction.customer_id,
      transactionId: transaction.id,
      type: transaction.type,
    });
  };

  const handleDelete = () => {
    if (!transaction) return;

    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this ledger entry? This action cannot be undone and will affect the customer balance.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (db) {
              try {
                await deleteTransaction(db, transactionId);
                showToast('Entry deleted successfully', 'success');
                navigation.goBack();
              } catch (error) {
                console.error(error);
                Alert.alert('Error', 'Failed to delete entry');
              }
            }
          },
        },
      ],
    );
  };

  if (loading || !transaction) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Entry Details</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={[styles.downloadBtn, { marginRight: 10 }]}
            onPress={handleEdit}
          >
            <Icon name="edit-2" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.downloadBtn, { marginRight: 10 }]}
            onPress={generatePDF}
            disabled={pdfLoading}
          >
            {pdfLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Icon name="download" size={20} color={Colors.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.downloadBtn,
              { backgroundColor: Colors.dangerLight },
            ]}
            onPress={handleDelete}
          >
            <Icon name="trash-2" size={20} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.receiptCard}>
          <View style={styles.receiptHeader}>
            <View
              style={[
                styles.typeIcon,
                {
                  backgroundColor:
                    transaction.type === 'credit'
                      ? Colors.successLight
                      : Colors.dangerLight,
                },
              ]}
            >
              <Icon
                name={
                  transaction.type === 'credit'
                    ? 'arrow-down-left'
                    : 'arrow-up-right'
                }
                size={30}
                color={
                  transaction.type === 'credit' ? Colors.success : Colors.danger
                }
              />
            </View>
            <View style={styles.typeInfo}>
              <Text style={styles.receiptLabel}>TRANSACTION RECEIPT</Text>
              <Text
                style={[
                  styles.typeValue,
                  {
                    color:
                      transaction.type === 'credit'
                        ? Colors.success
                        : Colors.danger,
                  },
                ]}
              >
                {transaction.type === 'credit' ? 'Money Got' : 'Money Gave'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <View>
              <Text style={styles.label}>Receipt ID</Text>
              <Text style={styles.value}>#{transaction.id}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.label}>Date & Time</Text>
              <Text style={styles.value}>
                {format(new Date(transaction.date), 'dd MMM yyyy, hh:mm a')}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Customer Details</Text>
            <View style={styles.customerBox}>
              <View style={styles.customerIcon}>
                <Icon name="user" size={16} color={Colors.primary} />
              </View>
              <Text style={styles.customerName}>{customer?.name}</Text>
            </View>
          </View>

          <View style={styles.itemTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>
                Entry Description
              </Text>
              <Text
                style={[
                  styles.tableHeaderText,
                  { flex: 1, textAlign: 'right' },
                ]}
              >
                Amount
              </Text>
            </View>

            <View style={styles.tableRow}>
              <View style={{ flex: 2 }}>
                <Text style={styles.itemName}>
                  {transaction.item_name ||
                    (transaction.type === 'credit'
                      ? 'Credit Received'
                      : 'Debit Entry')}
                </Text>
                {transaction.item_qty !== undefined &&
                  transaction.item_qty > 0 && (
                    <View style={styles.itemDetailInfo}>
                      <Text style={styles.itemSubText}>
                        Quantity: {transaction.item_qty}
                      </Text>
                      <Text style={styles.itemSubText}>
                        | Rate: ₹
                        {(transaction.amount / transaction.item_qty).toFixed(1)}
                      </Text>
                      {transaction.type === 'debit' &&
                        transaction.product_purchase_price !== undefined && (
                          <Text style={styles.itemProfitText}>
                            | Profit: ₹
                            {(
                              transaction.amount -
                              transaction.product_purchase_price *
                                transaction.item_qty
                            ).toFixed(1)}
                          </Text>
                        )}
                    </View>
                  )}
                {transaction.description ? (
                  <Text style={styles.itemDesc}>{transaction.description}</Text>
                ) : null}
              </View>
              <Text style={[styles.itemAmount, { flex: 1 }]}>
                ₹{transaction.amount.toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>Grand Total</Text>
            <Text
              style={[
                styles.totalValue,
                {
                  color:
                    transaction.type === 'credit'
                      ? Colors.success
                      : Colors.danger,
                },
              ]}
            >
              ₹{transaction.amount.toFixed(2)}
            </Text>
          </View>

          <View style={styles.footerNote}>
            <Text style={styles.footerText}>
              Securely recorded on your local database.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.mainActionBtn,
            {
              backgroundColor:
                transaction.type === 'credit' ? Colors.success : Colors.danger,
            },
          ]}
          onPress={generatePDF}
        >
          <Icon name="file-text" size={20} color={Colors.white} />
          <Text style={styles.mainActionBtnText}>
            Share Digital Receipt (PDF)
          </Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.text,
    fontWeight: '700',
  },
  downloadBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  receiptCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  typeIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  typeInfo: {
    flex: 1,
  },
  receiptLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  typeValue: {
    ...Typography.h3,
    fontWeight: '900',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 20,
    borderStyle: 'dashed',
    borderRadius: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  label: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  value: {
    ...Typography.bodySmall,
    color: Colors.text,
    fontWeight: '700',
  },
  section: {
    marginBottom: 25,
  },
  customerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  customerIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  customerName: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text,
  },
  itemTable: {
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableHeaderText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  itemName: {
    ...Typography.bodySmall,
    color: Colors.text,
    fontWeight: '700',
  },
  itemSubText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  itemDetailInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  itemProfitText: {
    fontSize: 11,
    color: Colors.success,
    fontWeight: '700',
  },
  itemDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  itemAmount: {
    ...Typography.bodySmall,
    color: Colors.text,
    fontWeight: '800',
    textAlign: 'right',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 20,
    borderRadius: 16,
  },
  totalLabel: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '800',
  },
  totalValue: {
    ...Typography.h2,
    fontWeight: '900',
  },
  footerNote: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  mainActionBtn: {
    flexDirection: 'row',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    gap: 12,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  mainActionBtnText: {
    ...Typography.button,
    color: Colors.white,
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
