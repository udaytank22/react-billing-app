import React, { useState, useEffect } from 'react';
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
  Modal,
  Image,
} from 'react-native';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useDatabase } from '../../context/DatabaseContext';
import {
  addTransaction,
  getTransactionById,
  updateTransaction,
} from '../../database/dbService';
import { RootStackParamList } from '../../navigation/types';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '../../context/ToastContext';
import { getProducts, Product } from '../../database/dbService';
import { Dropdown } from 'react-native-element-dropdown';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddEntry'>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'AddEntry'>;

interface Props {
  navigation: NavigationProp;
  route: ScreenRouteProp;
}

export const AddEntryScreen: React.FC<Props> = ({ navigation, route }) => {
  const { customerId, transactionId, type: initialType } = route.params;
  const { db } = useDatabase();
  const { showToast } = useToast();
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'credit' | 'debit'>(initialType || 'credit');
  const [description, setDescription] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('');
  const [date, setDate] = useState(new Date().toISOString());
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isFocus, setIsFocus] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  );
  const [paymentMode, setPaymentMode] = useState<
    'cash' | 'upi' | 'none' | 'future'
  >('none');
  const [showQR, setShowQR] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [dueDate, setDueDate] = useState<string | null>(null);

  const isCredit = type === 'credit';

  useEffect(() => {
    if (initialType) {
      setType(initialType);
    }
    loadProducts();
  }, [initialType, db]);

  const loadProducts = async () => {
    if (!db) return;
    try {
      const data = await getProducts(db);
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  useEffect(() => {
    if (transactionId && db) {
      loadTransaction();
    }
  }, [transactionId, db]);

  const loadTransaction = async () => {
    if (!db || !transactionId) return;
    try {
      const tx = await getTransactionById(db, transactionId);
      if (tx) {
        setAmount(tx.amount.toString());
        setType(tx.type);
        setDescription(tx.description || '');
        setItemName(tx.item_name || '');
        setItemQty(tx.item_qty?.toString() || '');
        setSelectedProductId(tx.product_id || null);
        setPaymentMode(tx.payment_mode || 'none');
        setDate(tx.date);
        if (tx.due_date) {
          setDueDate(tx.due_date);
        }
      }
    } catch (error) {
      console.error('Error loading transaction:', error);
    }
  };

  // Auto-calculate amount when product or quantity changes
  useEffect(() => {
    if (selectedProductId && itemQty) {
      const product = products.find(p => p.id === selectedProductId);
      if (product) {
        const qty = parseFloat(itemQty);
        if (!isNaN(qty)) {
          setAmount((qty * product.selling_price).toString());
        }
      }
    }
  }, [selectedProductId, itemQty, isCredit, products]);

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    if (paymentMode === 'future' && !dueDate) {
      showToast('Please select a due date for future payment', 'error');
      return;
    }

    if (selectedProductId) {
      const qty = parseFloat(itemQty);
      if (isNaN(qty) || qty <= 0) {
        showToast('Please enter a valid quantity', 'error');
        return;
      }
    }

    if (!db) return;

    setLoading(true);
    try {
      const txData = {
        customer_id: customerId,
        amount: numAmount,
        type,
        item_name: itemName,
        item_qty: parseFloat(itemQty) || 0,
        product_id: selectedProductId || undefined,
        payment_mode: paymentMode,
        status: (paymentMode !== 'none' && paymentMode !== 'future'
          ? 'paid'
          : 'pending') as 'paid' | 'pending',
        date,
        due_date: (paymentMode === 'future' ? dueDate : undefined) as
          | string
          | undefined,
        description,
      };

      if (transactionId) {
        await updateTransaction(db, transactionId, txData);
        showToast('Entry updated successfully', 'success');
      } else {
        await addTransaction(db, txData);
        showToast('Entry added successfully', 'success');
      }
      navigation.goBack();
    } catch (error) {
      console.error(error);
      showToast('Failed to save entry', 'error');
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
            <Icon name="x" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {transactionId ? 'Edit Entry' : 'New Ledger Entry'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.typeSelector}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.typeBtn,
                !isCredit && styles.debitActive,
                { borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
              ]}
              onPress={() => setType('debit')}
            >
              <Icon
                name="arrow-up-right"
                size={20}
                color={!isCredit ? Colors.white : Colors.danger}
              />
              <Text
                style={[styles.typeBtnText, !isCredit && styles.activeText]}
              >
                YOU GAVE
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.typeBtn,
                isCredit && styles.creditActive,
                { borderTopRightRadius: 16, borderBottomRightRadius: 16 },
              ]}
              onPress={() => setType('credit')}
            >
              <Icon
                name="arrow-down-left"
                size={20}
                color={isCredit ? Colors.white : Colors.success}
              />
              <Text style={[styles.typeBtnText, isCredit && styles.activeText]}>
                YOU GOT
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.amountCard,
              { borderColor: isCredit ? Colors.success : Colors.danger },
            ]}
          >
            <Text style={styles.inputLabel}>Enter Amount</Text>
            <View style={styles.amountInputRow}>
              <Text
                style={[
                  styles.currencySymbol,
                  { color: isCredit ? Colors.success : Colors.danger },
                ]}
              >
                ₹
              </Text>
              <TextInput
                style={[
                  styles.amountInput,
                  { color: isCredit ? Colors.success : Colors.danger },
                ]}
                placeholder="0.00"
                value={amount}
                keyboardType="decimal-pad"
                /* autoFocus={!selectedProductId}
                editable={!selectedProductId} */
                placeholderTextColor={
                  isCredit ? Colors.successLight : Colors.dangerLight
                }
                editable={false}
              />
            </View>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Product / Item Name</Text>
              <Dropdown
                style={[
                  styles.dropdown,
                  isFocus && { borderColor: Colors.primary },
                ]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                inputSearchStyle={styles.inputSearchStyle}
                iconStyle={styles.iconStyle}
                data={products}
                search
                maxHeight={300}
                labelField="name"
                valueField="name"
                placeholder={!isFocus ? 'Select Item' : '...'}
                searchPlaceholder="Search item..."
                value={itemName}
                onFocus={() => setIsFocus(true)}
                onBlur={() => setIsFocus(false)}
                onChange={item => {
                  setItemName(item.name);
                  setSelectedProductId(item.id);
                  setIsFocus(false);
                }}
                renderLeftIcon={() => (
                  <Icon
                    style={styles.dropdownIcon}
                    color={isFocus ? Colors.primary : Colors.textSecondary}
                    name="package"
                    size={20}
                  />
                )}
                renderItem={item => (
                  <View style={styles.dropdownItem}>
                    <View style={styles.dropdownItemContent}>
                      <Icon name="tag" size={14} color={Colors.primary} />
                      <Text style={styles.dropdownItemText}>{item.name}</Text>
                    </View>
                    <Text style={styles.dropdownStockText}>
                      Stock: {item.quantity} {item.unit}
                    </Text>
                  </View>
                )}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Quantity</Text>
              <View style={styles.inputWrapper}>
                <Icon
                  name="layers"
                  size={18}
                  color={Colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Quantity (e.g. 5)"
                  value={itemQty}
                  onChangeText={setItemQty}
                  keyboardType="decimal-pad"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Payment Mode</Text>
              <Dropdown
                style={[
                  styles.dropdown,
                  isFocus && { borderColor: Colors.primary },
                ]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                data={[
                  { label: 'None (Add to Ledger)', value: 'none' },
                  { label: 'Cash Payment', value: 'cash' },
                  { label: 'UPI Payment', value: 'upi' },
                  { label: 'Future Payment', value: 'future' },
                ]}
                labelField="label"
                valueField="value"
                placeholder="Select Payment Mode"
                value={paymentMode}
                onChange={item => {
                  setPaymentMode(item.value as any);
                  if (item.value === 'upi' && !isCredit) {
                    setShowQR(true);
                  }
                  if (item.value === 'future') {
                    setShowDueDatePicker(true);
                  }
                }}
                renderLeftIcon={() => (
                  <Icon
                    style={styles.dropdownIcon}
                    color={Colors.primary}
                    name="credit-card"
                    size={20}
                  />
                )}
              />
            </View>

            {paymentMode === 'future' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Payment Due Date</Text>
                <TouchableOpacity
                  style={styles.datePickerBtn}
                  onPress={() => setShowDueDatePicker(true)}
                >
                  <Icon
                    name="calendar"
                    size={18}
                    color={Colors.primary}
                    style={styles.inputIcon}
                  />
                  <Text style={styles.dateText}>
                    {dueDate
                      ? format(new Date(dueDate), 'EEEE, do MMMM yyyy')
                      : 'Select Due Date'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes / Description</Text>
              <View style={styles.inputWrapper}>
                <Icon
                  name="edit-3"
                  size={18}
                  color={Colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Add details (Optional)"
                  value={description}
                  onChangeText={setDescription}
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date of Entry</Text>
              <TouchableOpacity
                style={styles.datePickerBtn}
                activeOpacity={0.7}
              >
                <Icon
                  name="calendar"
                  size={18}
                  color={Colors.textSecondary}
                  style={styles.inputIcon}
                />
                <Text style={styles.dateText}>
                  {format(new Date(date), 'EEEE, do MMMM yyyy')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Icon name="info" size={16} color={Colors.secondary} />
            <Text style={styles.infoText}>
              This entry will be added to the customer's ledger and update their
              balance immediately.
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.saveBtn,
              loading && styles.disabledBtn,
              { backgroundColor: isCredit ? Colors.success : Colors.danger },
            ]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <Text style={styles.saveBtnText}>PROCESSING...</Text>
            ) : (
              <View style={styles.saveBtnContent}>
                <Icon name="check-circle" size={20} color={Colors.white} />
                <Text style={styles.saveBtnText}>SAVE ENTRY</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>

        <Modal visible={showQR} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.qrCard}>
              <Text style={styles.qrTitle}>Scan to Pay</Text>
              <Text style={styles.qrAmount}>₹{amount}</Text>
              <View style={styles.qrPlaceholder}>
                <Icon name="maximize" size={150} color={Colors.primary} />
                <Text style={styles.qrText}>[ UPI QR CODE ]</Text>
              </View>
              <Text style={styles.qrSubtext}>
                Ask customer to scan and complete payment
              </Text>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => {
                  setShowQR(false);
                  showToast('Payment confirmed via UPI', 'success');
                }}
              >
                <Text style={styles.confirmBtnText}>PAYMENT RECEIVED</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowQR(false);
                  setPaymentMode('none');
                }}
              >
                <Text style={styles.cancelLinkText}>Cancel UPI</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showDueDatePicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Set Due Date</Text>
                <TouchableOpacity onPress={() => setShowDueDatePicker(false)}>
                  <Icon name="x" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubTitle}>Select a timeframe:</Text>

              <View style={styles.dateOptions}>
                {[
                  { label: 'Tomorrow', days: 1 },
                  { label: '3 Days Later', days: 3 },
                  { label: 'Next Week', days: 7 },
                  { label: 'Next Month', days: 30 },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.label}
                    style={styles.dateOptionBtn}
                    onPress={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + opt.days);
                      setDueDate(d.toISOString());
                      setShowDueDatePicker(false);
                    }}
                  >
                    <Text style={styles.dateOptionText}>{opt.label}</Text>
                    <Icon
                      name="chevron-right"
                      size={16}
                      color={Colors.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.customDateSection}>
                <Text style={styles.customLabel}>
                  Or Custom Days from Today:
                </Text>
                <View style={styles.customInputRow}>
                  <TextInput
                    style={styles.customInput}
                    placeholder="e.g. 15"
                    keyboardType="number-pad"
                    onChangeText={val => {
                      const days = parseInt(val);
                      if (!isNaN(days)) {
                        const d = new Date();
                        d.setDate(d.getDate() + days);
                        setDueDate(d.toISOString());
                      }
                    }}
                  />
                  <TouchableOpacity
                    style={styles.confirmDateBtn}
                    onPress={() => setShowDueDatePicker(false)}
                  >
                    <Text style={styles.confirmDateText}>SET</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
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
    paddingBottom: 40,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 18,
    marginBottom: 24,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  debitActive: {
    backgroundColor: Colors.danger,
  },
  creditActive: {
    backgroundColor: Colors.success,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  activeText: {
    color: Colors.white,
  },
  amountCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderStyle: 'solid',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  inputLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySymbol: {
    fontSize: 42,
    fontWeight: '700',
    marginRight: 8,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '900',
    minWidth: 150,
    textAlign: 'center',
    padding: 0,
  },
  formContainer: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
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
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.primaryLight + '40',
    borderRadius: 16,
    marginTop: 20,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    color: Colors.secondary,
    marginLeft: 12,
    flex: 1,
    lineHeight: 18,
    fontWeight: '500',
  },
  saveBtn: {
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  saveBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveBtnText: {
    ...Typography.button,
    color: Colors.white,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    marginLeft: 10,
  },
  dropdown: {
    height: 54,
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dropdownIcon: {
    marginRight: 10,
  },
  labelStyle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  placeholderStyle: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  selectedTextStyle: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '600',
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 14,
    borderRadius: 8,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownItemText: {
    ...Typography.body2,
    color: Colors.text,
    marginLeft: 10,
    fontWeight: '600',
  },
  dropdownStockText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrCard: {
    backgroundColor: Colors.white,
    width: '100%',
    borderRadius: 30,
    padding: 24,
    alignItems: 'center',
  },
  qrTitle: {
    ...Typography.h3,
    fontWeight: '800',
    color: Colors.text,
  },
  qrAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.primary,
    marginVertical: 10,
  },
  qrPlaceholder: {
    width: 220,
    height: 220,
    backgroundColor: Colors.background,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  qrText: {
    ...Typography.caption,
    marginTop: 10,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  qrSubtext: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmBtn: {
    backgroundColor: Colors.success,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  confirmBtnText: {
    ...Typography.button,
    color: Colors.white,
    fontWeight: '800',
  },
  cancelBtn: {
    marginTop: 16,
  },
  cancelLinkText: {
    color: Colors.danger,
    fontWeight: '700',
  },
  datePickerCard: {
    backgroundColor: Colors.white,
    width: '90%',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    ...Typography.h3,
    fontWeight: '800',
    color: Colors.text,
  },
  modalSubTitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  dateOptions: {
    marginBottom: 20,
  },
  dateOptionBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateOptionText: {
    ...Typography.body2,
    fontWeight: '600',
    color: Colors.text,
  },
  customDateSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
  },
  customLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginBottom: 8,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customInput: {
    flex: 1,
    height: 48,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginRight: 10,
  },
  confirmDateBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmDateText: {
    ...Typography.button,
    color: Colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
});
