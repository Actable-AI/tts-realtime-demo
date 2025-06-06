import styled from 'styled-components';

const HorizontalDivider = styled.div`
  width: 100%;
  border-top: 1px solid var(--paper-border-color);
`;

const VerticalDivider = styled.div`
  align-self: stretch;
  height: auto;
  border-left: 1px solid var(--paper-border-color);
`;

export { HorizontalDivider, VerticalDivider };
