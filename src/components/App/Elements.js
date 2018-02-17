import React from 'react';
import PropTypes from 'prop-types';
import styled from 'react-emotion';

/**
 * Label component.
 */
export const Label = styled.label`
  display: block;
  width: 100%;
`;

export const Pre = styled.pre`
  margin: 0 auto;
  width: 100%;
  max-width: 600px;
  padding: 1rem 0;
`


/**
 * Base header component.
 * @param {Object} props - Componen props.
 *                         (directly destructured the title key)
 */
export const Header = ({ title }) => {
  const Wrapper = styled.div`
    margin: 1em;
    font-size: 1rem;
    text-align: center;
  `;
  return (
    <Wrapper>
      <h1>{title}</h1>
    </Wrapper>
  );
}
Header.propTypes = {
  title: PropTypes.string.isRequired
}
