import { useState, useEffect, useCallback } from 'react';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@react-native-voice/voice';
import Tts from 'react-native-tts';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const useVoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    Tts.setDefaultLanguage('en-US');
    Tts.setDefaultRate(0.5);

    // Configure Voice
    Voice.onSpeechStart = () => setIsListening(true);
    Voice.onSpeechEnd = () => setIsListening(false);
    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      console.error('onSpeechError: ', e);
      setIsListening(false);
    };
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value.length > 0) {
        const command = e.value[0];
        setRecognizedText(command);
        processCommand(command);
      }
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
      Tts.stop();
    };
  }, []);

  const processCommand = (command: string) => {
    const text = command.toLowerCase();

    if (text.includes('add customer') || text.includes('new customer')) {
      navigation.navigate('AddCustomer' as any);
    } else if (
      text.includes('add entry') ||
      text.includes('new entry') ||
      text.includes('add transaction') ||
      text.includes('payment')
    ) {
      // Since AddEntry needs a customerId, we navigate to Customers screen first
      navigation.navigate('Customers' as any);
    } else if (text.includes('add item') || text.includes('new item')) {
      navigation.navigate('AddItem' as any);
    } else if (text.includes('report') || text.includes('view report')) {
      navigation.navigate('Reports' as any);
    } else if (text.includes('bill') || text.includes('invoice')) {
      navigation.navigate('Bills' as any);
    } else if (text.includes('backup')) {
      navigation.navigate('Backup' as any);
    } else if (text.includes('setting')) {
      navigation.navigate('Settings' as any);
    } else if (text.includes('home') || text.includes('dashboard')) {
      navigation.navigate('Main' as any);
    }
  };

  const startListening = async () => {
    try {
      setRecognizedText('');
      await Voice.start('en-US');
    } catch (e) {
      console.error('Voice.start error:', e);
    }
  };

  const askQuestion = useCallback((question: string) => {
    Tts.stop();
    Tts.speak(question);

    const onFinish = (event: any) => {
      startListening();
      // Use the specific removal if possible, but addEventListener returns a subscription in newer versions
    };

    const subscription = Tts.addListener('tts-finish', event => {
      startListening();
      subscription.remove();
    });
  }, []);

  return {
    isListening,
    recognizedText,
    askQuestion,
    startListening,
    stopListening: async () => {
      try {
        await Voice.stop();
      } catch (e) {
        console.error(e);
      }
    },
  };
};
