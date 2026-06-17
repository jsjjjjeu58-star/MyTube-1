import React from 'react';
import { View, Text, Button } from 'react-native';
import { useLanguage } from './LanguageContext'; // 👈 ইমপোর্ট করুন

export default function MyScreen() {
  // 't' দিয়ে ট্রান্সলেট করবেন এবং 'changeLanguage' দিয়ে ভাষা বদলাবেন
  const { t, language, changeLanguage } = useLanguage(); 

  return (
    <View>
      {/* t('home') লিখলেই যদি ভাষা বাংলা থাকে তবে "হোম" দেখাবে, ইংরেজি থাকলে "Home" দেখাবে */}
      <Text>{t('home')}</Text> 

      <Button 
        title="Change to English" 
        onPress={() => changeLanguage('en')} 
      />
      <Button 
        title="বাংলায় পরিবর্তন করুন" 
        onPress={() => changeLanguage('bn')} 
      />
    </View>
  );
}