import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { Customer, Transaction } from '../database/database';
import { format } from 'date-fns';

export const exportToCSV = async (
  customers: Customer[],
  allTransactions: Transaction[],
) => {
  try {
    let csvContent = 'Customer,Date,Type,Amount,Description\n';

    customers.forEach(customer => {
      const transactions = allTransactions.filter(
        t => t.customer_id === customer.id,
      );
      transactions.forEach(t => {
        csvContent += `"${customer.name}","${format(
          new Date(t.date),
          'yyyy-MM-dd HH:mm',
        )}","${t.type}","${t.amount}","${t.description || ''}"\n`;
      });
    });

    const path = `${RNFS.TemporaryDirectoryPath}/Ledger_Export_${format(
      new Date(),
      'yyyyMMdd',
    )}.csv`;
    await RNFS.writeFile(path, csvContent, 'utf8');

    await Share.open({
      url: `file://${path}`,
      type: 'text/csv',
      title: 'Export Ledger CSV',
      message: 'Here is your business ledger report.',
    });
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
};
