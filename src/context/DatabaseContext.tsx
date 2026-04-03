import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { SQLiteDatabase } from 'react-native-sqlite-storage';
import { getDBConnection, createTables } from '../database/database';

import AsyncStorage from '@react-native-async-storage/async-storage';

interface DatabaseContextType {
  db: SQLiteDatabase | null;
  isLoading: boolean;
  refreshDatabase: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType>({
  db: null,
  isLoading: true,
  refreshDatabase: async () => {},
});

export const useDatabase = () => useContext(DatabaseContext);

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const initDB = useCallback(async () => {
    try {
      setIsLoading(true);
      const userStr = await AsyncStorage.getItem('user');
      let userId: string | undefined;

      if (userStr) {
        const user = JSON.parse(userStr);
        userId = user?.user?.id;
      }

      // Close previous connection if exists
      if (db) {
        try {
          await db.close();
        } catch (e) {
          // ignore close errors
        }
      }

      const database = await getDBConnection(userId);
      await createTables(database);
      setDb(database);
    } catch (error) {
      console.error('Failed to initialize database:', error);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    initDB();
  }, []); // Initialize on mount

  return (
    <DatabaseContext.Provider
      value={{ db, isLoading, refreshDatabase: initDB }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};
