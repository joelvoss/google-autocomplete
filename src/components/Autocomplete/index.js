import React from 'react';
import PropTypes from 'prop-types';
import setA11yStatus from './set-a11y-status';
import {
  unwrapArray,
  noop,
  composeEventHandlers,
  generateId,
  getA11yStatusMessage,
  isDOMElement,
  getElementProps,
  firstDefined,
  cbToCb,
  pickState,
  scrollIntoView,
  debounce,
  requiredProp
} from './utils';

/**
 * Autocomplete component that enhances any given child via a render prop
 * callback. This component exposes different prop and state getters for the
 * rendered children to use and provides a maximum of flexibility.
 */
export class Autocomplete extends React.Component {
  static propTypes = {
    // Rendered output
    children: PropTypes.func,
    render: PropTypes.func,

    // Things we keep in state for uncontrolled components
    // but can accept as props for controlled components
    selectedItem: PropTypes.any,
    isOpen: PropTypes.bool,
    inputValue: PropTypes.string,
    highlightedIndex: PropTypes.number,

    // Default values for our controlled and uncontrolled props/state.
    defaultHighlightedIndex: PropTypes.number,
    defaultSelectedItem: PropTypes.any,
    defaultInputValue: PropTypes.string,
    defaultIsOpen: PropTypes.bool,

    // Actions (the user can listen to)
    onStateChange: PropTypes.func,
    onInputValueChange: PropTypes.func,
    onFocus: PropTypes.func,
    onChange: PropTypes.func,
    onSelect: PropTypes.func,
    selectedItemChanged: PropTypes.func,
    onOuterClick: PropTypes.func,

    // Actions (the user can change)
    itemToString: PropTypes.func,

    // Misc
    itemCount: PropTypes.number,
    getA11yStatusMessage: PropTypes.func,
    id: PropTypes.string,
    environment: PropTypes.shape({
      addEventListener: PropTypes.func,
      removeEventListener: PropTypes.func,
      document: PropTypes.shape({
        getElementById: PropTypes.func,
        activeElement: PropTypes.any,
        body: PropTypes.any
      })
    })
  };

  static defaultProps = {
    defaultHighlightedIndex: null,
    defaultSelectedItem: null,
    defaultInputValue: '',
    defaultIsOpen: false,
    onStateChange: () => {},
    onInputValueChange: () => {},
    onFocus: () => {},
    onChange: () => {},
    onSelect: () => {},
    selectedItemChanged: (prevItem, item) => prevItem !== item,
    onOuterClick: () => {},
    itemToString: i => (i == null ? '' : String(i)),
    getA11yStatusMessage,
    id: generateId('autocomplete'),
    environment: typeof window === 'undefined' ? {} : window
  };

  // Predefined state change types, so the user can better hook into these actions.
  static stateChangeTypes = {
    unknown: '__autocomplete_unknown__',
    mouseUp: '__autocomplete_mouseup__',
    itemMouseEnter: '__autocomplete_item_mouseenter__',
    keyDownArrowUp: '__autocomplete_keydown_arrow_up__',
    keyDownArrowDown: '__autocomplete_keydown_arrow_down__',
    keyDownEscape: '__autocomplete_keydown_escape__',
    keyDownEnter: '__autocomplete_keydown_enter__',
    blurInput: '__autocomplete_blur_input__',
    focusInput: '__autocomplete_focus_input__',
    changeInput: '__autocomplete_change_input__',
    keyDownSpaceButton: '__autocomplete_keydown_space_button__',
    clickButton: '__autocomplete_click_button__',
    controlledPropUpdatedSelectedItem: '__autocomplete_controlled_prop_updated_selected_item__'
  };

  input = null;
  items = [];
  // itemCount can be changed asynchronously from within the autocomplete component
  // (so it can't come from a prop). This is why we store it as an instance and
  // use getItemCount rather than just use items.length (to support windowing + async).
  itemCount = null;
  previousResultCount = 0;

  /**
   * Constructor of the <Autocomplete> Component.
   * @param {Array} args - List of arguments.
   */
  constructor(...args) {
    super(...args);
    const state = this.getState({
      highlightedIndex: this.props.defaultHighlightedIndex,
      isOpen: this.props.defaultIsOpen,
      inputValue: this.props.defaultInputValue,
      selectedItem: this.props.defaultSelectedItem
    });
    if (state.selectedItem) {
      state.inputValue = this.props.itemToString(state.selectedItem);
    }
    this.state = state;
  }

