import { SQLiteDatabase } from 'react-native-sqlite-storage';
import {
  Customer,
  Transaction,
  Product,
  Bill,
  ItemOrder,
  StockMovement,
  Task,
} from './database';

export type {
  Customer,
  Transaction,
  Product,
  Bill,
  ItemOrder,
  StockMovement,
  Task,
};

// Stock/Product Service
export const addProduct = async (
  db: SQLiteDatabase,
  product: Omit<Product, 'id' | 'created_at' | 'updated_at'>,
) => {
  const query = `INSERT INTO Products (name, quantity, unit, purchase_price, selling_price, party_name) VALUES (?, 0, ?, ?, ?, ?)`;
  const result = await db.executeSql(query, [
    product.name,
    product.unit,
    product.purchase_price,
    product.selling_price,
    product.party_name || '',
  ]);

  const productId = result[0].insertId;

  // Record initial stock movement if quantity > 0
  if (product.quantity > 0) {
    await addStockMovement(db, {
      product_id: productId,
      quantity: product.quantity,
      type: 'in',
      price: product.purchase_price,
      date: new Date().toISOString(),
    });
  }

  return result;
};

export const getProducts = async (db: SQLiteDatabase): Promise<Product[]> => {
  const products: Product[] = [];
  const results = await db.executeSql(
    'SELECT * FROM Products ORDER BY name ASC',
  );
  const rows = results[0].rows;
  for (let index = 0; index < rows.length; index++) {
    products.push(rows.item(index));
  }
  return products;
};

export const getProductById = async (
  db: SQLiteDatabase,
  id: number,
): Promise<Product | null> => {
  const results = await db.executeSql('SELECT * FROM Products WHERE id = ?', [
    id,
  ]);
  const rows = results[0].rows;
  if (rows.length > 0) {
    return rows.item(0);
  }
  return null;
};

export const updateProduct = async (
  db: SQLiteDatabase,
  id: number,
  product: Partial<Omit<Product, 'id' | 'created_at'>>,
) => {
  const query = `UPDATE Products SET name = ?, quantity = ?, unit = ?, purchase_price = ?, selling_price = ?, party_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  return db.executeSql(query, [
    product.name,
    product.quantity,
    product.unit,
    product.purchase_price,
    product.selling_price,
    product.party_name || '',
    id,
  ]);
};

export const deleteProduct = async (db: SQLiteDatabase, id: number) => {
  return db.executeSql('DELETE FROM Products WHERE id = ?', [id]);
};

export const getStockSummary = async (db: SQLiteDatabase) => {
  const stockResult = await db.executeSql(
    'SELECT COALESCE(SUM(quantity * purchase_price), 0) as total_value, COUNT(*) as total_items FROM Products',
  );

  const todayMovements = await db.executeSql(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'in' THEN quantity ELSE 0 END), 0) as stock_in,
      COALESCE(SUM(CASE WHEN type = 'out' THEN quantity ELSE 0 END), 0) as stock_out
    FROM StockMovements
    WHERE DATE(date) = DATE('now', 'localtime')
  `);

  const todayProfit = await db.executeSql(`
    SELECT
      COALESCE(SUM(CASE WHEN t.type = 'debit' AND (t.amount - (p.purchase_price * t.item_qty)) > 0 THEN (t.amount - (p.purchase_price * t.item_qty)) ELSE 0 END), 0) as profit,
      COALESCE(SUM(CASE WHEN t.type = 'debit' AND (t.amount - (p.purchase_price * t.item_qty)) < 0 THEN ABS(t.amount - (p.purchase_price * t.item_qty)) ELSE 0 END), 0) as loss
    FROM Transactions t
    JOIN Products p ON t.product_id = p.id
    WHERE DATE(t.date) = DATE('now', 'localtime')
  `);

  return {
    ...stockResult[0].rows.item(0),
    ...todayMovements[0].rows.item(0),
    today_profit: todayProfit[0].rows.item(0).profit,
    today_loss: todayProfit[0].rows.item(0).loss,
  };
};

