import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

export const getDBConnection = async (userId?: string) => {
  const name = userId ? `SimpleLedger_${userId}.db` : 'SimpleLedger_guest.db';
  return SQLite.openDatabase({ name, location: 'default' });
};

export const createTables = async (db: SQLite.SQLiteDatabase) => {
  // Customer table
  const customerQuery = `
    CREATE TABLE IF NOT EXISTS Customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Transactions table
  const transactionQuery = `
    CREATE TABLE IF NOT EXISTS Transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      amount REAL NOT NULL,
      type TEXT NOT NULL, -- 'credit' or 'debit'
      item_name TEXT,
      item_qty REAL DEFAULT 0,
      product_id INTEGER,
      payment_mode TEXT, -- 'cash', 'upi', 'none'
      status TEXT DEFAULT 'pending', -- 'pending', 'paid'
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      due_date DATETIME,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES Customers (id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES Products (id) ON DELETE SET NULL
    );
  `;

  // Products (Stock) table
  const productQuery = `
    CREATE TABLE IF NOT EXISTS Products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      quantity REAL DEFAULT 0,
      unit TEXT DEFAULT 'pcs',
      purchase_price REAL DEFAULT 0,
      selling_price REAL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      party_name TEXT
    );
  `;

  // StockMovements table
  const movementQuery = `
    CREATE TABLE IF NOT EXISTS StockMovements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      quantity REAL NOT NULL,
      type TEXT NOT NULL, -- 'in' or 'out'
      price REAL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES Products (id) ON DELETE CASCADE
    );
  `;

  // Bills table
  const billQuery = `
    CREATE TABLE IF NOT EXISTS Bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER,
      bill_number TEXT NOT NULL,
      customer_name TEXT,
      amount REAL NOT NULL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES Transactions (id) ON DELETE CASCADE
    );
  `;

  // ItemOrders table
  const orderQuery = `
    CREATE TABLE IF NOT EXISTS ItemOrders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      status TEXT DEFAULT 'pending', -- 'pending', 'ordered', 'delivered', 'cancelled'
      transporter_name TEXT,
      delivery_man TEXT,
      contact_number TEXT,
      pickup_location TEXT,
      seller_name TEXT,
      seller_contact TEXT,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES Products (id) ON DELETE SET NULL
    );
  `;

  // Tasks table
  const taskQuery = `
    CREATE TABLE IF NOT EXISTS Tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending', -- 'pending', 'completed'
      type TEXT DEFAULT 'manual', -- 'manual', 'auto_stock', 'auto_payment'
      related_id INTEGER,
      due_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await db.executeSql(customerQuery);
  await db.executeSql(transactionQuery);
  await db.executeSql(productQuery);
  await db.executeSql(movementQuery);
  await db.executeSql(billQuery);
  await db.executeSql(orderQuery);
  await db.executeSql(taskQuery);

  // Migration: Add item_name and item_qty to Transactions if they don't exist
  try {
    const tableInfo = await db.executeSql('PRAGMA table_info(Transactions)');
    const columns = [];
    const rows = tableInfo[0].rows;
    for (let i = 0; i < rows.length; i++) {
      columns.push(rows.item(i).name);
    }

    if (!columns.includes('item_name')) {
      await db.executeSql('ALTER TABLE Transactions ADD COLUMN item_name TEXT');
    }
    if (!columns.includes('item_qty')) {
      await db.executeSql(
        'ALTER TABLE Transactions ADD COLUMN item_qty REAL DEFAULT 0',
      );
    }
    if (!columns.includes('product_id')) {
      await db.executeSql(
        'ALTER TABLE Transactions ADD COLUMN product_id INTEGER',
      );
    }
    if (!columns.includes('payment_mode')) {
      await db.executeSql(
        "ALTER TABLE Transactions ADD COLUMN payment_mode TEXT DEFAULT 'none'",
      );
    }
    if (!columns.includes('status')) {
      await db.executeSql(
        "ALTER TABLE Transactions ADD COLUMN status TEXT DEFAULT 'pending'",
      );
    }
  } catch (error) {
    console.log('Migration error or columns already exist:', error);
  }

  // Migration: Add due_date to Transactions if it doesn't exist
  try {
    const tableInfo = await db.executeSql('PRAGMA table_info(Transactions)');
    const columns = [];
    const rows = tableInfo[0].rows;
    for (let i = 0; i < rows.length; i++) {
      columns.push(rows.item(i).name);
    }
    if (!columns.includes('due_date')) {
      await db.executeSql(
        'ALTER TABLE Transactions ADD COLUMN due_date DATETIME',
      );
    }
  } catch (error) {
    console.log('Migration error for Transactions due_date:', error);
  }

  // Migration: Add transporter and seller details to ItemOrders if they don't exist
  try {
    const tableInfo = await db.executeSql('PRAGMA table_info(ItemOrders)');
    const columns = [];
    const rows = tableInfo[0].rows;
    for (let i = 0; i < rows.length; i++) {
      columns.push(rows.item(i).name);
    }

    const newColumns = [
      'transporter_name',
      'delivery_man',
      'contact_number',
      'pickup_location',
      'seller_name',
      'seller_contact',
    ];

    for (const col of newColumns) {
      if (!columns.includes(col)) {
        await db.executeSql(`ALTER TABLE ItemOrders ADD COLUMN ${col} TEXT`);
      }
    }
  } catch (error) {
    console.log('Migration error for ItemOrders:', error);
  }

  // Migration: Add party_name to Products if it doesn't exist
  try {
    const tableInfo = await db.executeSql('PRAGMA table_info(Products)');
    const columns = [];
    const rows = tableInfo[0].rows;
    for (let i = 0; i < rows.length; i++) {
      columns.push(rows.item(i).name);
    }

    if (!columns.includes('party_name')) {
      await db.executeSql('ALTER TABLE Products ADD COLUMN party_name TEXT');
    }
  } catch (error) {
    console.log('Migration error for Products party_name:', error);
  }
};

// Types
export interface Customer {
  id: number;
  name: string;
  phone?: string;
  notes?: string;
  created_at: string;
  balance?: number;
  stock_balance?: number;
}

export interface Transaction {
  id: number;
  customer_id: number;
  amount: number;
  type: 'credit' | 'debit';
  item_name?: string;
  item_qty?: number;
  product_id?: number;
  product_purchase_price?: number;
  payment_mode?: 'cash' | 'upi' | 'none' | 'future';
  status?: 'pending' | 'paid';
  date: string;
  due_date?: string;
  description?: string;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  purchase_price: number;
  selling_price: number;
  party_name?: string;
  updated_at: string;
  created_at: string;
}

export interface StockMovement {
  id: number;
  product_id: number;
  quantity: number;
  type: 'in' | 'out';
  price: number;
  date: string;
  created_at: string;
}

export interface Bill {
  id: number;
  transaction_id: number;
  bill_number: string;
  customer_name: string;
  amount: number;
  date: string;
  created_at: string;
}

export interface ItemOrder {
  id: number;
  product_id?: number;
  product_name: string;
  quantity: number;
  status: 'pending' | 'ordered' | 'delivered' | 'cancelled';
  transporter_name?: string;
  delivery_man?: string;
  contact_number?: string;
  pickup_location?: string;
  seller_name?: string;
  seller_contact?: string;
  date: string;
  created_at: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'completed';
  type: 'manual' | 'auto_stock' | 'auto_payment';
  related_id?: number;
  due_date?: string;
  created_at: string;
  updated_at: string;
}