  /**
   * On mount, init environmental mouseup and down event handlers.
   * We use the _isMounted boolean because we use a debounce method and don't
   * want to update stuff when the component is already unmounted.
   * The isMouseDown boolean helps us track wether the mouse is currently held down.
   * This is useful when the user clicks on an item in the itemlist, but holds the mouse down
   * long enough for the list to disappear (because the blur event fires on the input).
   * The boolean is used in the blur event handler on the input to determien whether
   * the blur event should trigger hiding the menu.
   * @returns {void}
   */
  componentDidMount() {
    this._isMounted = true;

    // Mouse down event handler
    const onMouseDown = () => {
      this.isMouseDown = true;
    };

    // Mouse up event handler
    const onMouseUp = event => {
      this.isMouseDown = false;
      if (
        (event.target === this._rootNode || !this._rootNode.contains(event.target)) &&
        this.getState().isOpen
      ) {
        this.reset(
          { type: Autocomplete.stateChangeTypes.mouseUp, inputValue: this.getState().inputValue },
          () => this.props.onOuterClick(this.getStateAndHelpers())
        );
      }
    };
    this.props.environment.addEventListener('mousedown', onMouseDown);
    this.props.environment.addEventListener('mouseup', onMouseUp);

    // Create cleanup method (which we can call on componentDidUnmount).
    this.cleanup = () => {
      this._isMounted = false;
      this.props.environment.removeEventListener('mousedown', onMouseDown);
      this.props.environment.removeEventListener('mouseup', onMouseUp);
    };
  }

  /**
   * When the component updates, call our controlled component props if necessary
   * and scroll the currently highlighted item into view.
   * @param {Object} prevProps - Previous props.
   * @param {Object} prevState - Previous state.
   * @returns {void}
   */
  componentDidUpdate(prevProps, prevState) {
    if (
      this.isControlledProp('selectedItem') &&
      this.props.selectedItemChanged(prevProps.selectedItem, this.props.selectedItem)
    ) {
      this.internalSetState({
        type: Autocomplete.stateChangeTypes.controlledPropUpdatedSelectedItem,
        inputValue: this.props.itemToString(this.props.selectedItem)
      });
    }

    const current = this.props.highlightedIndex === undefined ? this.state : this.props;
    const prev = prevProps.highlightedIndex === undefined ? prevState : prevProps;

    if (current.highlightedIndex !== prev.highlightedIndex && !this.avoidScrolling) {
      this.scrollHighlightedItemIntoView();
    }

    this.updateStatus();
  }

  /**
   * Clean up on unmount.
   * @returns {void}
   */
  componentWillUnmount() {
    this.cleanup();
  }

  // ------ Start utility methods

  /**
   * This determines whether a prop is a "controlled prop" meaning it is state which is
   * controlled by the outside of this component rather than within this component.
   * @param {String} key - The key to check.
   * @return {Boolean} - Boolean indicating whether it is a controlled prop.
   */
  isControlledProp(key) {
    return this.props[key] !== undefined;
  }

  // ------ End utility methods

  // ------ Start Item count methods

  /**
   * Gets the current item count.
   * They're in priority order:
   * 1. "this.itemCount"
   * 2. "this.props.itemCount"
   * 3. "this.items.length"
   * @returns {Number} - The item count.
   */
  getItemCount() {
    if (this.itemCount !== null) {
      return this.itemCount;
    } else if (this.props.itemCount !== undefined) {
      return this.props.itemCount;
    } else {
      return this.items.length;
    }
  }

  /**
   * Set item count.
   * @param {Number} count - Item count.
   * @returns {void}
   */
  setItemCount = count => (this.itemCount = count);

  /**
   * Unset item count.
   * @returns {void}
   */
  unsetItemCount = () => (this.itemCount = null);

  // ------ End Item count methods

  /**
   * Update component status.
   * This method is debounced by 200ms.
   * @returns {Function} - Debounced function
   */
  updateStatus = debounce(() => {
    // If the component isn't mounted, exit early.
    if (!this._isMounted) {
      return;
    }
    const state = this.getState();
    const item = this.items[state.highlightedIndex] || {};
    const resultCount = this.getItemCount();
    const status = this.props.getA11yStatusMessage({
      itemToString: this.props.itemToString,
      previousResultCount: this.previousResultCount,
      resultCount,
      highlightedItem: item,
      ...state
    });
    this.previousResultCount = resultCount;
    setA11yStatus(status);
  }, 200);

