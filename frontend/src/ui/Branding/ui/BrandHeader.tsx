import styled from 'styled-components';
import { BigLogo } from './BigLogo';
import { mobileWindowSizeConfig } from "@app/configs/windowSize";

const Container = styled.div`
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  padding: var(--spacing-m) var(--spacing-l);
  border-radius: 0 0 var(--border-radius-l) var(--border-radius-l);
  -webkit-box-shadow: var(--paper-shadow);
  -moz-box-shadow: var(--paper-shadow);
  box-shadow: var(--paper-shadow);

  @media (max-width: ${mobileWindowSizeConfig?.widthString}) {
    left: 0;
    top: 0;
    height: 32px;
    transform: none;
    box-shadow: none;
    padding: 20px;
    box-sizing: content-box;
  }
`;

const logo = import.meta.env.VITE_AZURE_BIG_LOGO_URL

const isMobile = window.innerWidth < mobileWindowSizeConfig.width

const width = isMobile ? 110 : 150
const height = isMobile ? 16 : 22

const BrandHeader = () => logo ? (
  <Container>
    {/*<BigLogo width={width} height={height} />*/}
  </Container>
) : null;

export { BrandHeader };
