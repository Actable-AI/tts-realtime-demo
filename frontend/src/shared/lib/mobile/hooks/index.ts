import { useEffect, useState } from 'react';
import { mobileWindowSizeConfig } from '@app/configs/windowSize';

/**
 * Hook to detect if the user is on a mobile device.
 * @returns {boolean} isMobile
 * @example
 * const isMobile = useIsMobile();
 * if (isMobile) {
 *  // do something
 * }
 */
const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < mobileWindowSizeConfig.width);
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};

export { useIsMobile };
