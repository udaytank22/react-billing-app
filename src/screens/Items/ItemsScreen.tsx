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
  Platform,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useDatabase } from '../../context/DatabaseContext';
import {
  getProducts,
  Product,
  getItemOrders,
  ItemOrder,
  addItemOrder,
  updateItemOrderStatus,
  deleteItemOrder,
} from '../../database/dbService';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useToast } from '../../context/ToastContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Items'>;

interface Props {
  navigation: NavigationProp;
}

export const ItemsScreen: React.FC<Props> = ({ navigation }) => {
  const { db } = useDatabase();
  const { showToast } = useToast();
  const isFocused = useIsFocused();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<ItemOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'inventory' | 'tracking'>(
    'inventory',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Manual Order Form State
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [orderQuantity, setOrderQuantity] = useState('10');
  const [showProductPicker, setShowProductPicker] = useState(false);

  const fetchItemsData = useCallback(async () => {
    if (db) {
      const productData = await getProducts(db);
      setProducts(productData);
      const orderData = await getItemOrders(db);
      setOrders(orderData);
    }
  }, [db]);

  useEffect(() => {
    if (isFocused) {
      fetchItemsData();
    }
  }, [isFocused, fetchItemsData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchItemsData();
    setRefreshing(false);
  };

  const lowStockItems = products.filter(p => p.quantity < 5);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handlePlaceOrder = async (product: Product, quantity: number = 10) => {
    if (!db) return;
    try {
      await addItemOrder(db, {
        product_id: product.id,
        product_name: product.name,
        quantity: quantity,
        status: 'pending',
        transporter_name: 'Express Logistics',
        delivery_man: 'Rahul Kumar',
        contact_number: '+91 99887 76655',
        pickup_location: 'Central Warehouse, Mumbai',
        seller_name: product.party_name || 'Premium Wholesale Ltd',
        seller_contact: 'info@premiumwholesale.com',
        date: new Date().toISOString(),
      });
      fetchItemsData();
      if (!showOrderModal) {
        showToast(
          `Order for ${quantity} units of ${product.name} placed successfully.`,
          'success',
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleManualOrder = async () => {
    if (!selectedProduct) {
      showToast('Please select a product', 'error');
      return;
    }
    const qty = parseFloat(orderQuantity);
    if (isNaN(qty) || qty <= 0) {
      showToast('Please enter a valid quantity', 'error');
      return;
    }

    await handlePlaceOrder(selectedProduct, qty);
    setShowOrderModal(false);
    setSelectedProduct(null);
    setOrderQuantity('10');
    showToast('Manual order placed successfully', 'success');
  };

  const handleUpdateOrderStatus = async (orderId: number, status: any) => {
    if (!db) return;
    try {
      await updateItemOrderStatus(db, orderId, status);
      fetchItemsData();
    } catch (error) {
      console.error(error);
    }
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    const isLowStock = item.quantity < 5;
    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() =>
          navigation.navigate('ItemDetail', { productId: item.id })
        }
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <View
            style={[
              styles.itemIconContainer,
              isLowStock && { backgroundColor: Colors.dangerLight },
            ]}
          >
            <Icon
              name="package"
              size={24}
              color={isLowStock ? Colors.danger : Colors.primary}
            />
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text
              style={[styles.itemUnit, isLowStock && { color: Colors.danger }]}
            >
              {item.quantity} {item.unit} {isLowStock ? '(Low Stock)' : ''}
            </Text>
          </View>
        </View>

        <View style={styles.cardRight}>
          <Text style={styles.priceText}>
            ₹{item.selling_price.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.priceLabel}>Selling Price</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderOrderItem = ({ item }: { item: ItemOrder }) => {
    const statusColors: any = {
      pending: Colors.warning,
      ordered: Colors.primary,
      delivered: Colors.success,
      cancelled: Colors.textSecondary,
    };

    return (
      <TouchableOpacity
        style={styles.orderCard}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
      >
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderProductName}>{item.product_name}</Text>
            <Text style={styles.orderDate}>
              {format(new Date(item.date), 'dd MMM yyyy')}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColors[item.status] + '20' },
            ]}
          >
            <Text
              style={[styles.statusText, { color: statusColors[item.status] }]}
            >
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.orderFooter}>
          <Text style={styles.orderQty}>Qty: {item.quantity}</Text>
          <View style={styles.orderActions}>
            {item.status === 'pending' && (
              <TouchableOpacity
                onPress={() => handleUpdateOrderStatus(item.id, 'ordered')}
                style={styles.actionBtn}
              >
                <Text style={styles.actionBtnText}>Mark as Ordered</Text>
              </TouchableOpacity>
            )}
            {item.status === 'ordered' && (
              <TouchableOpacity
                onPress={() => handleUpdateOrderStatus(item.id, 'delivered')}
                style={[styles.actionBtn, { borderColor: Colors.success }]}
              >
                <Text style={[styles.actionBtnText, { color: Colors.success }]}>
                  Mark as Delivered
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => deleteItemOrder(db!, item.id).then(fetchItemsData)}
            >
              <Icon name="trash-2" size={18} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Items & Inventory</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddItem')}
        >
          <Icon name="plus" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'inventory' && styles.activeTab]}
          onPress={() => setActiveTab('inventory')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'inventory' && styles.activeTabText,
            ]}
          >
            Inventory
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tracking' && styles.activeTab]}
          onPress={() => setActiveTab('tracking')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'tracking' && styles.activeTabText,
            ]}
          >
            Tracking & Suggestions
          </Text>
          {lowStockItems.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{lowStockItems.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {activeTab === 'inventory' ? (
        <>
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
                placeholder="Search items by name..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={Colors.textSecondary}
              />
            </View>
          </View>

          <FlatList
            data={filteredProducts}
            keyExtractor={item => item.id.toString()}
            renderItem={renderProductItem}
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
                <Icon name="package" size={48} color={Colors.border} />
                <Text style={styles.emptyText}>No items found</Text>
                <Text style={styles.emptySubText}>
                  Add items to manage your inventory
                </Text>
              </View>
            }
          />
        </>
      ) : (
        <FlatList
          data={[
            { type: 'suggestions', data: lowStockItems },
            { type: 'orders', data: orders },
          ]}
          keyExtractor={item => item.type}
          renderItem={({ item }) => {
            if (item.type === 'suggestions') {
              const suggestionData = item.data as Product[];
              return (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Stock Suggestions</Text>
                    <TouchableOpacity
                      style={styles.manualOrderBtn}
                      onPress={() => setShowOrderModal(true)}
                    >
                      <Icon
                        name="plus-circle"
                        size={14}
                        color={Colors.primary}
                      />
                      <Text style={styles.manualOrderText}>Manual Order</Text>
                    </TouchableOpacity>
                  </View>
                  {suggestionData.length === 0 ? (
                    <Text style={styles.emptySectionText}>
                      All items are well stocked.
                    </Text>
                  ) : (
                    suggestionData.map((product: Product) => (
                      <View key={product.id} style={styles.suggestionCard}>
                        <View style={styles.suggestionInfo}>
                          <Text style={styles.suggestionName}>
                            {product.name}
                          </Text>
                          <Text style={styles.suggestionStock}>
                            Current: {product.quantity} {product.unit}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.orderNowBtn}
                          onPress={() => handlePlaceOrder(product)}
                        >
                          <Text style={styles.orderNowText}>Order Now</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
              );
            } else {
              const orderData = item.data as ItemOrder[];
              return (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Order Tracking</Text>
                  {orderData.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Icon name="truck" size={48} color={Colors.border} />
                      <Text style={styles.emptyText}>
                        No orders tracked yet.
                      </Text>
                    </View>
                  ) : (
                    orderData.map((order: ItemOrder) => (
                      <View key={order.id}>
                        {renderOrderItem({ item: order })}
                      </View>
                    ))
                  )}
                </View>
              );
            }
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
        />
      )}

      {/* Manual Order Modal */}
      <Modal
        visible={showOrderModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOrderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Place Manual Order</Text>
              <TouchableOpacity onPress={() => setShowOrderModal(false)}>
                <Icon name="x" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView bounces={false}>
              <Text style={styles.inputLabel}>Select Item</Text>
              <TouchableOpacity
                style={styles.pickerTrigger}
                onPress={() => setShowProductPicker(!showProductPicker)}
              >
                <Text
                  style={
                    selectedProduct
                      ? styles.pickerText
                      : styles.pickerPlaceholder
                  }
                >
                  {selectedProduct
                    ? selectedProduct.name
                    : 'Select a product to order...'}
                </Text>
                <Icon
                  name={showProductPicker ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>

              {showProductPicker && (
                <View style={styles.pickerDropdown}>
                  {products.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.pickerItem,
                        selectedProduct?.id === p.id &&
                          styles.selectedPickerItem,
                      ]}
                      onPress={() => {
                        setSelectedProduct(p);
                        setShowProductPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          selectedProduct?.id === p.id &&
                            styles.selectedPickerItemText,
                        ]}
                      >
                        {p.name}
                      </Text>
                      <Text style={styles.pickerItemStock}>
                        {p.quantity} {p.unit} in stock
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.inputLabel}>Order Quantity</Text>
              <View style={styles.qtyInputContainer}>
                <TextInput
                  style={styles.qtyInput}
                  keyboardType="numeric"
                  value={orderQuantity}
                  onChangeText={setOrderQuantity}
                  placeholder="Enter quantity"
                />
                <View style={styles.unitBadge}>
                  <Text style={styles.unitText}>
                    {selectedProduct?.unit || 'Units'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  !selectedProduct && styles.disabledBtn,
                ]}
                onPress={handleManualOrder}
                disabled={!selectedProduct}
              >
                <Text style={styles.submitBtnText}>Confirm Order</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
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
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.text,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeTab: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: Colors.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  manualOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  manualOrderText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: Colors.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: 12,
    fontSize: 16,
  },
  emptySectionText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  suggestionCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text,
  },
  suggestionStock: {
    ...Typography.caption,
    color: Colors.danger,
    marginTop: 2,
  },
  orderNowBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  orderNowText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderProductName: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text,
  },
  orderDate: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderQty: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.text,
  },
  orderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionBtnText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '700',
  },
  itemCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text,
  },
  itemUnit: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  priceText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.primary,
  },
  priceLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: 10,
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text,
  },
  emptySubText: {
    marginTop: 4,
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  inputLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 16,
  },
  pickerTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: Colors.background,
  },
  pickerText: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
  pickerPlaceholder: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  pickerDropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.white,
    maxHeight: 200,
    overflow: 'hidden',
  },
  pickerItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedPickerItem: {
    backgroundColor: Colors.primaryLight,
  },
  pickerItemText: {
    ...Typography.body,
    color: Colors.text,
  },
  selectedPickerItemText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  pickerItemStock: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  qtyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qtyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  unitBadge: {
    backgroundColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
  },
  unitText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 16,
  },
  disabledBtn: {
    backgroundColor: Colors.border,
  },
  submitBtnText: {
    color: Colors.white,
    ...Typography.body,
    fontWeight: '800',
  },
});
