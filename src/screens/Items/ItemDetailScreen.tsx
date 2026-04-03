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
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '../../context/DatabaseContext';
import {
  getProductById,
  getStockMovements,
  addStockMovement,
} from '../../database/dbService';
import { Product, StockMovement } from '../../database/database';
import { format } from 'date-fns';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { useToast } from '../../context/ToastContext';
import { useIsFocused } from '@react-navigation/native';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ItemDetail'
>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'ItemDetail'>;

interface Props {
  navigation: NavigationProp;
  route: ScreenRouteProp;
}

export const ItemDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { productId } = route.params;
  const { db } = useDatabase();
  const { showToast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustmentModalVisible, setAdjustmentModalVisible] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'in' | 'out'>('in');
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [adjustmentPrice, setAdjustmentPrice] = useState('');
  const isFocused = useIsFocused();

  const fetchData = useCallback(async () => {
    if (db) {
      setLoading(true);
      try {
        const data = await getProductById(db, productId);
        const moves = await getStockMovements(db, productId);
        setProduct(data);
        setMovements(moves);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [db, productId]);

  useEffect(() => {
    if (isFocused) {
      fetchData();
    }
  }, [fetchData, isFocused]);

  const handleStockAdjustment = async () => {
    const qty = parseFloat(adjustmentQty);
    if (isNaN(qty) || qty <= 0) {
      showToast('Please enter a valid quantity', 'error');
      return;
    }

    if (!db || !product) return;

    try {
      await addStockMovement(db, {
        product_id: productId,
        quantity: qty,
        type: adjustmentType,
        price:
          parseFloat(adjustmentPrice) ||
          (adjustmentType === 'in'
            ? product.purchase_price
            : product.selling_price),
        date: new Date().toISOString(),
      });

      showToast(
        `Stock ${adjustmentType === 'in' ? 'added' : 'reduced'} successfully`,
        'success',
      );
      setAdjustmentModalVisible(false);
      setAdjustmentQty('');
      setAdjustmentPrice('');
      fetchData();
    } catch (error) {
      console.error(error);
      showToast('Failed to adjust stock', 'error');
    }
  };

  if (loading || !product) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const isLowStock = product.quantity < 5;

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
        <Text style={styles.headerTitle}>Product Details</Text>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('AddItem', { productId })}
        >
          <Icon name="edit-2" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.productHero}>
          <View
            style={[
              styles.iconLarge,
              isLowStock && { backgroundColor: Colors.dangerLight },
            ]}
          >
            <Icon
              name="package"
              size={50}
              color={isLowStock ? Colors.danger : Colors.primary}
            />
          </View>
          <Text style={styles.productNameLarge}>{product.name}</Text>
          <View
            style={[
              styles.stockBadge,
              isLowStock ? styles.lowStockBadge : styles.inStockBadge,
            ]}
          >
            <Text
              style={[
                styles.stockBadgeText,
                isLowStock ? styles.lowStockText : styles.inStockText,
              ]}
            >
              {isLowStock ? 'LOW STOCK' : 'IN STOCK'}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Current Stock</Text>
            <Text
              style={[
                styles.statValue,
                product.quantity <= 10 && { color: Colors.danger },
              ]}
            >
              {product.quantity}
            </Text>
            <Text style={styles.statUnit}>{product.unit}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Sales</Text>
            <Text style={[styles.statValue, { color: Colors.primary }]}>
              ₹
              {movements
                .filter(m => m.type === 'out')
                .reduce((acc, m) => acc + m.price * m.quantity, 0)
                .toLocaleString('en-IN')}
            </Text>
            <Text style={styles.statUnit}>Gross Revenue</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Profit</Text>
            <Text
              style={[
                styles.statValue,
                {
                  color:
                    movements
                      .filter(m => m.type === 'out')
                      .reduce(
                        (acc, m) =>
                          acc + (m.price - product.purchase_price) * m.quantity,
                        0,
                      ) >= 0
                      ? Colors.success
                      : Colors.danger,
                },
              ]}
            >
              ₹
              {Math.abs(
                movements
                  .filter(m => m.type === 'out')
                  .reduce(
                    (acc, m) =>
                      acc + (m.price - product.purchase_price) * m.quantity,
                    0,
                  ),
              ).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.statUnit}>Net Earnings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Selling Price</Text>
            <Text style={[styles.statValue, { color: Colors.secondary }]}>
              ₹{product.selling_price.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.statUnit}>Rate per {product.unit}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: Colors.success }]}
            onPress={() => {
              setAdjustmentType('in');
              setAdjustmentModalVisible(true);
            }}
          >
            <Icon name="plus-circle" size={20} color={Colors.success} />
            <Text style={[styles.actionBtnText, { color: Colors.success }]}>
              Stock In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: Colors.danger }]}
            onPress={() => {
              setAdjustmentType('out');
              setAdjustmentModalVisible(true);
            }}
          >
            <Icon name="minus-circle" size={20} color={Colors.danger} />
            <Text style={[styles.actionBtnText, { color: Colors.danger }]}>
              Stock Out
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Movement History</Text>
          {movements.length > 0 ? (
            <View style={styles.historyCard}>
              {movements.slice(0, 10).map((move, index) => (
                <View key={move.id}>
                  <View style={styles.historyRow}>
                    <View
                      style={[
                        styles.historyIcon,
                        {
                          backgroundColor:
                            move.type === 'in'
                              ? Colors.successLight
                              : Colors.dangerLight,
                        },
                      ]}
                    >
                      <Icon
                        name={
                          move.type === 'in'
                            ? 'arrow-down-left'
                            : 'arrow-up-right'
                        }
                        size={14}
                        color={
                          move.type === 'in' ? Colors.success : Colors.danger
                        }
                      />
                    </View>
                    <View style={styles.historyTexts}>
                      <Text style={styles.historyType}>
                        Stock {move.type === 'in' ? 'Added' : 'Reduced'}
                      </Text>
                      <Text style={styles.historyDate}>
                        {format(new Date(move.date), 'dd MMM, hh:mm a')}
                      </Text>
                      <View style={styles.historyDetailRow}>
                        {move.price > 0 && (
                          <View style={styles.historyDetailBadge}>
                            <Text style={styles.historyRateText}>
                              Rate: ₹{move.price.toLocaleString()}
                            </Text>
                          </View>
                        )}
                        {move.type === 'out' && move.price > 0 && (
                          <View
                            style={[
                              styles.historyDetailBadge,
                              {
                                backgroundColor:
                                  move.price - product.purchase_price >= 0
                                    ? Colors.successLight
                                    : Colors.dangerLight,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.historyProfitText,
                                {
                                  color:
                                    move.price - product.purchase_price >= 0
                                      ? Colors.success
                                      : Colors.danger,
                                },
                              ]}
                            >
                              Profit: ₹
                              {(
                                (move.price - product.purchase_price) *
                                move.quantity
                              ).toLocaleString()}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.historyQty,
                        {
                          color:
                            move.type === 'in' ? Colors.success : Colors.danger,
                        },
                      ]}
                    >
                      {move.type === 'in' ? '+' : '-'} {move.quantity}{' '}
                      {product.unit}
                    </Text>
                  </View>
                  {index < movements.slice(0, 10).length - 1 && (
                    <View style={styles.smallDivider} />
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>
                No movements recorded yet
              </Text>
            </View>
          )}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Pricing Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Icon
                  name="arrow-down-circle"
                  size={18}
                  color={Colors.danger}
                />
              </View>
              <View style={styles.infoTexts}>
                <Text style={styles.infoLabel}>Purchase Price</Text>
                <Text style={styles.infoValue}>
                  ₹{product.purchase_price.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Icon name="tag" size={18} color={Colors.success} />
              </View>
              <View style={styles.infoTexts}>
                <Text style={styles.infoLabel}>Selling Price</Text>
                <Text style={styles.infoValue}>
                  ₹{product.selling_price.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Icon name="trending-up" size={18} color={Colors.primary} />
              </View>
              <View style={styles.infoTexts}>
                <Text style={styles.infoLabel}>Profit Margin</Text>
                <Text style={styles.infoValue}>
                  ₹
                  {(
                    product.selling_price - product.purchase_price
                  ).toLocaleString('en-IN')}
                  <Text style={styles.profitPct}>
                    {' '}
                    (
                    {(
                      ((product.selling_price - product.purchase_price) /
                        (product.purchase_price || 1)) *
                      100
                    ).toFixed(1)}
                    %)
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Inventory Settings</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Icon name="hash" size={18} color={Colors.textSecondary} />
              </View>
              <View style={styles.infoTexts}>
                <Text style={styles.infoLabel}>Unit of Measurement</Text>
                <Text style={styles.infoValue}>
                  {product.unit.toUpperCase()}
                </Text>
              </View>
            </View>
            {product.party_name && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Icon name="user" size={18} color={Colors.textSecondary} />
                  </View>
                  <View style={styles.infoTexts}>
                    <Text style={styles.infoLabel}>Supplier / Party Name</Text>
                    <Text style={styles.infoValue}>{product.party_name}</Text>
                  </View>
                </View>
              </>
            )}
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Icon name="clock" size={18} color={Colors.textSecondary} />
              </View>
              <View style={styles.infoTexts}>
                <Text style={styles.infoLabel}>Last Updated</Text>
                <Text style={styles.infoValue}>
                  {format(new Date(product.updated_at), 'dd MMM yyyy, hh:mm a')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.mainActionBtn}
          onPress={() => navigation.navigate('AddItem', { productId })}
        >
          <Icon name="edit" size={20} color={Colors.white} />
          <Text style={styles.mainActionBtnText}>Edit Product Details</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={adjustmentModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAdjustmentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Stock {adjustmentType === 'in' ? 'Addition' : 'Reduction'}
              </Text>
              <TouchableOpacity
                onPress={() => setAdjustmentModalVisible(false)}
              >
                <Icon name="x" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Quantity ({product.unit})</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter quantity"
                  value={adjustmentQty}
                  onChangeText={setAdjustmentQty}
                  keyboardType="decimal-pad"
                  autoFocus
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Rate per {product.unit} (Optional)
                </Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder={`Default: ₹${
                    adjustmentType === 'in'
                      ? product.purchase_price
                      : product.selling_price
                  }`}
                  value={adjustmentPrice}
                  onChangeText={setAdjustmentPrice}
                  keyboardType="decimal-pad"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  {
                    backgroundColor:
                      adjustmentType === 'in' ? Colors.success : Colors.danger,
                  },
                ]}
                onPress={handleStockAdjustment}
              >
                <Text style={styles.submitBtnText}>
                  Confirm Stock {adjustmentType === 'in' ? 'In' : 'Out'}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  productHero: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconLarge: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  productNameLarge: {
    ...Typography.h2,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  stockBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  inStockBadge: {
    backgroundColor: Colors.successLight,
  },
  lowStockBadge: {
    backgroundColor: Colors.dangerLight,
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  inStockText: {
    color: Colors.success,
  },
  lowStockText: {
    color: Colors.danger,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    ...Typography.h1,
    fontSize: 32,
    color: Colors.text,
    marginBottom: 4,
  },
  statUnit: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  infoSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    ...Typography.body,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTexts: {
    flex: 1,
  },
  infoLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  infoValue: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '700',
    marginTop: 2,
  },
  profitPct: {
    color: Colors.success,
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.background,
    marginVertical: 12,
  },
  mainActionBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 12,
    shadowColor: Colors.primary,
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
  actionRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 30,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 10,
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionBtnText: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  historyCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyTexts: {
    flex: 1,
  },
  historyType: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.text,
  },
  historyDate: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: 6,
  },
  historyDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  historyDetailBadge: {
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  historyRateText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  historyProfitText: {
    fontSize: 10,
    fontWeight: '800',
  },
  historyQty: {
    ...Typography.bodySmall,
    fontWeight: '800',
  },
  smallDivider: {
    height: 1,
    backgroundColor: '#F8F8F8',
    marginVertical: 16,
    marginLeft: 46,
  },
  emptyHistory: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  emptyHistoryText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  modalBody: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 5,
  },
  modalInput: {
    height: 50,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    ...Typography.body,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  submitBtn: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitBtnText: {
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
