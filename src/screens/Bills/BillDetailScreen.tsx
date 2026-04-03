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
  getBillById,
  getTransactionById,
  deleteTransaction,
} from '../../database/dbService';
import { Bill, Transaction } from '../../database/database';
import { format } from 'date-fns';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import * as RNHTMLtoPDF from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import { useToast } from '../../context/ToastContext';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'BillDetail'
>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'BillDetail'>;

interface Props {
  navigation: NavigationProp;
  route: ScreenRouteProp;
}

export const BillDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { billId } = route.params;
  const { db } = useDatabase();
  const { showToast } = useToast();
  const [bill, setBill] = useState<Bill | null>(null);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (db) {
      setLoading(true);
      const billData = await getBillById(db, billId);
      if (billData) {
        setBill(billData);
        const txData = await getTransactionById(db, billData.transaction_id);
        setTransaction(txData);
      }
      setLoading(false);
    }
  }, [db, billId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const generatePDFInvoice = async () => {
    if (!bill || !transaction) return;

    setPdfLoading(true);
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                margin: 0;
                padding: 40px;
                color: #1e293b;
                line-height: 1.5;
              }
              .invoice-container {
                max-width: 800px;
                margin: auto;
                background: #fff;
              }
              .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 40px;
                border-bottom: 3px solid #2563EB;
                padding-bottom: 25px;
              }
              .brand-info h1 {
                margin: 0;
                color: #2563EB;
                font-size: 36px;
                font-weight: 900;
                letter-spacing: -1px;
              }
              .brand-info p {
                margin: 4px 0 0;
                color: #64748b;
                font-size: 13px;
                font-weight: 500;
              }
              .invoice-meta {
                text-align: right;
              }
              .invoice-meta h2 {
                margin: 0;
                color: #0f172a;
                font-size: 28px;
                text-transform: uppercase;
                font-weight: 800;
                letter-spacing: 1px;
              }
              .invoice-meta .bill-no {
                margin: 8px 0 0;
                font-weight: 700;
                color: #2563EB;
                font-size: 18px;
              }
              .billing-info {
                display: flex;
                flex-direction: row;
                margin-bottom: 50px;
                gap: 60px;
              }
              .billing-section {
                flex: 1;
              }
              .billing-section h3 {
                font-size: 11px;
                text-transform: uppercase;
                color: #94a3b8;
                margin-bottom: 12px;
                letter-spacing: 1.5px;
                font-weight: 700;
              }
              .billing-details {
                font-size: 14px;
              }
              .billing-details strong {
                display: block;
                font-size: 20px;
                margin-bottom: 6px;
                color: #0f172a;
                font-weight: 700;
              }
              .billing-details p {
                margin: 0;
                color: #475569;
              }
              .items-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 40px;
              }
              .items-table th {
                background: #2563EB;
                text-align: left;
                padding: 14px 18px;
                font-size: 11px;
                text-transform: uppercase;
                color: #ffffff;
                font-weight: 700;
                letter-spacing: 1px;
              }
              .items-table td {
                padding: 20px 18px;
                border-bottom: 1px solid #f1f5f9;
                vertical-align: top;
              }
              .item-description strong {
                display: block;
                font-size: 16px;
                color: #0f172a;
                margin-bottom: 4px;
              }
              .item-description span {
                font-size: 13px;
                color: #64748b;
              }
              .summary-container {
                display: flex;
                justify-content: flex-end;
                margin-top: 20px;
              }
              .summary-box {
                width: 280px;
                background: #f8fafc;
                padding: 20px;
                border-radius: 12px;
              }
              .summary-row {
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                color: #475569;
                font-size: 14px;
              }
              .summary-row.total {
                border-top: 2px solid #e2e8f0;
                margin-top: 10px;
                padding-top: 15px;
                font-size: 22px;
                font-weight: 900;
                color: #2563EB;
              }
              .footer {
                margin-top: 80px;
                padding-top: 30px;
                border-top: 1px solid #e2e8f0;
                text-align: center;
              }
              .footer p {
                font-size: 11px;
                color: #94a3b8;
                margin: 6px 0;
                letter-spacing: 0.5px;
              }
              .status-badge {
                display: inline-block;
                padding: 6px 16px;
                border-radius: 8px;
                font-size: 11px;
                font-weight: 800;
                text-transform: uppercase;
                margin-top: 12px;
                letter-spacing: 1px;
              }
              .status-paid { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
            </style>
          </head>
          <body>
            <div class="invoice-container">
              <div class="header">
                <div class="brand-info">
                  <h1>Simple Ledger</h1>
                  <p>Your Digital Business Companion</p>
                  <p style="margin-top: 15px;">Phone: +91 90000 00000</p>
                  <p>Email: hello@simpleledger.app</p>
                </div>
                <div class="invoice-meta">
                  <h2>Tax Invoice</h2>
                  <p class="bill-no">#${bill.bill_number}</p>
                  <div class="status-badge status-paid">Payment Received</div>
                </div>
              </div>

              <div class="billing-info">
                <div class="billing-section">
                  <h3>Bill To</h3>
                  <div class="billing-details">
                    <strong style="word-break: break-all;">${
                      bill.customer_name
                    }</strong>
                    <p>Customer ID: #${transaction.customer_id}</p>
                  </div>
                </div>
                <div class="billing-section" style="text-align: center;">
                  <h3>Bill Type</h3>
                  <div class="status-badge" style="background: ${
                    transaction.type === 'credit' ? '#d1fae5' : '#dbeafe'
                  }; color: ${
        transaction.type === 'credit' ? '#065f46' : '#1e40af'
      }; border: 1px solid ${
        transaction.type === 'credit' ? '#a7f3d0' : '#bfdbfe'
      }; margin: 0;">
                    ${
                      transaction.type === 'credit'
                        ? 'Credit Entry'
                        : 'Sale Bill'
                    }
                  </div>
                </div>
                <div class="billing-section" style="text-align: right;">
                  <h3>Invoice Details</h3>
                  <div class="billing-details">
                    <p>Date: ${format(new Date(bill.date), 'dd MMM yyyy')}</p>
                    <p>Time: ${format(new Date(bill.date), 'hh:mm a')}</p>
                  </div>
                </div>
              </div>

              <table class="items-table">
                <thead>
                  <tr>
                    <th style="width: 60%">Description</th>
                    <th style="text-align: center; width: 10%">Qty</th>
                    <th style="text-align: right; width: 30%">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="item-description">
                      <strong>${
                        transaction.item_name ||
                        (transaction.type === 'credit'
                          ? 'Credit Received'
                          : 'Debit Entry')
                      }</strong>
                      ${
                        transaction.description
                          ? `<span>${transaction.description}</span>`
                          : ''
                      }
                    </td>
                    <td style="text-align: center; font-weight: 600;">${
                      transaction.item_qty || 1
                    }</td>
                    <td style="text-align: right; font-weight: 700; color: #0f172a;">₹${bill.amount.toFixed(
                      2,
                    )}</td>
                  </tr>
                </tbody>
              </table>

              <div class="summary-container">
                <div class="summary-box">
                  <div class="summary-row">
                    <span>Subtotal</span>
                    <span style="font-weight: 600;">₹${bill.amount.toFixed(
                      2,
                    )}</span>
                  </div>
                  <div class="summary-row">
                    <span>Tax (0%)</span>
                    <span style="font-weight: 600;">₹0.00</span>
                  </div>
                  <div class="summary-row total">
                    <span>Grand Total</span>
                    <span>₹${bill.amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div style="margin-top: 60px; padding: 20px; background: #fff; border: 1px dashed #cbd5e1; border-radius: 8px;">
                <h4 style="font-size: 12px; text-transform: uppercase; margin: 0 0 10px; color: #64748b; letter-spacing: 1px;">Terms & Conditions</h4>
                <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.6;">
                  1. This is a computer-generated document and does not require a physical signature.<br>
                  2. All disputes are subject to local jurisdiction only.<br>
                  3. Please retain this invoice for your financial records.
                </p>
              </div>

              <div class="footer">
                <p>Simple Ledger App - The Best Way to Manage Your Business Ledger</p>
                <p>Empowering Small Businesses with Privacy-First Solutions</p>
                <p>&copy; ${new Date().getFullYear()} Simple Ledger. All Rights Reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const options = {
        html: htmlContent,
        fileName: `Invoice_${bill.bill_number}`,
        directory: 'Documents',
        base64: true,
      };

      // @ts-ignore
      const file: any = await RNHTMLtoPDF.convert(options);

      if (file.filePath || file.base64) {
        const shareOptions = {
          title: 'Invoice PDF',
          message: `Invoice #${bill.bill_number} for ${bill.customer_name}`,
          url:
            Platform.OS === 'android'
              ? `file://${file.filePath}`
              : file.filePath,
          type: 'application/pdf',
        };

        await Share.open(shareOptions);
        showToast('Invoice PDF generated successfully', 'success');
      }
    } catch (error) {
      console.error('PDF Generation Error:', error);
      showToast('Failed to generate PDF', 'error');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleEditBill = () => {
    if (!bill || !transaction) return;
    navigation.navigate('AddEntry', {
      customerId: transaction.customer_id,
      transactionId: transaction.id,
      type: transaction.type,
    });
  };

  const handleDeleteBill = () => {
    if (!bill || !transaction) return;

    Alert.alert(
      'Delete Invoice',
      'Are you sure you want to delete this invoice? This will also remove the corresponding transaction from the ledger.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (db) {
              try {
                // Deleting the transaction will automatically delete the bill due to ON DELETE CASCADE
                await deleteTransaction(db, bill.transaction_id);
                showToast('Invoice and transaction deleted', 'success');
                navigation.goBack();
              } catch (error) {
                console.error(error);
                Alert.alert('Error', 'Failed to delete invoice');
              }
            }
          },
        },
      ],
    );
  };

  if (loading || !bill) {
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
        <Text style={styles.headerTitle}>Invoice Details</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={[styles.downloadBtn, { marginRight: 10 }]}
            onPress={handleEditBill}
          >
            <Icon name="edit-2" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.downloadBtn, { marginRight: 10 }]}
            onPress={generatePDFInvoice}
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
            onPress={handleDeleteBill}
          >
            <Icon name="trash-2" size={20} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.invoiceCard}>
          <View style={styles.invoiceHeader}>
            <View>
              <Text style={styles.brandName}>Simple Ledger</Text>
              <Text style={styles.invoiceLabel}>TAX INVOICE</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={styles.logoContainer}>
                <Icon name="file-text" size={24} color={Colors.white} />
              </View>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Payment Received</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaContainer}>
            <View style={styles.metaRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>Invoice Info</Text>
                <Text
                  style={styles.value}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  #{bill.bill_number}
                </Text>
                <Text style={styles.subValue}>
                  {format(new Date(bill.date), 'dd MMM yyyy, hh:mm a')}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', flex: 1 }}>
                <Text style={styles.label}>Bill Type</Text>
                <View
                  style={[
                    styles.typeBadge,
                    {
                      backgroundColor:
                        transaction?.type === 'credit'
                          ? Colors.successLight
                          : Colors.primaryLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeBadgeText,
                      {
                        color:
                          transaction?.type === 'credit'
                            ? Colors.success
                            : Colors.primary,
                      },
                    ]}
                  >
                    {transaction?.type === 'credit'
                      ? 'Credit Entry'
                      : 'Sale Bill'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.metaRow, { marginTop: 20, marginBottom: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Bill To</Text>
                <Text style={styles.value} numberOfLines={2}>
                  {bill.customer_name}
                </Text>
                <Text style={styles.subValue}>
                  Customer ID: #{transaction?.customer_id}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.itemTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>Items</Text>
              <Text
                style={[
                  styles.tableHeaderText,
                  { flex: 1, textAlign: 'center' },
                ]}
              >
                Qty
              </Text>
              <Text
                style={[
                  styles.tableHeaderText,
                  { flex: 1.5, textAlign: 'right' },
                ]}
              >
                Amount
              </Text>
            </View>

            <View style={styles.tableRow}>
              <View style={{ flex: 2 }}>
                <Text style={styles.itemName}>
                  {transaction?.item_name ||
                    (transaction?.type === 'credit'
                      ? 'Credit Received'
                      : 'Debit Entry')}
                </Text>
                {transaction?.description ? (
                  <Text style={styles.itemDesc}>{transaction.description}</Text>
                ) : null}
              </View>
              <Text style={[styles.itemQty, { flex: 1 }]}>
                {transaction?.item_qty || 1}
              </Text>
              <Text style={[styles.itemAmount, { flex: 1.5 }]}>
                ₹{bill.amount.toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.summarySection}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₹{bill.amount.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax (0%)</Text>
              <Text style={styles.summaryValue}>₹0.00</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Grand Total</Text>
              <Text style={styles.totalValue}>₹{bill.amount.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.footerInfo}>
            <Icon name="info" size={12} color={Colors.textSecondary} />
            <Text style={styles.footerText}>
              This is a computer generated invoice and does not require a
              signature.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.mainDownloadBtn}
          onPress={generatePDFInvoice}
        >
          <Icon name="file-text" size={20} color={Colors.white} />
          <Text style={styles.mainDownloadBtnText}>Download PDF Invoice</Text>
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
  invoiceCard: {
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
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandName: {
    ...Typography.h3,
    color: Colors.primary,
    fontWeight: '800',
  },
  invoiceLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 2,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.success + '20',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
    marginRight: 6,
  },
  statusText: {
    ...Typography.caption,
    color: Colors.success,
    fontWeight: '800',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 20,
  },
  metaContainer: {
    marginBottom: 30,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  typeBadgeText: {
    ...Typography.caption,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  label: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  subValue: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
    fontSize: 12,
  },
  itemTable: {
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: Colors.background,
  },
  tableHeaderText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
    alignItems: 'center',
  },
  itemName: {
    ...Typography.bodySmall,
    color: Colors.text,
    fontWeight: '700',
  },
  itemDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  itemQty: {
    ...Typography.bodySmall,
    color: Colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  itemAmount: {
    ...Typography.bodySmall,
    color: Colors.text,
    fontWeight: '800',
    textAlign: 'right',
  },
  summarySection: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  summaryValue: {
    ...Typography.bodySmall,
    color: Colors.text,
    fontWeight: '700',
  },
  totalRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginBottom: 0,
  },
  totalLabel: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '800',
  },
  totalValue: {
    ...Typography.h3,
    color: Colors.primary,
    fontWeight: '900',
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  footerText: {
    fontSize: 10,
    color: Colors.textSecondary,
    flex: 1,
    fontStyle: 'italic',
  },
  mainDownloadBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    gap: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  mainDownloadBtnText: {
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
