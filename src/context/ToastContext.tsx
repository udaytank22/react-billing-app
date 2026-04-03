import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';

const { width } = Dimensions.get('window');

type ToastType = 'success' | 'error' | 'info';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('info');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<any>(null);

  const hideToast = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      progressAnim.setValue(0);
    });
  }, [fadeAnim, progressAnim]);

  const showToast = useCallback(
    (msg: string, toastType: ToastType = 'info') => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setMessage(msg);
      setType(toastType);
      setVisible(true);
      progressAnim.setValue(0);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: false, // width/scaleX usually doesn't work with native driver for progress bars easily without layouts
      }).start();

      timerRef.current = setTimeout(() => {
        hideToast();
      }, 3000);
    },
    [fadeAnim, progressAnim, hideToast],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible && (
        <Animated.View style={[styles.toastContainer, { opacity: fadeAnim }]}>
          <View style={styles.content}>
            <Text style={styles.message}>{message}</Text>
            <View style={styles.progressBarBackground}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                    backgroundColor:
                      type === 'error'
                        ? Colors.danger
                        : type === 'success'
                        ? '#FF4B4B'
                        : Colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  content: {
    backgroundColor: '#333333',
    borderRadius: 6,
    overflow: 'hidden',
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 14,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  progressBarBackground: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF4B4B', // Success red as seen in image
  },
});
