import { defaultTransitionConfig } from '@app/configs/animation';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { mobileWindowSizeConfig } from "@app/configs/windowSize";

enum AnimatedTextTypeEnum {
  primary = 'primary',
  secondary = 'secondary',
}

const Container = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: flex-start;
  align-items: flex-start;
  align-content: flex-start;
`;

type ParagraphProps = {
  type: AnimatedTextTypeEnum;
};

const Paragraph = styled.p<ParagraphProps>`
  position: relative;
  color: ${({ type }) =>
    type === AnimatedTextTypeEnum.primary
      ? 'var(--secondary-inverted-color)'
      : 'var(--tertiary-inverted-color)'};
  font: var(--font-l);
  width: 100%;
  margin: 0;
`;

const TokenContainer = styled(motion.span)`
  overflow: hidden;
  position: relative;
  display: inline-block;
  box-sizing: content-box;
  white-space: nowrap;
  font: var(--font-l);
  margin: 0;

  @media (max-width: ${mobileWindowSizeConfig?.widthString}) {
    font: var(--font-m);
    line-height: 1;
  }
`;

const Token = styled(motion.span)`
  display: inline-block;
  white-space: pre-wrap;
`;

type Props = {
  children: string;
  type?: AnimatedTextTypeEnum;
};

const AnimatedText = ({ children, type = AnimatedTextTypeEnum.primary }: Props) => {
  return (
    <Container>
      <Paragraph type={type}>
        {children.split(' ').map((word, index) => (
          <TokenContainer key={index}>
            <Token
              animate={{
                y: 0,
                opacity: 1,
              }}
              initial={{ y: 20, opacity: 0 }}
              transition={{
                ...defaultTransitionConfig,
                delay: (index + 1) * 0.005,
              }}>
              {word}{' '}
            </Token>
          </TokenContainer>
        ))}
      </Paragraph>
    </Container>
  );
};

export { AnimatedText, AnimatedTextTypeEnum };