  /**
   * Gets the state based on internal state or props
   * If a state value is passed via props, then that is the value given, otherwise
   * it's retrieved from stateToMerge.
   *
   * This will perform a shallow merge of the given state object with the state
   * coming from props (for the controlled component scenario).
   * This is used in state updater functions so they're referencing the right state
   * regardless of where it comes from.
   * @param {Object} stateToMerge - Defaults to this.state.
   * @return {Object} - The state.
   */
  getState(stateToMerge = this.state) {
    return Object.keys(stateToMerge).reduce((state, key) => {
      state[key] = this.isControlledProp(key) ? this.props[key] : stateToMerge[key];
      return state;
    }, {});
  }

  /**
   * Sets the <Autocomplete>'s state.
   * Any piece of our state can live in two places:
   * 1. Uncontrolled: It's internal (this.state)
   *    We call this.setState({}) to update.
   * 2. Controlled: It's external (this.props)
   *    We call this.props.onStateChange to update.
   *
   * In addition, we'll call this.props.onChange if the selectedItem is changed.
   * @param {Object} stateToSet - New state to set
   * @param {Function} cb - Callback function
   */
  internalSetState(stateToSet, cb) {
    let isItemSelected, onChangeArg;
    const onStateChangeArg = {};
    const isStateToSetFunction = typeof stateToSet === 'function';

    // We want to call "onInputValueChange" before the "setState" call
    // so someone controlling the "inputValue" state gets notified of
    // the input change as soon as possible.
    // (If stateToSet is a function, this won't work and we will call
    // it inside the setState call.)
    if (!isStateToSetFunction && stateToSet.hasOwnProperty('inputValue')) {
      this.props.onInputValueChange(stateToSet.inputValue, {
        ...this.getStateAndHelpers(),
        ...stateToSet
      });
    }

    return this.setState(
      state => {
        state = this.getState(state);
        stateToSet = isStateToSetFunction ? stateToSet(state) : stateToSet;

        // Checks if an item is selected, regardless of if it's different from
        // what was selected before.
        // This is used to determine if onSelect and onChange callbacks should be called.
        isItemSelected = stateToSet.hasOwnProperty('selectedItem');
        // This keeps track of the object we want to call with setState
        const nextState = {};
        // This is just used to tell whether the state changed
        const nextFullState = {};
        // We need to call on change if the outside world is controlling any of our state
        // and we're trying to update that state OR if the selection has changed and we're
        // trying to update the selection.
        if (isItemSelected && stateToSet.selectedItem !== state.selectedItem) {
          onChangeArg = stateToSet.selectedItem;
        }
        stateToSet.type = stateToSet.type || Autocomplete.stateChangeTypes.unknown;

        // Iterate over each state key and determine if we want to update it.
        Object.keys(stateToSet).forEach(key => {
          // onStateChangeArg should only have the state that is actually changing.
          // This should be checked on every key, so it comes first.
          if (state[key] !== stateToSet[key]) {
            onStateChangeArg[key] = stateToSet[key];
          }

          // The type is useful for the onStateChangeArg
          // but we don't actually want to set it in internal state.
          if (key === 'type') {
            return;
          }

          nextFullState[key] = stateToSet[key];

          // If the new state is coming from props, then we don't care to set it internally
          if (!this.isControlledProp(key)) {
            nextState[key] = stateToSet[key];
          }
        });

        // If stateToSet is a function, then we weren't able to call onInputValueChange
        // earlier, so we'll call it now that we know what the inputValue state will be.
        if (isStateToSetFunction && stateToSet.hasOwnProperty('inputValue')) {
          this.props.onInputValueChange(stateToSet.inputValue, {
            ...this.getStateAndHelpers(),
            ...stateToSet
          });
        }

        return nextState;
      },
      () => {
        // call the provided callback (cbToCb makes sure that we call a callback)
        cbToCb(cb)();

        // Only call the onStateChange and onChange callbacks if we have relevant
        // information to pass to them (e.g. if more state than the "type" has changed).
        const hasMoreStateThanType = Object.keys(onStateChangeArg).length > 1;
        if (hasMoreStateThanType) {
          this.props.onStateChange(onStateChangeArg, this.getStateAndHelpers());
        }

        // Call props.onSelect with the new selectedItem
        if (isItemSelected) {
          this.props.onSelect(stateToSet.selectedItem, this.getStateAndHelpers());
        }

        // Call props.onChange with the new onChangeArg (which is the new selectedItem)
        if (onChangeArg !== undefined) {
          this.props.onChange(onChangeArg, this.getStateAndHelpers());
        }
      }
    );
  }