export const addStockMovement = async (
  db: SQLiteDatabase,
  movement: Omit<StockMovement, 'id' | 'created_at'>,
) => {
  const query = `INSERT INTO StockMovements (product_id, quantity, type, price, date) VALUES (?, ?, ?, ?, ?)`;
  await db.executeSql(query, [
    movement.product_id,
    movement.quantity,
    movement.type,
    movement.price || 0,
    movement.date,
  ]);

  // Update product quantity
  const updateQuery =
    movement.type === 'in'
      ? 'UPDATE Products SET quantity = quantity + ? WHERE id = ?'
      : 'UPDATE Products SET quantity = quantity - ? WHERE id = ?';

  return db.executeSql(updateQuery, [movement.quantity, movement.product_id]);
};

export const getStockMovements = async (
  db: SQLiteDatabase,
  productId: number,
): Promise<StockMovement[]> => {
  const movements: StockMovement[] = [];
  const results = await db.executeSql(
    'SELECT * FROM StockMovements WHERE product_id = ? ORDER BY date DESC, created_at DESC',
    [productId],
  );
  const rows = results[0].rows;
  for (let index = 0; index < rows.length; index++) {
    movements.push(rows.item(index));
  }
  return movements;
};

// Customer Service

export const addCustomer = async (
  db: SQLiteDatabase,
  customer: Omit<Customer, 'id' | 'created_at'>,
) => {
  const query = `INSERT INTO Customers (name, phone, notes) VALUES (?, ?, ?)`;
  return db.executeSql(query, [
    customer.name,
    customer.phone || '',
    customer.notes || '',
  ]);
};

export const getCustomers = async (db: SQLiteDatabase): Promise<Customer[]> => {
  const customers: Customer[] = [];
  const results = await db.executeSql(`
    SELECT c.*,
    (SELECT SUM(CASE
        WHEN t.status = 'paid' THEN 0
        WHEN t.type = 'credit' THEN t.amount
        ELSE -t.amount
      END)
     FROM Transactions t WHERE t.customer_id = c.id) as balance,
    (SELECT SUM(CASE
        WHEN t.type = 'credit' THEN t.item_qty
        ELSE -t.item_qty
      END)
     FROM Transactions t WHERE t.customer_id = c.id) as stock_balance
    FROM Customers c
    ORDER BY c.name ASC
  `);

  const rows = results[0].rows;
  for (let index = 0; index < rows.length; index++) {
    customers.push(rows.item(index));
  }
  return customers;
};

export const getTodayCustomers = async (
  db: SQLiteDatabase,
): Promise<Customer[]> => {
  const customers: Customer[] = [];
  const results = await db.executeSql(`
    SELECT DISTINCT c.*,
    (SELECT SUM(CASE
        WHEN t.status = 'paid' THEN 0
        WHEN t.type = 'credit' THEN t.amount
        ELSE -t.amount
      END)
     FROM Transactions t WHERE t.customer_id = c.id) as balance,
    (SELECT SUM(CASE
        WHEN t.type = 'credit' THEN t.item_qty
        ELSE -t.item_qty
      END)
     FROM Transactions t WHERE t.customer_id = c.id) as stock_balance
    FROM Customers c
    JOIN Transactions t ON t.customer_id = c.id
    WHERE DATE(t.date) = DATE('now', 'localtime')
    ORDER BY c.name ASC
  `);

  const rows = results[0].rows;
  for (let index = 0; index < rows.length; index++) {
    customers.push(rows.item(index));
  }
  return customers;
};

