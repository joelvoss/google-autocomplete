import React from 'react';
import PropTypes from 'prop-types';
import debounce from 'debounce-fn';
import GoogleLibraryService from 'utils/GoogleLibraryService';

/**
 * Google Predictions component
 * → Fetches google autocomplete predictions based on a provided query prop.
 */
export class GooglePredictions extends React.Component {
  static propTypes = {
    query: PropTypes.string.isRequired,
    threshold: PropTypes.number,
    debounce: PropTypes.number,
    render: PropTypes.func
  };
  static defaultProps = {
    threshold: 2,
    debounce: 200,
    render: () => {}
  };

  state = {
    error: null,
    predictions: []
  };
  mounted = false;

  /**
   * When the component mounts, init the google library and fetch predictions.
   * @returns {void}
   */
  async componentDidMount() {
    const google = await new GoogleLibraryService({
      apiKey: process.env.REACT_APP_GOOGLEAPI_KEY
    });
    this.autoCompleteService = new google.maps.places.AutocompleteService();
    this.mounted = true;
    this.fetch();
  }

  /**
   * When the component updates, check if we need to fetch new predictions.
   * @param {Object} prevProps - Previous props.
   * @param {Object} prevState - Previous state.
   * @returns {void}
   */
  componentDidUpdate(prevProps, prevState) {
    if (this.props.query.length && prevProps.query !== this.props.query) {
      this.fetch();
    }
  }

  /**
   * On unmount set mounted flag accordingly.
   * @returns {void}
   */
  componentWillUnmount() {
    this.mounted = false;
    this.autoCompleteService = null;
  }

  /**
   * Fetch google autocomplete predictions and set them in state.
   * The fetch is debounced by 200ms.
   * @returns {void}
   */
  fetch = debounce(
    () => {
      // Only execute when we are mounted and we have a search query.
      if (!this.mounted || this.props.query.length <= this.props.threshold) {
        return;
      }

      // Call googles async method with our query and type options
      // and set the predictions in state if everything is OK.
      // Otherwise set the error state accordingly.
      this.autoCompleteService.getPlacePredictions(
        {
          input: this.props.query,
          types: ['geocode']
        },
        (predictions, status) => {
          let error = false,
            formattedPredictions = [];
          if (status === 'OK') {
            formattedPredictions = this.formatPredictions(predictions);
          } else {
            error = true;
          }
          this.setState({
            error,
            predictions: formattedPredictions
          });
        }
      );
    },
    { wait: this.props.debounce }
  );

  /**
   * Enhance the google autocomplete predictions with a formatted one.
   * @param {Array} predictions - Array of predictions.
   * @returns {Object} - Enhanced predictions
   */
  formatPredictions = predictions => {
    return predictions.map(data => {
      let formatted = {
        main_text: '',
        secondary_text: ''
      };

      Object.keys(formatted).forEach(key => {
        formatted[key] = data.structured_formatting[key];
        if (data.structured_formatting[`${key}_matched_substrings`]) {
          const substrings = data.structured_formatting[`${key}_matched_substrings`];
          const matches = substrings.map(match =>
            formatted[key].substr(match.offset, match.length)
          );
          const regex = new RegExp(matches.join('|'), 'g');
          formatted[key] = formatted[key].replace(regex, match => {
            const formattedText = `<b>${match}</b>`;
            return !formatted[key].includes(formattedText) ? formattedText : `${match}`;
          });
        }
      });

      return {
        ...data,
        formatted
      };
    });
  };

  /**
   * Get current component state.
   * @returns {Object} - State
   */
  getState = () => {
    const { error, predictions } = this.state;
    return {
      error,
      predictions
    };
  };

  /**
   * Call the render prop callback.
   * @returns {Function} - Render prop callback.
   */
  render() {
    return this.props.render(this.getState());
  }
}