  /**
   * Key-Down handlers we want to support.
   * 1. Arrow keys (up and down) → Move the highlighted index
   * 2. Enter key → Select the highlighted index
   * 3. Escape key → Reset
   */
  keyDownHandlers = {
    ArrowDown(event) {
      event.preventDefault();
      const amount = event.shiftKey ? 5 : 1;
      this.moveHighlightedIndex(amount, {
        type: Autocomplete.stateChangeTypes.keyDownArrowDown
      });
    },

    ArrowUp(event) {
      event.preventDefault();
      const amount = event.shiftKey ? -5 : -1;
      this.moveHighlightedIndex(amount, {
        type: Autocomplete.stateChangeTypes.keyDownArrowUp
      });
    },

    Enter(event) {
      if (this.getState().isOpen) {
        event.preventDefault();
        this.selectHighlightedItem({
          type: Autocomplete.stateChangeTypes.keyDownEnter
        });
      }
    },

    Escape(event) {
      event.preventDefault();
      this.reset({ type: Autocomplete.stateChangeTypes.keyDownEscape });
    }
  };

  /**
   * Key-Down handlers for the button that we want to support.
   * We use a nifty trick to declare a function with a "whitespace" as function name,
   * because the event.key that calls the handler has no identifier.
   */
  buttonKeyDownHandlers = {
    ...this.keyDownHandlers,
    ' '(event) {
      event.preventDefault();
      this.toggleMenu({ type: Autocomplete.stateChangeTypes.keyDownSpaceButton });
    }
  };

  /**
   * Helper method: Combines all internal state, props and actions to pass down to
   * the rendered children.
   * @returns {Object} - Object containing prop getters, actions, props and state.
   */
  getStateAndHelpers() {
    const { highlightedIndex, inputValue, selectedItem, isOpen } = this.getState();
    const { id, itemToString } = this.props;
    const {
      getRootProps,
      getButtonProps,
      getLabelProps,
      getInputProps,
      getItemProps,
      openMenu,
      closeMenu,
      toggleMenu,
      selectItem,
      selectItemAtIndex,
      selectHighlightedItem,
      setHighlightedIndex,
      clearSelection,
      clearItems,
      reset,
      setItemCount,
      unsetItemCount
    } = this;
    return {
      // prop getters
      getRootProps,
      getButtonProps,
      getLabelProps,
      getInputProps,
      getItemProps,

      // actions
      openMenu,
      closeMenu,
      toggleMenu,
      selectItem,
      selectItemAtIndex,
      selectHighlightedItem,
      setHighlightedIndex,
      clearSelection,
      clearItems,
      reset,
      setItemCount,
      unsetItemCount,

      // props
      itemToString,
      id,

      // state
      highlightedIndex,
      inputValue,
      isOpen,
      selectedItem
    };
  }

  /**
   * Sets root ref.
   * @returns {void}
   */
  rootRef = node => (this._rootNode = node);

  /**
   * Define all props for the root element (first child).
   * @returns {Object} - Root props.
   */
  getRootProps = ({ refKey = 'ref', ...rest } = {}) => {
    this.getRootProps.called = true;
    return {
      [refKey]: this.rootRef,
      ...rest
    };
  };

  /**
   * Define all label props. Specifically the htmlFor prop.
   * @returns {Object} - Label props.
   */
  getLabelProps = (props = {}) => {
    this.getLabelProps.called = true;
    // Either use the already available this.inputId,
    // or a custom id provided by props or generate a new one.
    this.inputId = firstDefined(this.inputId, props.htmlFor, generateId('autocomplete-input'));
    return {
      ...props,
      htmlFor: this.inputId
    };
  };

