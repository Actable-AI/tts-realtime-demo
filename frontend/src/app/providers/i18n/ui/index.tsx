import { useTranslation } from 'react-i18next';
import { i18nQueryKey } from '@app/configs/i18n';
import { LanguagesEnum } from '@app/configs/i18n';
import { useQuery } from '@tanstack/react-query';

type Props = {
  children: React.ReactNode;
};

const I18nProvider = ({ children }: Props) => {
  const { i18n } = useTranslation();

  useQuery({
    queryKey: [i18nQueryKey],
    // queryFn: () => userControllerGetLanguage(), // TODO: Implement this function
    onError() {
      i18n.changeLanguage(LanguagesEnum.english);
    },
    onSuccess({ language }: { language: LanguagesEnum }) {
      if (!Object.values(LanguagesEnum).includes(language)) return;

      if (language === i18n.language) return;

      i18n.changeLanguage(language);
    },
    keepPreviousData: true,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return <>{children}</>;
};

export { I18nProvider };