export const getCustomerById = async (
  db: SQLiteDatabase,
  id: number,
): Promise<Customer | null> => {
  const results = await db.executeSql(
    `
    SELECT c.*,
    (SELECT SUM(CASE
        WHEN t.status = 'paid' THEN 0
        WHEN t.type = 'credit' THEN t.amount
        ELSE -t.amount
      END)
     FROM Transactions t WHERE t.customer_id = c.id) as balance,
    (SELECT SUM(CASE
        WHEN t.type = 'credit' THEN t.item_qty
        ELSE -t.item_qty
      END)
     FROM Transactions t WHERE t.customer_id = c.id) as stock_balance
    FROM Customers c WHERE c.id = ?
  `,
    [id],
  );

  const rows = results[0].rows;
  if (rows.length > 0) {
    return rows.item(0);
  }
  return null;
};

export const deleteCustomer = async (db: SQLiteDatabase, id: number) => {
  await db.executeSql('DELETE FROM Transactions WHERE customer_id = ?', [id]);
  return db.executeSql('DELETE FROM Customers WHERE id = ?', [id]);
};

export const addTransaction = async (
  db: SQLiteDatabase,
  transaction: Omit<Transaction, 'id' | 'created_at'>,
) => {
  // 1. Insert Transaction
  const query = `INSERT INTO Transactions (customer_id, amount, type, item_name, item_qty, product_id, payment_mode, status, date, due_date, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const result = await db.executeSql(query, [
    transaction.customer_id,
    transaction.amount,
    transaction.type,
    transaction.item_name || '',
    transaction.item_qty || 0,
    transaction.product_id || null,
    transaction.payment_mode || 'none',
    transaction.status || 'pending',
    transaction.date,
    transaction.due_date || null,
    transaction.description || '',
  ]);

  const transactionId = result[0].insertId;

  // 2. Handle Stock Movement if product_id is provided
  if (
    transaction.product_id &&
    transaction.item_qty &&
    transaction.item_qty > 0
  ) {
    // If 'debit' (YOU GAVE), stock goes OUT
    // If 'credit' (YOU GOT), and it's an item, it could be a return (stock IN)
    // However, usually ledger entries are cash-based. If an item is specified:
    const movementType = transaction.type === 'debit' ? 'out' : 'in';

    await addStockMovement(db, {
      product_id: transaction.product_id,
      quantity: transaction.item_qty,
      type: movementType,
      price: transaction.amount / transaction.item_qty, // Estimated unit price
      date: transaction.date,
    });
  }

  // 3. Fetch Customer Name
  const customerResult = await db.executeSql(
    'SELECT name FROM Customers WHERE id = ?',
    [transaction.customer_id],
  );
  const customerName =
    customerResult[0].rows.length > 0
      ? customerResult[0].rows.item(0).name
      : 'Unknown';

  // 4. Create Bill
  const billNumber = `BILL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const billQuery = `INSERT INTO Bills (transaction_id, bill_number, customer_name, amount, date) VALUES (?, ?, ?, ?, ?)`;
  await db.executeSql(billQuery, [
    transactionId,
    billNumber,
    customerName,
    transaction.amount,
    transaction.date,
  ]);

  return result;
};

export const getTransactions = async (
  db: SQLiteDatabase,
  customerId: number,
): Promise<(Transaction & { product_purchase_price?: number })[]> => {
  const transactions: (Transaction & { product_purchase_price?: number })[] =
    [];
  const results = await db.executeSql(
    'SELECT t.*, p.purchase_price as product_purchase_price FROM Transactions t LEFT JOIN Products p ON t.product_id = p.id WHERE t.customer_id = ? ORDER BY t.date DESC, t.created_at DESC',
    [customerId],
  );

  const rows = results[0].rows;
  for (let index = 0; index < rows.length; index++) {
    transactions.push(rows.item(index));
  }
  return transactions;
};

export const deleteTransaction = async (db: SQLiteDatabase, id: number) => {
  return db.executeSql('DELETE FROM Transactions WHERE id = ?', [id]);
};

