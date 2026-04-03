import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { DatabaseProvider } from './src/context/DatabaseContext';
import { AppNavigator } from './src/navigation/AppNavigator';

import { ToastProvider } from './src/context/ToastContext';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  scopes: ['https://www.googleapis.com/auth/drive.file'],
  // Get this from Firebase Console -> Authentication -> Sign-in method -> Google -> Web SDK configuration
  webClientId:
    '913150797632-glmorbmcvca4ustmt06qhleqkgito7ct.apps.googleusercontent.com',
});

const App = () => {
  return (
    <DatabaseProvider>
      <ToastProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </ToastProvider>
    </DatabaseProvider>
  );
};

export default App;