  /**
   * Defines all input props.
   * @param {Object} settings - Input prop settings.
   * @returns {Object} - Input props.
   */
  getInputProps = ({ onKeyDown, onBlur, onChange, onFocus, ...rest } = {}) => {
    this.getInputProps.called = true;
    this.inputId = firstDefined(this.inputId, rest.id, generateId('autocomplete-input'));
    const { inputValue, isOpen, highlightedIndex } = this.getState();
    const eventHandlers = rest.disabled
      ? {}
      : {
          onFocus: composeEventHandlers(onFocus, this.input_handleFocus),
          onChange: composeEventHandlers(onChange, this.input_handleChange),
          onKeyDown: composeEventHandlers(onKeyDown, this.input_handleKeyDown),
          onBlur: composeEventHandlers(onBlur, this.input_handleBlur)
        };
    return {
      role: 'combobox',
      'aria-autocomplete': 'list',
      'aria-expanded': isOpen,
      'aria-activedescendant':
        isOpen && typeof highlightedIndex === 'number' && highlightedIndex >= 0
          ? this.getItemId(highlightedIndex)
          : null,
      autoComplete: 'off',
      value: inputValue,
      ...eventHandlers,
      ...rest,
      id: this.inputId
    };
  };

  /**
   * Defines all button props.
   * @param {Object} settings - Button prop settings.
   * @returns {Object} - Button props.
   */
  getButtonProps = ({ onClick, onKeyDown, ...rest } = {}) => {
    const { isOpen } = this.getState();
    const eventHandlers = rest.disabled
      ? {}
      : {
          onClick: composeEventHandlers(onClick, this.button_handleClick),
          onKeyDown: composeEventHandlers(onKeyDown, this.button_handleKeyDown)
        };
    return {
      role: 'button',
      'aria-label': isOpen ? 'close menu' : 'open menu',
      'aria-expanded': isOpen,
      'aria-haspopup': true,
      ...eventHandlers,
      ...rest
    };
  };

  /**
   * Defines all props for a single item of the autocomplete
   * item list. The user has to provide an 'item' that our
   * <Autocomplete> component can manage internally.
   * @param {Object} settings - Item prop settings
   *                            (e.g. index, item, onClick handler).
   * @returns {Object} - Item props.
   */
  getItemProps = (settings = {}) => {
    let {
      onMouseEnter,
      onClick,
      index,
      item = requiredProp('getItemProps', 'item'),
      ...rest
    } = settings;

    // If no external index is provided, create our own.
    if (index === undefined) {
      this.items.push(item);
      index = this.items.indexOf(item);
    } else {
      this.items[index] = item;
    }
    return {
      id: this.getItemId(index),
      onMouseEnter: composeEventHandlers(onMouseEnter, () => {
        this.setHighlightedIndex(index, {
          type: Autocomplete.stateChangeTypes.itemMouseEnter
        });

        // We never want to manually scroll when changing state based
        // on `onMouseEnter` because we will be moving the element out
        // from under the user which is currently scrolling/moving the
        // cursor
        this.avoidScrolling = true;
        setTimeout(() => (this.avoidScrolling = false), 250);
      }),
      onClick: composeEventHandlers(onClick, () => {
        this.selectItemAtIndex(index);
      }),
      ...rest
    };
  };

  /**
   * Handles a key down event and delegates it to the specific
   * keyDownHandlers.
   * @param {Event} event - Event object.
   * @returns {void}
   */
  input_handleKeyDown = event => {
    if (event.key && this.keyDownHandlers[event.key]) {
      this.keyDownHandlers[event.key].call(this, event);
    }
  };

  /**
   * Handles the focus event of the <input> element.
   * Toggles the isOpen boolean depending on the current inputValue length.
   * @returns {void}
   */
  input_handleFocus = () => {
    const inputValue = this.getState().inputValue;
    this.internalSetState({
      type: Autocomplete.stateChangeTypes.focusInput,
      isOpen: !!inputValue.length
    });
  };

  /**
   * Handles the change event of the <input> element.
   * @param {Event} event - Event object.
   * @returns {void}
   */
  input_handleChange = event => {
    this.internalSetState({
      type: Autocomplete.stateChangeTypes.changeInput,
      isOpen: true,
      inputValue: event.target.value
    });
  };

