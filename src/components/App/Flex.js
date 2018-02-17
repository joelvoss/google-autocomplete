import styled from 'react-emotion';

/**
 * Base flex component.
 * Retruns both flex-row-container and -item.
 */
export const Flex = {
  Row: styled.div`
    display: flex;
    flex-direction: row;
    margin: 0 auto 1rem auto;
    width: 100%;
    max-width: 600px;
  `,
  Item: styled.div`
    flex: 1;
    text-align: center;
  `
};
