import React from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootStackParamList } from './types';
import Icon from 'react-native-vector-icons/Feather';
import { Colors } from '../theme/colors';

// Screens
import { SplashScreen } from '../screens/Splash';
import { LoginScreen } from '../screens/Auth';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { CustomersScreen } from '../screens/Customers/CustomersScreen';
import { ItemsScreen, AddItemScreen } from '../screens/Items';
import { BillsScreen } from '../screens/Bills/BillsScreen';
import { ProfileScreen } from '../screens/Profile/ProfileScreen';
import { AddCustomerScreen } from '../screens/AddCustomer';
import { CustomerDetailScreen } from '../screens/CustomerDetail';
import { AddEntryScreen } from '../screens/AddEntry';
import { ReportsScreen } from '../screens/Reports';
import { BackupScreen } from '../screens/Backup';
import { SettingsScreen } from '../screens/Settings';
import { BillDetailScreen } from '../screens/Bills/BillDetailScreen';
import { ItemDetailScreen } from '../screens/Items/ItemDetailScreen';
import { TransactionDetailScreen } from '../screens/AddEntry/TransactionDetailScreen';
import { OrderDetailScreen } from '../screens/Items/OrderDetailScreen';
import { TasksScreen } from '../screens/Tasks/TasksScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootStackParamList>();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName = '';

          if (route.name === 'Home') {
            iconName = 'list';
          } else if (route.name === 'Customers') {
            iconName = 'users';
          } else if (route.name === 'Items') {
            iconName = 'package';
          } else if (route.name === 'Bills') {
            iconName = 'file-text';
          } else if (route.name === 'Profile') {
            iconName = 'user';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          height: 70,
          backgroundColor: Colors.white,
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          paddingBottom: Platform.OS === 'ios' ? 25 : 12,
          paddingTop: 10,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
          letterSpacing: 0.3,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Transactions' }}
      />
      <Tab.Screen
        name="Customers"
        component={CustomersScreen}
        options={{ tabBarLabel: 'Customers' }}
      />
      <Tab.Screen
        name="Items"
        component={ItemsScreen}
        options={{ tabBarLabel: 'Items' }}
      />
      <Tab.Screen
        name="Bills"
        component={BillsScreen}
        options={{ tabBarLabel: 'Bills' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="AddCustomer" component={AddCustomerScreen} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
      <Stack.Screen name="AddEntry" component={AddEntryScreen} />
      <Stack.Screen name="AddItem" component={AddItemScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen name="Backup" component={BackupScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="BillDetail" component={BillDetailScreen} />
      <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
      <Stack.Screen
        name="TransactionDetail"
        component={TransactionDetailScreen}
      />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen name="Tasks" component={TasksScreen} />
    </Stack.Navigator>
  );
};