export const updateTransaction = async (
  db: SQLiteDatabase,
  id: number,
  transaction: Omit<Transaction, 'id' | 'created_at'>,
) => {
  const query = `UPDATE Transactions SET
    customer_id = ?,
    amount = ?,
    type = ?,
    item_name = ?,
    item_qty = ?,
    product_id = ?,
    payment_mode = ?,
    status = ?,
    date = ?,
    due_date = ?,
    description = ?
    WHERE id = ?`;

  await db.executeSql(query, [
    transaction.customer_id,
    transaction.amount,
    transaction.type,
    transaction.item_name || '',
    transaction.item_qty || 0,
    transaction.product_id || null,
    transaction.payment_mode || 'none',
    transaction.status || 'pending',
    transaction.date,
    transaction.due_date || null,
    transaction.description || '',
    id,
  ]);

  // Update corresponding bill
  await db.executeSql(
    'UPDATE Bills SET amount = ?, date = ? WHERE transaction_id = ?',
    [transaction.amount, transaction.date, id],
  );

  return true;
};

export const deleteAllData = async (db: SQLiteDatabase) => {
  await db.executeSql('DELETE FROM Bills');
  await db.executeSql('DELETE FROM Transactions');
  await db.executeSql('DELETE FROM Customers');
};

// Bill Services
export const getBills = async (db: SQLiteDatabase): Promise<Bill[]> => {
  const bills: Bill[] = [];
  const results = await db.executeSql('SELECT * FROM Bills ORDER BY date DESC');
  const rows = results[0].rows;
  for (let index = 0; index < rows.length; index++) {
    bills.push(rows.item(index));
  }
  return bills;
};

export const deleteBill = async (db: SQLiteDatabase, id: number) => {
  return db.executeSql('DELETE FROM Bills WHERE id = ?', [id]);
};

