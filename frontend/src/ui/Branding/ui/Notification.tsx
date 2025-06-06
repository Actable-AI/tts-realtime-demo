import { useEffect, useMemo, useRef, useState } from 'react';
import { defaultTransitionConfig } from '@app/configs/animation';
import { motion } from 'framer-motion';
import styled from 'styled-components';

const Layout = styled.div`
  z-index: var(--island-z-index);
  position: fixed;
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  align-content: center;
  overflow: hidden;
  top: 0;
  width: calc(100% - 40px);
  padding: var(--spacing-s) 0;
`;

const Container = styled(motion.div)`
  width: auto;
  background-color: var(--bg-ghost-color);
  border-radius: var(--border-radius-l);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: flex-start;
  align-content: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-s) var(--spacing-m);
  font: var(--font-m);
  padding-bottom: var(--spacing-xs);
  line-height: 1.2;

  span {
    font: var(--font-s);
    font-style: italic;
  }
`;

type Props = {
  isOpen: boolean;
  onCancel: () => void;
  title: string;
  message?: string;
};

const Notification = ({ isOpen, onCancel, title, message }: Props) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [hide, setHide] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHide(false);

      timeoutRef.current = setTimeout(() => {
        setHide(true);
        onCancel()
      }, 1000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isOpen]);

  return (
    <Layout>
      <Container
        animate={{
          y: hide ? -40 : 0,
          opacity: hide ? 0 : 1,
          color: 'var(--secondary-inverted-color)',
        }}
        initial={{ y: -40, opacity: 0 }}
        transition={defaultTransitionConfig}
      >
        <p>{title}</p>

        <span>{message}</span>
      </Container>
    </Layout>
  );
};

export { Notification };
