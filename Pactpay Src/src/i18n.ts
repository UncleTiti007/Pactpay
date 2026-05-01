import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import hu from './locales/hu.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import de from './locales/de.json';
import it from './locales/it.json';
import ar from './locales/ar.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';
import ru from './locales/ru.json';
import nl from './locales/nl.json';
import pl from './locales/pl.json';
import tr from './locales/tr.json';
import ko from './locales/ko.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hu: { translation: hu },
      fr: { translation: fr },
      es: { translation: es },
      pt: { translation: pt },
      de: { translation: de },
      it: { translation: it },
      ar: { translation: ar },
      zh: { translation: zh },
      ja: { translation: ja },
      ru: { translation: ru },
      nl: { translation: nl },
      pl: { translation: pl },
      tr: { translation: tr },
      ko: { translation: ko },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'hu', 'fr', 'es', 'pt', 'de', 'it', 'ar', 'zh', 'ja', 'ru', 'nl', 'pl', 'tr', 'ko'],
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'pactpay_language',
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
