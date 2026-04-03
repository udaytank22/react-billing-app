import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '../../context/DatabaseContext';
import { useToast } from '../../context/ToastContext';
import {
  updateItemOrderStatus,
  getItemOrderById,
} from '../../database/dbService';
import { Dropdown } from 'react-native-element-dropdown';
import { ItemOrder } from '../../database/database';
import { format } from 'date-fns';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Ordered', value: 'ordered' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'OrderDetail'
>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'OrderDetail'>;

interface Props {
  navigation: NavigationProp;
  route: ScreenRouteProp;
}

export const OrderDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { orderId } = route.params;
  const { db } = useDatabase();
  const { showToast } = useToast();
  const [order, setOrder] = useState<ItemOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (db) {
      setLoading(true);
      const data = await getItemOrderById(db, orderId);
      setOrder(data);
      setLoading(false);
    }
  }, [db, orderId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCall = (phone: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!db || !order) return;
    try {
      await updateItemOrderStatus(db, order.id, newStatus);
      setOrder({ ...order, status: newStatus as any });
      showToast(`Status updated to ${newStatus}`, 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to update status', 'error');
    }
  };

  if (loading || !order) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return Colors.success;
      case 'ordered':
        return Colors.primary;
      case 'cancelled':
        return Colors.danger;
      default:
        return Colors.warning;
    }
  };

  const isStepCompleted = (step: string) => {
    const statusPriority: Record<string, number> = {
      pending: 0,
      ordered: 1,
      delivered: 2,
    };
    return (
      statusPriority[order.status] >=
      statusPriority[step as keyof typeof statusPriority]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Modern Gradient-like Header Area */}
      <View style={styles.topBar}>
        <View style={styles.headerBackground} />
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Tracking</Text>
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={() => showToast('Tracking synchronized', 'success')}
          >
            <Icon name="refresh-cw" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Floating Hero Card */}
        <View style={styles.heroWrapper}>
          <View style={styles.heroCard}>
            <View style={styles.heroLeft}>
              <View style={styles.iconCircle}>
                <Icon name="package" size={32} color={Colors.primary} />
              </View>
            </View>
            <View style={styles.heroRight}>
              <Text style={styles.productName}>{order.product_name}</Text>
              <Text style={styles.orderId}>Order ID: #{order.id}</Text>
              <Dropdown
                style={[
                  styles.statusDropdown,
                  { backgroundColor: getStatusColor(order.status) + '15' },
                ]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={[
                  styles.statusText,
                  { color: getStatusColor(order.status) },
                ]}
                iconStyle={styles.iconStyle}
                data={STATUS_OPTIONS}
                labelField="label"
                valueField="value"
                value={order.status}
                onChange={item => handleStatusChange(item.value)}
                renderLeftIcon={() => (
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(order.status) },
                    ]}
                  />
                )}
              />
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Tracking Timeline */}
        <View style={[styles.card, styles.timelineCard]}>
          <Text style={styles.cardHeaderTitle}>Live Status</Text>
          <View style={styles.timelineContainer}>
            {/* Step 1 */}
            <View style={styles.timelineStep}>
              <View style={styles.timelineLeft}>
                <View
                  style={[
                    styles.timelineDot,
                    isStepCompleted('pending') && styles.dotActive,
                  ]}
                >
                  {isStepCompleted('pending') && (
                    <Icon name="check" size={8} color={Colors.white} />
                  )}
                </View>
                <View
                  style={[
                    styles.timelineLine,
                    isStepCompleted('ordered') && styles.lineActive,
                  ]}
                />
              </View>
              <View style={styles.timelineBody}>
                <Text
                  style={[
                    styles.timelineTitle,
                    isStepCompleted('pending') && styles.textActive,
                  ]}
                >
                  Order Placed
                </Text>
                <Text style={styles.timelineSubtitle}>
                  {format(new Date(order.date), 'dd MMM yyyy, hh:mm a')}
                </Text>
              </View>
            </View>

            {/* Step 2 */}
            <View style={styles.timelineStep}>
              <View style={styles.timelineLeft}>
                <View
                  style={[
                    styles.timelineDot,
                    isStepCompleted('ordered') && styles.dotActive,
                  ]}
                >
                  {isStepCompleted('ordered') && (
                    <Icon name="check" size={8} color={Colors.white} />
                  )}
                </View>
                <View
                  style={[
                    styles.timelineLine,
                    isStepCompleted('delivered') && styles.lineActive,
                  ]}
                />
              </View>
              <View style={styles.timelineBody}>
                <Text
                  style={[
                    styles.timelineTitle,
                    isStepCompleted('ordered') && styles.textActive,
                  ]}
                >
                  Processing & Packed
                </Text>
                <Text style={styles.timelineSubtitle}>
                  Order is being processed at the warehouse
                </Text>
              </View>
            </View>

            {/* Step 3 */}
            <View style={[styles.timelineStep, { paddingBottom: 0 }]}>
              <View style={styles.timelineLeft}>
                <View
                  style={[
                    styles.timelineDot,
                    isStepCompleted('delivered') && styles.dotActive,
                  ]}
                >
                  {isStepCompleted('delivered') && (
                    <Icon name="check" size={8} color={Colors.white} />
                  )}
                </View>
              </View>
              <View style={styles.timelineBody}>
                <Text
                  style={[
                    styles.timelineTitle,
                    isStepCompleted('delivered') && styles.textActive,
                  ]}
                >
                  Delivered
                </Text>
                <Text style={styles.timelineSubtitle}>
                  Successfully reached destination
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Logistics Section */}
        <View style={styles.sectionArea}>
          <View style={styles.sectionHeadingRow}>
            <View style={styles.headingIconBox}>
              <Icon name="truck" size={16} color={Colors.primary} />
            </View>
            <Text style={styles.sectionHeadingText}>Transporter Details</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Courier Company</Text>
              <Text style={styles.infoValue}>
                {order.transporter_name || 'Acme Express'}
              </Text>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Pickup Hub</Text>
              <Text style={styles.infoValue}>
                {order.pickup_location || 'Central Mumbai'}
              </Text>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.contactActionRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Delivery Captain</Text>
                <Text style={styles.infoValue}>
                  {order.delivery_man || 'Rahul Sharma'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.callActionButton}
                onPress={() => handleCall(order.contact_number || '1234567890')}
              >
                <Icon name="phone" size={18} color={Colors.success} />
                <Text style={styles.callText}>Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Seller Info */}
        <View style={styles.sectionArea}>
          <View style={styles.sectionHeadingRow}>
            <View
              style={[styles.headingIconBox, { backgroundColor: '#ECEFFF' }]}
            >
              <Icon name="shopping-bag" size={16} color={Colors.primary} />
            </View>
            <Text style={styles.sectionHeadingText}>Seller Information</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Vendor Name</Text>
              <Text style={styles.infoValue}>
                {order.seller_name || 'Vibrant Traders'}
              </Text>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Office Contact</Text>
              <Text style={styles.infoValue}>
                {order.seller_contact || '+91 88009 11223'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.supportLink}
          activeOpacity={0.6}
          onPress={() => showToast('Connecting to support...', 'info')}
        >
          <View style={styles.supportIcon}>
            <Icon name="help-circle" size={14} color={Colors.textSecondary} />
          </View>
          <Text style={styles.supportText}>
            Facing issues? Dispute this order
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FE', // Sleek background color
  },
  topBar: {
    height: 180,
    position: 'relative',
    marginBottom: 60,
  },
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    height: 140,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.white,
    fontWeight: '800',
  },
  heroWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  heroCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroLeft: {
    marginRight: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#F0F3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroRight: {
    flex: 1,
  },
  productName: {
    ...Typography.h3,
    color: Colors.text,
    fontWeight: '900',
  },
  orderId: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#E8EBF5',
  },
  timelineCard: {
    marginTop: 0,
  },
  cardHeaderTitle: {
    ...Typography.body,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 20,
  },
  timelineContainer: {
    paddingLeft: 5,
  },
  timelineStep: {
    flexDirection: 'row',
    paddingBottom: 0,
  },
  timelineLeft: {
    width: 30,
    alignItems: 'center',
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E8EBF5',
    zIndex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E8EBF5',
    marginVertical: 2,
  },
  lineActive: {
    backgroundColor: Colors.primary,
  },
  timelineBody: {
    flex: 1,
    marginLeft: 10,
    paddingBottom: 35,
  },
  timelineTitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  textActive: {
    color: Colors.text,
  },
  timelineSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  sectionArea: {
    marginBottom: 25,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  headingIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F0F3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeadingText: {
    ...Typography.body,
    fontWeight: '800',
    color: Colors.text,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8EBF5',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    ...Typography.bodySmall,
    color: Colors.text,
    fontWeight: '800',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F0F3FF',
    marginVertical: 14,
  },
  contactActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  callActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFFFF4',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  callText: {
    ...Typography.caption,
    color: Colors.success,
    fontWeight: '800',
  },
  supportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  supportIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E8EBF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FE',
  },
  statusDropdown: {
    height: 32,
    width: 130,
    borderRadius: 10,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  placeholderStyle: {
    fontSize: 10,
    fontWeight: '900',
  },
  iconStyle: {
    width: 16,
    height: 16,
  },
});
