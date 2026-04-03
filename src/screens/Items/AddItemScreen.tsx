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
} from 'react-native';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useDatabase } from '../../context/DatabaseContext';
import {
  addProduct,
  updateProduct,
  getProductById,
  deleteProduct,
} from '../../database/dbService';
import { RootStackParamList } from '../../navigation/types';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dropdown } from 'react-native-element-dropdown';

const UNITS = [
  { label: 'Pieces (pcs)', value: 'pcs' },
  { label: 'Kilograms (kg)', value: 'kg' },
  { label: 'Meters (mtr)', value: 'mtr' },
  { label: 'Boxes (box)', value: 'box' },
  { label: 'Packets (pkt)', value: 'pkt' },
  { label: 'Liters (ltr)', value: 'ltr' },
  { label: 'Dozens (dz)', value: 'dz' },
  { label: 'Grams (g)', value: 'g' },
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddItem'>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'AddItem'>;

interface Props {
  navigation: NavigationProp;
  route: ScreenRouteProp;
}

export const AddItemScreen: React.FC<Props> = ({ navigation, route }) => {
  const productId = route.params?.productId;
  const { db } = useDatabase();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [partyName, setPartyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFocus, setIsFocus] = useState(false);

  useEffect(() => {
    if (productId && db) {
      loadProduct();
    }
  }, [productId, db]);

  const loadProduct = async () => {
    if (!db) return;
    const product = await getProductById(db, productId!);
    if (product) {
      setName(product.name);
      setQuantity(product.quantity.toString());
      setUnit(product.unit);
      setPurchasePrice(product.purchase_price.toString());
      setSellingPrice(product.selling_price.toString());
      setPartyName(product.party_name || '');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter item name');
      return;
    }

    const qty = parseFloat(quantity);
    if (quantity.trim() && (isNaN(qty) || qty < 0)) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    const purchase = parseFloat(purchasePrice);
    if (purchasePrice.trim() && (isNaN(purchase) || purchase < 0)) {
      Alert.alert('Error', 'Please enter a valid purchase price');
      return;
    }

    const selling = parseFloat(sellingPrice);
    if (sellingPrice.trim() && (isNaN(selling) || selling < 0)) {
      Alert.alert('Error', 'Please enter a valid selling price');
      return;
    }

    if (!db) return;

    setLoading(true);
    try {
      const productData = {
        name: name.trim(),
        quantity: parseFloat(quantity) || 0,
        unit: unit.trim(),
        purchase_price: parseFloat(purchasePrice) || 0,
        selling_price: parseFloat(sellingPrice) || 0,
        party_name: partyName.trim(),
      };

      if (productId) {
        await updateProduct(db, productId, productData);
      } else {
        await addProduct(db, productData);
      }
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Item', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (db && productId) {
            await deleteProduct(db, productId);
            navigation.goBack();
          }
        },
      },
    ]);
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
            {productId ? 'Edit Item' : 'Add New Item'}
          </Text>
          {productId ? (
            <TouchableOpacity onPress={handleDelete}>
              <Icon name="trash-2" size={20} color={Colors.danger} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Item Name *</Text>
              <View style={styles.inputWrapper}>
                <Icon
                  name="package"
                  size={18}
                  color={Colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Sugar, Cement, Milk"
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Buying From (Party Name)</Text>
              <View style={styles.inputWrapper}>
                <Icon
                  name="user"
                  size={18}
                  color={Colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. ABC Wholesalers"
                  value={partyName}
                  onChangeText={setPartyName}
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Current Stock</Text>
                <View style={styles.inputWrapper}>
                  <Icon
                    name="layers"
                    size={18}
                    color={Colors.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="decimal-pad"
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Unit</Text>
                <Dropdown
                  style={[
                    styles.dropdown,
                    isFocus && { borderColor: Colors.primary },
                  ]}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  iconStyle={styles.iconStyle}
                  data={UNITS}
                  maxHeight={300}
                  labelField="label"
                  valueField="value"
                  placeholder="Unit"
                  value={unit}
                  onFocus={() => setIsFocus(true)}
                  onBlur={() => setIsFocus(false)}
                  onChange={item => {
                    setUnit(item.value);
                    setIsFocus(false);
                  }}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Purchase Price</Text>
                <View style={styles.inputWrapper}>
                  <Icon
                    name="arrow-down-circle"
                    size={18}
                    color={Colors.danger}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    value={purchasePrice}
                    onChangeText={setPurchasePrice}
                    keyboardType="decimal-pad"
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Selling Price</Text>
                <View style={styles.inputWrapper}>
                  <Icon
                    name="arrow-up-circle"
                    size={18}
                    color={Colors.success}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    value={sellingPrice}
                    onChangeText={setSellingPrice}
                    keyboardType="decimal-pad"
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, loading && styles.disabledBtn]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.saveBtnText}>
              {loading ? 'SAVING...' : productId ? 'UPDATE ITEM' : 'ADD ITEM'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
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
    padding: 8,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.text,
    fontWeight: '700',
  },
  content: {
    padding: 20,
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
  row: {
    flexDirection: 'row',
  },
  label: {
    ...Typography.caption,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
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
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 30,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  saveBtnText: {
    ...Typography.button,
    color: Colors.white,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  dropdown: {
    height: 50,
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
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
});
