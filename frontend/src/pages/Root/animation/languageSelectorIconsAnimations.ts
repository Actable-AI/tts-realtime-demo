import { LanguagesTranslationConfigValuesType } from '@modules/Translation';
import { AnimationControls } from 'framer-motion';

type Props = {
  language: LanguagesTranslationConfigValuesType;
  languages: LanguagesTranslationConfigValuesType[];
  isAutoDetect: boolean;
};

type ReturnType = Record<LanguagesTranslationConfigValuesType, AnimationControls>;

let cachedConfig: ReturnType = {} as ReturnType;

const getLanguageSelectorIconsAnimations = ({ language, languages, isAutoDetect }: Props): ReturnType => {
  const cachedList: LanguagesTranslationConfigValuesType[] =
    new Array<LanguagesTranslationConfigValuesType>();
  if (cachedList[0] === language) return cachedConfig;

  if (!cachedList.length) {
    languages.forEach((language: LanguagesTranslationConfigValuesType) => {
      cachedList.push(language);
    });
  }

  const lastLanguage = cachedList.shift() || languages[0];
  cachedList.push(lastLanguage);

  cachedConfig = cachedList.reduce(
    (acc: ReturnType, currentLanguage: LanguagesTranslationConfigValuesType) => {
      const isCurrentLanguage = currentLanguage === language;
      const isLastLanguage = currentLanguage === lastLanguage;

      const animation = {
        zIndex: isCurrentLanguage ? 1 : 0,
        x: isCurrentLanguage ? -20 : isLastLanguage ? (isAutoDetect ? 30 : 20) : isAutoDetect ? -30 : 20,
        y: isCurrentLanguage ? 0 : isAutoDetect ? 0 : 20,
        opacity: isCurrentLanguage ? 1 : isAutoDetect ? 0.7 : 0.3,
        scale: isCurrentLanguage ? 0.9 : isAutoDetect ? 0.6 : 0.5,
      };

      return {
        ...acc,
        [currentLanguage as LanguagesTranslationConfigValuesType]: animation,
      } as ReturnType;
    },
    {} as ReturnType,
  );

  return cachedConfig;
};
export { getLanguageSelectorIconsAnimations };