// Item Order Services
export const addItemOrder = async (
  db: SQLiteDatabase,
  order: Omit<ItemOrder, 'id' | 'created_at'>,
) => {
  const query = `INSERT INTO ItemOrders (
    product_id,
    product_name,
    quantity,
    status,
    transporter_name,
    delivery_man,
    contact_number,
    pickup_location,
    seller_name,
    seller_contact,
    date
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  return db.executeSql(query, [
    order.product_id || null,
    order.product_name,
    order.quantity,
    order.status || 'pending',
    order.transporter_name || '',
    order.delivery_man || '',
    order.contact_number || '',
    order.pickup_location || '',
    order.seller_name || '',
    order.seller_contact || '',
    order.date,
  ]);
};

export const getItemOrders = async (
  db: SQLiteDatabase,
): Promise<ItemOrder[]> => {
  const orders: ItemOrder[] = [];
  const results = await db.executeSql(
    'SELECT * FROM ItemOrders ORDER BY date DESC',
  );
  const rows = results[0].rows;
  for (let index = 0; index < rows.length; index++) {
    orders.push(rows.item(index));
  }
  return orders;
};

export const updateItemOrderStatus = async (
  db: SQLiteDatabase,
  id: number,
  status: string,
) => {
  // 1. Fetch current order to check status and get info
  const orderResults = await db.executeSql(
    'SELECT * FROM ItemOrders WHERE id = ?',
    [id],
  );
  const order =
    orderResults[0].rows.length > 0 ? orderResults[0].rows.item(0) : null;

  // 2. If transitioning to 'delivered' and was not already delivered
  if (
    order &&
    status === 'delivered' &&
    order.status !== 'delivered' &&
    order.product_id
  ) {
    // Fetch product to get purchase price for history
    const productResults = await db.executeSql(
      'SELECT * FROM Products WHERE id = ?',
      [order.product_id],
    );
    const product =
      productResults[0].rows.length > 0 ? productResults[0].rows.item(0) : null;

    // Record stock movement (This also updates Products table quantity)
    await addStockMovement(db, {
      product_id: order.product_id,
      quantity: order.quantity,
      type: 'in',
      price: product?.purchase_price || 0,
      date: new Date().toISOString(),
    });
  }

  const query = `UPDATE ItemOrders SET status = ? WHERE id = ?`;
  return db.executeSql(query, [status, id]);
};

export const deleteItemOrder = async (db: SQLiteDatabase, id: number) => {
  return db.executeSql('DELETE FROM ItemOrders WHERE id = ?', [id]);
};

export const getItemOrderById = async (
  db: SQLiteDatabase,
  id: number,
): Promise<ItemOrder | null> => {
  const results = await db.executeSql('SELECT * FROM ItemOrders WHERE id = ?', [
    id,
  ]);
  const rows = results[0].rows;
  if (rows.length > 0) {
    return rows.item(0);
  }
  return null;
};

export const updateItemOrderDetails = async (
  db: SQLiteDatabase,
  id: number,
  details: Partial<ItemOrder>,
) => {
  const query = `UPDATE ItemOrders SET
    transporter_name = ?,
    delivery_man = ?,
    contact_number = ?,
    pickup_location = ?,
    seller_name = ?,
    seller_contact = ?
    WHERE id = ?`;
  return db.executeSql(query, [
    details.transporter_name,
    details.delivery_man,
    details.contact_number,
    details.pickup_location,
    details.seller_name,
    details.seller_contact,
    id,
  ]);
};

export const getBillById = async (
  db: SQLiteDatabase,
  id: number,
): Promise<Bill | null> => {
  const results = await db.executeSql('SELECT * FROM Bills WHERE id = ?', [id]);
  const rows = results[0].rows;
  if (rows.length > 0) {
    return rows.item(0);
  }
  return null;
};

export const getBusinessStats = async (
  db: SQLiteDatabase,
): Promise<{
  totalProfit: number;
  totalSold: number;
  todayProfit: number;
  todaySold: number;
}> => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const query = `
    SELECT
      SUM(t.amount - (p.purchase_price * t.item_qty)) as total_profit,
      SUM(t.item_qty) as total_sold,
      SUM(CASE WHEN t.date LIKE '${today}%' THEN (t.amount - (p.purchase_price * t.item_qty)) ELSE 0 END) as today_profit,
      SUM(CASE WHEN t.date LIKE '${today}%' THEN t.item_qty ELSE 0 END) as today_sold
    FROM Transactions t
    JOIN Products p ON t.product_id = p.id
    WHERE t.type = 'debit' AND t.item_qty > 0
  `;
  const results = await db.executeSql(query);
  const row = results[0].rows.item(0);
  return {
    totalProfit: row.total_profit || 0,
    totalSold: row.total_sold || 0,
    todayProfit: row.today_profit || 0,
    todaySold: row.today_sold || 0,
  };
};

export const getTransactionById = async (
  db: SQLiteDatabase,
  id: number,
): Promise<Transaction | null> => {
  const results = await db.executeSql(
    'SELECT t.*, p.purchase_price as product_purchase_price FROM Transactions t LEFT JOIN Products p ON t.product_id = p.id WHERE t.id = ?',
    [id],
  );
  const rows = results[0].rows;
  if (rows.length > 0) {
    return rows.item(0);
  }
  return null;
};

// Task Services
export const getTasks = async (db: SQLiteDatabase): Promise<Task[]> => {
  const tasks: Task[] = [];
  const results = await db.executeSql(
    'SELECT * FROM Tasks ORDER BY status ASC, due_date ASC, created_at DESC',
  );
  const rows = results[0].rows;
  for (let index = 0; index < rows.length; index++) {
    tasks.push(rows.item(index));
  }
  return tasks;
};

export const addTask = async (
  db: SQLiteDatabase,
  task: Omit<Task, 'id' | 'created_at' | 'updated_at'>,
) => {
  const query = `INSERT INTO Tasks (title, description, status, type, related_id, due_date) VALUES (?, ?, ?, ?, ?, ?)`;
  return db.executeSql(query, [
    task.title,
    task.description || '',
    task.status || 'pending',
    task.type || 'manual',
    task.related_id || null,
    task.due_date || new Date().toISOString(),
  ]);
};

export const updateTask = async (
  db: SQLiteDatabase,
  id: number,
  task: Partial<Omit<Task, 'id' | 'created_at'>>,
) => {
  const fields = Object.keys(task);
  const values = Object.values(task);
  const setClause = fields
    .map(f => `${f} = ?`)
    .join(', ')
    .concat(', updated_at = CURRENT_TIMESTAMP');

  const query = `UPDATE Tasks SET ${setClause} WHERE id = ?`;
  return db.executeSql(query, [...values, id]);
};

export const deleteTask = async (db: SQLiteDatabase, id: number) => {
  return db.executeSql('DELETE FROM Tasks WHERE id = ?', [id]);
};

export const generateAutoTasks = async (db: SQLiteDatabase) => {
  try {
    // 1. Check for Low Stock
    const products = await db.executeSql(
      'SELECT id, name, quantity, unit FROM Products WHERE quantity < 5',
    );
    const lowStockRows = products[0].rows;

    for (let i = 0; i < lowStockRows.length; i++) {
      const product = lowStockRows.item(i);
      const title = `Order Stock: ${product.name}`;
      const description = `Stock is Low (${product.quantity} ${product.unit}). Please order more units.`;

      // Check if task already exists for this product
      const existing = await db.executeSql(
        "SELECT id FROM Tasks WHERE related_id = ? AND type = 'auto_stock'",
        [product.id],
      );

      if (existing[0].rows.length === 0) {
        await addTask(db, {
          title,
          description,
          status: 'pending',
          type: 'auto_stock',
          related_id: product.id,
          due_date: new Date().toISOString(),
        });
      }
    }

    // 2. Check for Pending Payment Collections
    const today = new Date().toISOString().split('T')[0];
    const pendingPayments = await db.executeSql(
      `SELECT t.id, t.amount, t.type as tx_type, c.name as customer_name, t.customer_id
       FROM Transactions t
       JOIN Customers c ON t.customer_id = c.id
       WHERE t.status = 'pending' AND t.type = 'credit' AND t.date LIKE '${today}%'`,
    );
    const paymentRows = pendingPayments[0].rows;

    for (let i = 0; i < paymentRows.length; i++) {
      const payment = paymentRows.item(i);
      const title = `Collect ₹${payment.amount} from ${payment.customer_name}`;
      const description = `Collection for ${payment.tx_type.toUpperCase()} entry made today.`;

      // Check if task already exists
      const existing = await db.executeSql(
        "SELECT id FROM Tasks WHERE related_id = ? AND type = 'auto_payment'",
        [payment.id],
      );

      if (existing[0].rows.length === 0) {
        await addTask(db, {
          title,
          description,
          status: 'pending',
          type: 'auto_payment',
          related_id: payment.id,
          due_date: new Date().toISOString(),
        });
      }
    }

    // 3. Check for Future Payments (including upcoming)
    const futureDuePayments = await db.executeSql(
      `SELECT t.id, t.amount, t.type as tx_type, c.name as customer_name, t.customer_id, t.due_date
       FROM Transactions t
       JOIN Customers c ON t.customer_id = c.id
       WHERE t.payment_mode = 'future' AND t.status = 'pending'`,
    );
    const futureRows = futureDuePayments[0].rows;

    for (let i = 0; i < futureRows.length; i++) {
      const payment = futureRows.item(i);
      const title = `PENDING: Future Pay (${payment.tx_type.toUpperCase()}) from ${
        payment.customer_name
      }`;
      const description = `₹${payment.amount} scheduled for ${
        payment.due_date ? payment.due_date.split('T')[0] : 'today'
      }.`;

      // Check if task already exists
      const existing = await db.executeSql(
        "SELECT id FROM Tasks WHERE related_id = ? AND type = 'auto_payment'",
        [payment.id],
      );

      if (existing[0].rows.length === 0) {
        await addTask(db, {
          title,
          description,
          status: 'pending',
          type: 'auto_payment',
          related_id: payment.id,
          due_date: payment.due_date || new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    console.error('Error generating auto tasks:', error);
  }
};
