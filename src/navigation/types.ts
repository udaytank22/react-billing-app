export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Main: undefined; // Tab Navigator
  Home: undefined; // Transactions
  Customers: undefined;
  Items: undefined;
  Bills: undefined;
  Profile: undefined;
  AddCustomer: { customerId?: number } | undefined;
  CustomerDetail: { customerId: number };
  AddEntry: {
    customerId: number;
    transactionId?: number;
    type?: 'credit' | 'debit';
  };
  AddItem: { productId?: number } | undefined;
  Reports: undefined;
  Backup: undefined;
  Settings: undefined;
  BillDetail: { billId: number };
  ItemDetail: { productId: number };
  TransactionDetail: { transactionId: number };
  OrderDetail: { orderId: number };
  Tasks: undefined;
};
