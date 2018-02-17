/**
 * Takes an argument and if it's an array, returns the first item in the array
 * otherwise returns the argument
 * @param {*} arg the maybe-array
 * @param {*} defaultValue the value if arg is falsey not defined
 * @return {*} the arg or it's first item
 */
export function unwrapArray(arg, defaultValue) {
  arg = Array.isArray(arg) ? /* istanbul ignore next (preact) */ arg[0] : arg;
  if (!arg && defaultValue) {
    return defaultValue;
  } else {
    return arg;
  }
}

/**
 * Function that does nothing.
 * @returns {void}
 */
export function noop() {}

/**
 * This is intended to be used to compose event handlers
 * They are executed in order until one of them calls
 * "event.preventDefault()". Not sure this is the best
 * way to do this, but it seems legit...
 * @param {Function} fns - The event handler functions.
 * @return {Function} - The event handler to add to an element.
 */
export function composeEventHandlers(...fns) {
  return (event, ...args) =>
    fns.some(fn => {
      fn && fn(event, ...args);
      return event.defaultPrevented;
    });
}

/**
 * This generates a unique ID using the following pattern:
 * → "<prefix>-<counter>"
 * The counter starts at "1".
 * @param {String} prefix - Prefix for the id.
 * @return {String} - Unique ID.
 */
let idCounter = 1;
export function generateId(prefix) {
  return `${prefix}-${idCounter++}`;
}

/**
 * Checks if the provided element is a native DOM element.
 * We distinguish between react and preact elements.
 * @param {Object} element - (P)react element
 * @return {Boolean} - Whether it's a DOM element or not.
 */
export function isDOMElement(element) {
  // Preact has a nodeName attribute
  if (element.nodeName) {
    return typeof element.nodeName === 'string';
    // React has a type attribute
  } else {
    return typeof element.type === 'string';
  }
}

/**
 * Get element properties from react OR preact elements.
 * React uses "props", preact "attributes".
 * @param {Object} element - (P)react element.
 * @return {Object} - The props.
 */
export function getElementProps(element) {
  return element.props || element.attributes;
}

/**
 * Returns the first argument that is not undefined.
 * @param {...any} args - The arguments.
 * @return {any} - The defined value.
 */
export function firstDefined(...args) {
  return args.find(a => typeof a !== 'undefined');
}

/**
 * Accepts a parameter and returns it if it's a function
 * or a noop function if it's not. This allows us to
 * accept a callback, but not worry about it if it isn's
 * passed.
 * @param {Function} cb - The callback.
 * @return {Function} - A function.
 */
export function cbToCb(cb) {
  return typeof cb === 'function' ? cb : noop;
}

/**
 * Picks predefined state keys out of a state object.
 * @param {Object} state - The state object.
 * @return {Object} - State that is relevant to the <Autocomplete> component.
 */
const stateKeys = ['highlightedIndex', 'inputValue', 'isOpen', 'selectedItem', 'type'];
export function pickState(state = {}) {
  const result = {};
  stateKeys.forEach(k => {
    if (state.hasOwnProperty(k)) {
      result[k] = state[k];
    }
  });
  return result;
}

/**
 * Find parent node which matches a certain condition.
 * @param {Function} finder - Function to call with the current node that checks a condition.
 * @param {HTMLElement} node - The current element to find a parent node from.
 * @param {HTMLElement} rootNode - Root element of the component.
 * @returns {HTMLElement} - Element with not further parent.
 */
export function findParent(finder, node, rootNode) {
  if (node !== null && node !== rootNode.parentNode) {
    if (finder(node)) {
      if (node === document.body && node.scrollTop === 0) {
        // in chrome body.scrollTop always return 0
        return document.documentElement;
      }
      return node;
    } else {
      return findParent(finder, node.parentNode, rootNode);
    }
  } else {
    return null;
  }
}

/**
 * Get the closest element that scrolls
 * @param {HTMLElement} node - the child element to start searching for scroll parent at
 * @param {HTMLElement} rootNode - the root element of the component
 * @return {HTMLElement} the closest parentNode that scrolls
 */
