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
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useDatabase } from '../../context/DatabaseContext';
import { getCustomers, Customer } from '../../database/dbService';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dropdown } from 'react-native-element-dropdown';

const SORT_OPTIONS = [
  { label: 'Name (A-Z)', value: 'name_asc' },
  { label: 'Name (Z-A)', value: 'name_desc' },
  { label: 'Balance (High-Low)', value: 'bal_desc' },
  { label: 'Balance (Low-High)', value: 'bal_asc' },
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: NavigationProp;
}

export const CustomersScreen: React.FC<Props> = ({ navigation }) => {
  const { db } = useDatabase();
  const isFocused = useIsFocused();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('name_asc');
  const [isFocus, setIsFocus] = useState(false);

  const fetchCustomers = useCallback(async () => {
    if (db) {
      const data = await getCustomers(db);
      setCustomers(data);
    }
  }, [db]);

  useEffect(() => {
    if (isFocused) {
      fetchCustomers();
    }
  }, [isFocused, fetchCustomers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCustomers();
    setRefreshing(false);
  };

  const filteredCustomers = customers
    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'bal_desc':
          return (b.balance || 0) - (a.balance || 0);
        case 'bal_asc':
          return (a.balance || 0) - (b.balance || 0);
        default:
          return 0;
      }
    });

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
              minimumFractionDigits: 2,
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Customers</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddCustomer')}
        >
          <Icon name="user-plus" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.filterRow}>
          <View style={styles.searchContainer}>
            <Icon
              name="search"
              size={18}
              color={Colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={Colors.textSecondary}
            />
          </View>
          <View style={styles.dropdownWrapper}>
            <Dropdown
              style={[
                styles.dropdown,
                isFocus && { borderColor: Colors.primary },
              ]}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              iconStyle={styles.iconStyle}
              data={SORT_OPTIONS}
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder="Sort By"
              value={sortBy}
              onFocus={() => setIsFocus(true)}
              onBlur={() => setIsFocus(false)}
              onChange={item => {
                setSortBy(item.value);
                setIsFocus(false);
              }}
              renderLeftIcon={() => (
                <Icon
                  style={styles.dropdownIcon}
                  color={isFocus ? Colors.primary : Colors.textSecondary}
                  name="filter"
                  size={14}
                />
              )}
            />
          </View>
        </View>
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
            <Icon name="users" size={48} color={Colors.border} />
            <Text style={styles.emptyText}>No customers found</Text>
            <TouchableOpacity
              style={styles.addFirstButton}
              onPress={() => navigation.navigate('AddCustomer')}
            >
              <Text style={styles.addFirstButtonText}>Add New Customer</Text>
            </TouchableOpacity>
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
    flex: 1,
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
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownWrapper: {
    width: 140,
  },
  dropdown: {
    height: 46,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dropdownIcon: {
    marginRight: 6,
  },
  placeholderStyle: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  selectedTextStyle: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '700',
  },
  iconStyle: {
    width: 16,
    height: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  customerCard: {
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
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    ...Typography.h3,
    fontSize: 16,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text,
  },
  customerPhone: {
    ...Typography.caption,
    color: Colors.textSecondary,
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
  cardRight: {
    alignItems: 'flex-end',
  },
  balanceAmount: {
    ...Typography.body,
    fontWeight: '700',
  },
  balanceStatus: {
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
    color: Colors.textSecondary,
  },
  addFirstButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  addFirstButtonText: {
    ...Typography.button,
    color: Colors.white,
    fontSize: 14,
  },
});