  /**
   * Handles the blur event of the <input> element.
   * @returns {void}
   */
  input_handleBlur = () => {
    if (!this.isMouseDown) {
      this.reset({ type: Autocomplete.stateChangeTypes.blurInput });
    }
  };

  /**
   * Handle key down events on the button.
   * @param {Event} event - Event object.
   * @returns {void}
   */
  button_handleKeyDown = event => {
    if (this.buttonKeyDownHandlers[event.key]) {
      this.buttonKeyDownHandlers[event.key].call(this, event);
    }
  };

  /**
   * Handles a click event on the button.
   * This also handles odd cases for safari and firefor which don't
   * give the button focus properly.
   * @param {Event} event - Event object.
   * @returns {void}
   */
  button_handleClick = event => {
    event.preventDefault();
    if (this.props.environment.document.activeElement === this.props.environment.document.body) {
      event.target.focus();
    }
    this.toggleMenu({ type: Autocomplete.stateChangeTypes.clickButton });
  };

  /**
   * Returns a preformatted item index.
   * Format: <id>-item-<index>
   * @param {Number} index - Item index number
   */
  getItemId(index) {
    return `${this.props.id}-item-${index}`;
  }

  /**
   * Clears all items.
   * @returns {void}
   */
  clearItems = () => {
    this.items = [];
  };

  /**
   * Get DOM node from item index.
   * @param {Number} index - Index number.
   * @returns {Node} - DOM Node.
   */
  getItemNodeFromIndex = index => {
    return this.props.environment.document.getElementById(this.getItemId(index));
  };

  /**
   * Scroll highlighted node into view.
   * @returns {void}
   */
  scrollHighlightedItemIntoView = () => {
    const node = this.getItemNodeFromIndex(this.getState().highlightedIndex);
    const rootNode = this._rootNode;
    scrollIntoView(node, rootNode);
  };

  /**
   * Sets the highlighted index.
   * @param {Number} highlightedIndex - The highlighted index.
   * @param {Object} otherStateToSet - Other state to set.
   * @returns {void}
   */
  setHighlightedIndex = (
    highlightedIndex = this.props.defaultHighlightedIndex,
    otherStateToSet = {}
  ) => {
    otherStateToSet = pickState(otherStateToSet);
    this.internalSetState({ highlightedIndex, ...otherStateToSet });
  };

  /**
   * Select the item at a specific index.
   * @param {Number} itemIndex - Index of the item to select.
   * @param {Object} otherStateToSet - Other state to set.
   * @param {Function} cb - Callback.
   * @returns {void}
   */
  selectItemAtIndex = (itemIndex, otherStateToSet, cb) => {
    const item = this.items[itemIndex];
    if (item === null) {
      return;
    }
    this.selectItem(item, otherStateToSet, cb);
  };

  /**
   * Select a specific item.
   * @param {Object} item - Item to select
   * @param {Object} otherStateToSet - Other state to set.
   * @param {Function} cb - Callback.
   * @returns {void}
   */
  selectItem = (item, otherStateToSet, cb) => {
    otherStateToSet = pickState(otherStateToSet);
    this.internalSetState(
      {
        isOpen: false,
        highlightedIndex: this.props.defaultHighlightedIndex,
        selectedItem: item,
        inputValue:
          this.isControlledProp('selectedItem') && this.props.breakingChanges.resetInputOnSelection
            ? this.props.defaultInputValue
            : this.props.itemToString(item),
        ...otherStateToSet
      },
      cbToCb(cb)
    );
  };

  /**
   * Clears the current selection and focus the input node.
   * @param {Function} cb - Callback.
   * @returns {void}
   */
  clearSelection = cb => {
    this.internalSetState(
      {
        selectedItem: null,
        inputValue: '',
        isOpen: false
      },
      () => {
        const inputNode = this._rootNode.querySelector(`#${this.inputId}`);
        inputNode && inputNode.focus && inputNode.focus();
        cbToCb(cb)();
      }
    );
  };

  /**
   * Selects the currently highlighted item.
   * @param {Object} otherStateToSet - Other state to set.
   * @param {Function} cb - Callback.
   * @returns {void}
   */
  selectHighlightedItem = (otherStateToSet, cb) => {
    return this.selectItemAtIndex(this.getState().highlightedIndex, otherStateToSet, cb);
  };