const getClosestScrollParent = findParent.bind(null, node => node.scrollHeight > node.clientHeight);

/**
 * Scroll node into view if necessary.
 * @param {HTMLElement} node - the element that should scroll into view
 * @param {HTMLElement} rootNode - the root element of the component
 * @param {Boolean} alignToTop - align element to the top of the visible area of the scrollable ancestor
 */
export function scrollIntoView(node, rootNode) {
  const scrollParent = getClosestScrollParent(node, rootNode);
  if (scrollParent === null) {
    return;
  }
  const scrollParentStyles = getComputedStyle(scrollParent);
  const scrollParentRect = scrollParent.getBoundingClientRect();
  const scrollParentBorderTopWidth = parseInt(scrollParentStyles.borderTopWidth, 10);
  const scrollParentBorderBottomWidth = parseInt(scrollParentStyles.borderBottomWidth, 10);
  const bordersWidth = scrollParentBorderTopWidth + scrollParentBorderBottomWidth;
  const scrollParentTop = scrollParentRect.top + scrollParentBorderTopWidth;
  const nodeRect = node.getBoundingClientRect();

  if (nodeRect.top < 0 && scrollParentRect.top < 0) {
    scrollParent.scrollTop += nodeRect.top;
    return;
  }

  if (nodeRect.top < 0) {
    // the item is above the viewport and the parent is not above the viewport
    scrollParent.scrollTop += nodeRect.top - scrollParentTop;
    return;
  }

  if (nodeRect.top > 0 && scrollParentRect.top < 0) {
    if (scrollParentRect.bottom > 0 && nodeRect.bottom + bordersWidth > scrollParentRect.bottom) {
      // the item is below scrollable area
      scrollParent.scrollTop += nodeRect.bottom - scrollParentRect.bottom + bordersWidth;
    }
    // item and parent top are on different sides of view top border (do nothing)
    return;
  }

  const nodeOffsetTop = nodeRect.top + scrollParent.scrollTop;
  const nodeTop = nodeOffsetTop - scrollParentTop;
  if (nodeTop < scrollParent.scrollTop) {
    // the item is above the scrollable area
    scrollParent.scrollTop = nodeTop;
  } else if (
    nodeTop + nodeRect.height + bordersWidth >
    scrollParent.scrollTop + scrollParentRect.height
  ) {
    // the item is below the scrollable area
    scrollParent.scrollTop = nodeTop + nodeRect.height - scrollParentRect.height + bordersWidth;
  }
  // the item is within the scrollable area (do nothing)
}

/**
 * Simple debounce implementation. Will call the given
 * function once after the time given has passed since
 * it was last called.
 * @param {Function} fn the function to call after the time
 * @param {Number} time the time to wait
 * @return {Function} the debounced function
 */
export function debounce(fn, time) {
  let timeoutId;
  return wrapper;
  function wrapper(...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      timeoutId = null;
      fn(...args);
    }, time);
  }
}

/**
 * Generates a custom a11y status message.
 * @param {Object} arguments - Required arguments of this function.
 * @returns {String} - The a11y status message.
 */
export function getA11yStatusMessage({
  isOpen,
  highlightedItem,
  selectedItem,
  resultCount,
  previousResultCount,
  itemToString
}) {
  if (!isOpen) {
    if (selectedItem) {
      return itemToString(selectedItem);
    } else {
      return '';
    }
  }
  const resultCountChanged = resultCount !== previousResultCount;
  if (!resultCount) {
    return 'No results.';
  } else if (!highlightedItem || resultCountChanged) {
    return `${resultCount} ${
      resultCount === 1 ? 'result is' : 'results are'
    } available, use up and down arrow keys to navigate.`;
  }
  return itemToString(highlightedItem);
}

/**
 * Throws a helpful error message for required properties. Useful
 * to be used as a default in destructuring or object params.
 * @param {String} fnName the function name
 * @param {String} propName the prop name
 */
export function requiredProp(fnName, propName) {
  throw new Error(`The property "${propName}" is required in "${fnName}"`);
}
