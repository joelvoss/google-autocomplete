import React from 'react';
import PropTypes from 'prop-types';
import DOMPurify from 'dompurify';
import styled from 'react-emotion';

/**
 * Google Autocomplete JSX Elements:
 * - Container
 * - Input
 * -- Wrapper
 * -- Select
 * -- Button
 * - List
 * -- Wrap
 * -- Item
 * -- MainText
 * -- SecondaryText
 * - Icon
 * -- Search
 * -- Close
 */

/**
 * Module variables.
 */
const shadowColor = 'rgba(0,0,0,0.06)';
const borderColor = 'rgba(0,0,0,0.1)';
const borderRadius = '0.2em';

/**
 * General Container
 */
export const Container = styled.div`
  margin: 0 auto;
  width: 100%;
  max-width: 600px;
`;

/**
 * Input wrapper <div>
 */
const InputWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  box-shadow: 0 2px 3px ${shadowColor};

  border-width: 1px;
  border-style: solid;
  border-top-right-radius: ${borderRadius};
  border-top-left-radius: ${borderRadius};
  border-bottom-right-radius: ${p => (p.open ? '0' : borderRadius)};
  border-bottom-left-radius: ${p => (p.open ? '0' : borderRadius)};
  border-top-color: ${borderColor};
  border-left-color: ${borderColor};
  border-right-color: ${borderColor};
  border-bottom-color: ${p => (p.open ? 'transparent' : borderColor)};

  &:before {
    content: '';
    position: absolute;
    z-index: -1;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    top: 0;
    bottom: 0;
    left: 0.5em;
    right: 0.5em;
    border-radius: 25%;
  }
`;

/**
 * Input element
 */
const InputSelect = styled.input`
  font-size: 1.25rem;
  padding: 0.5em 1em;
  width: 100%;
  outline: none;
  border: none;
  overflow: hidden;
  text-overflow: ellipsis;
`;

/**
 * Input button
 */
const InputButton = styled.span`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  font-size: 1.25rem;
  padding: 0.5em 1em;
  color: #999;
  cursor: pointer;
  background-color: #fff;
  transition: all 275ms ease-in-out;

  &:hover {
    background-color: #f0f0f0;
    color: #333;
  }

  & svg {
    width: 0.85em;
    height: 0.85em;
    fill: currentColor;
  }
`;

/**
 * Export combined input components
 */
export const Input = {
  Wrap: InputWrapper,
  Select: InputSelect,
  Button: InputButton
};

/**
 * List wrapper <ul>
 */
const ListWrapper = styled.ul`
  position: relative;
  list-style: none;
  margin: -1px 0 0 0;
  padding: 0;
  border: 1px solid ${borderColor};
  border-top: none;
  box-shadow: 0 2px 3px ${shadowColor};
  max-height: 50vh;
  overflow: auto;
`;

/**
 * List item <li>
 */
const ListItem = styled.li`
  font-size: 0.8em;
  padding: 0.5em 1em;
  font-weight: ${p => (p.selected ? 'bold' : 'normal')};
  background-color: ${p => (p.selected || p.highlighted ? '#f0f0f0' : '#fff')};
  transition: background-color 0.1s ease-in-out;
  text-align: left;
  border-top: 1px solid #e6e6e6;

  & em {
    font-style: normal;
    font-weight: bold;
  }
`;

/**
 * Main text of a list item.
 * @param {Object} props - Component props.
 */
const ListItemMainText = ({ text }) => (
  <span
    dangerouslySetInnerHTML={{
      __html: DOMPurify.sanitize(text)
    }}
  />
);
ListItemMainText.propTypes = {
  text: PropTypes.string.isRequired
};

/**
 * Secondary text of a list item.
 * @param {Object} props - Component props.
 */
const ListItemSecondaryText = ({ text }) => {
  const Span = styled.span`
    color: #8c8c8c;
  `;
  return (
    <Span
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(text)
      }}
    />
  );
};
ListItemSecondaryText.propTypes = {
  text: PropTypes.string.isRequired
};

/**
 * Export combined list components
 */
export const List = {
  Wrap: ListWrapper,
  Item: ListItem,
  MainText: ListItemMainText,
  SecondaryText: ListItemSecondaryText
};

/**
 * Search icon (🔎)
 * @param {Object} props - Component props
 */
const SearchIcon = props => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <path d="M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l28.3-28.3c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z" />
  </svg>
);

/**
 * Close icon (X)
 * @param {Object} props - Component props
 */
const CloseIcon = props => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
    <path d="M231.6 256l130.1-130.1c4.7-4.7 4.7-12.3 0-17l-22.6-22.6c-4.7-4.7-12.3-4.7-17 0L192 216.4 61.9 86.3c-4.7-4.7-12.3-4.7-17 0l-22.6 22.6c-4.7 4.7-4.7 12.3 0 17L152.4 256 22.3 386.1c-4.7 4.7-4.7 12.3 0 17l22.6 22.6c4.7 4.7 12.3 4.7 17 0L192 295.6l130.1 130.1c4.7 4.7 12.3 4.7 17 0l22.6-22.6c4.7-4.7 4.7-12.3 0-17L231.6 256z" />
  </svg>
);

/**
 * Export combined icon components.
 */
export const Icon = {
  Search: SearchIcon,
  Close: CloseIcon
};