  /**
   * Moves the highlighted index by x amount if the menu is open.
   * Otherwise opens the menu and highlights the default index.
   * @param {Number} amount - Amount to move.
   * @param {Object} otherStateToSet - Other state to set.
   * @returns {void}
   */
  moveHighlightedIndex = (amount, otherStateToSet) => {
    if (this.getState().isOpen) {
      this.changeHighlightedIndex(amount, otherStateToSet);
    } else {
      this.openAndHighlightDefaultIndex(otherStateToSet);
    }
  };

  /**
   * Changes the highlighted index.
   * @param {Number} moveAmout - Amount to move.
   * @param {Object} otherStateToSet - Other state to set.
   * @returns {void}
   */
  changeHighlightedIndex = (moveAmount, otherStateToSet) => {
    const itemsLastIndex = this.getItemCount() - 1;
    if (itemsLastIndex < 0) {
      return;
    }
    const { highlightedIndex } = this.getState();
    let baseIndex = highlightedIndex;
    if (baseIndex === null) {
      baseIndex = moveAmount > 0 ? -1 : itemsLastIndex + 1;
    }
    let newIndex = baseIndex + moveAmount;
    if (newIndex < 0) {
      newIndex = itemsLastIndex;
    } else if (newIndex > itemsLastIndex) {
      newIndex = 0;
    }
    this.setHighlightedIndex(newIndex, otherStateToSet);
  };

  /**
   * Sets the open state to true and highlights the default index.
   * @param {Object} otherStateToSet - Other state to set.
   * @returns {void}
   */
  openAndHighlightDefaultIndex = (otherStateToSet = {}) => {
    this.setHighlightedIndex(undefined, { isOpen: true, ...otherStateToSet });
  };

  /**
   * Highlights the default index.
   * @param {Object} otherStateToSet - Other state to set.
   * @returns {void}
   */
  highlightDefaultIndex = (otherStateToSet = {}) => {
    this.setHighlightedIndex(undefined, otherStateToSet);
  };

  /**
   * Reset component by resetting the internal state.
   * @returns {void}
   */
  reset = (otherStateToSet = {}, cb) => {
    otherStateToSet = pickState(otherStateToSet);
    this.internalSetState(
      ({ selectedItem }) => ({
        isOpen: false,
        highlightedIndex: this.props.defaultHighlightedIndex,
        inputValue: this.props.itemToString(selectedItem),
        ...otherStateToSet
      }),
      cbToCb(cb)
    );
  };

  /**
   * Toggles the menu.
   * @param {Object} otherStateToSet - Other state to set.
   * @param {Function} cb - Callback.
   * @returns {void}
   */
  toggleMenu = (otherStateToSet = {}, cb) => {
    otherStateToSet = pickState(otherStateToSet);
    this.internalSetState(
      ({ isOpen }) => {
        return { isOpen: !isOpen, ...otherStateToSet };
      },
      () => {
        const { isOpen } = this.getState();
        if (isOpen) {
          this.highlightDefaultIndex();
        }
        cbToCb(cb)();
      }
    );
  };

  /**
   * Opens the menu.
   * @param {Function} cb - Callback.
   */
  openMenu = cb => {
    this.internalSetState({ isOpen: true }, cbToCb(cb));
  };

  /**
   * Closes the menu.
   * @param {Function} cb - Callback.
   */
  closeMenu = cb => {
    this.internalSetState({ isOpen: false }, cbToCb(cb));
  };

  render() {
    const children = unwrapArray(this.props.render || this.props.children, noop);

    // because the items are rerendered every time we call the children
    // we clear this out each render and
    this.clearItems();

    // we reset this so we know whether the user calls getRootProps during
    // this render. If they do then we don't need to do anything,
    // if they don't then we need to clone the element they return and
    // apply the props for them.
    this.getRootProps.called = false;

    const element = unwrapArray(children(this.getStateAndHelpers()));
    if (!element) {
      return null;
    }
    if (this.getRootProps.called) {
      return element;
    } else if (isDOMElement(element)) {
      // No root props applied by the user, but we can clone the root element (first child)
      // and apply the props ourselves.
      return React.cloneElement(element, this.getRootProps(getElementProps(element)));
    } else {
      // The root element is a custom component, so we can't apply the rootProps ourself.
      throw new Error(
        'If you return a non-DOM element, you must use apply the getRootProps function!'
      );
    }
  }
}
