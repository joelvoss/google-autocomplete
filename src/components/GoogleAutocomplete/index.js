import React from 'react';
import PropTypes from 'prop-types';
import GoogleLibraryService from 'utils/GoogleLibraryService';

import { Autocomplete } from 'components/Autocomplete';
import { GooglePredictions } from './GooglePredictions';
import { Container, Input, List, Icon } from './Elements';

/**
 * Google Autocomplete component.
 * This component is a wrapper for the base <Autocomplete /> component.
 */
export class GoogleAutocomplete extends React.Component {
  static propTypes = {
    onUpdate: PropTypes.func,
    threshold: PropTypes.number,
    debounce: PropTypes.number
  };
  static defaultProps = {
    onUpdate: () => {},
    threshold: 2,
    debounce: 200
  };

  mounted = false;

  /**
   * When the component mounts, set the static mounted prop and
   * init the GoogleLibraryService as soon as possible.
   * The mounted prop is beeing used in the geocodePlaceId() method to control
   * if we should fetch new geocode data from google.
   */
  async componentDidMount() {
    const google = await new GoogleLibraryService({
      apiKey: process.env.REACT_APP_GOOGLEAPI_KEY
    });
    this.geocoder = new google.maps.Geocoder();
    this.mounted = true;
  }
  /**
   *
   */
  componentWillUnmount() {
    this.mounted = false;
    this.geocoder = null;
  }

  /**
   * Checks, if a string length is under a certain threshold.
   * @param {String} value - String to check agains
   * @returns {Boolean} - True if under the threshold, false otherwise.
   */
  isValueUnderThreshold = value => {
    return value.length <= this.props.threshold;
  };

  /**
   * Custom item to string method for the <Autocomplete /> component.
   * Defines the string representation of a single list item.
   * @param {Object} item - List item.
   * @returns {String} - String representation of the list item.
   */
  itemToString = item => {
    return item ? item.description : '';
  };

  /**
   * Geocode a given google predictions place id.
   * This method gets called by the onSelect event-handler of the
   * <Autocomplete /> component.
   * As soon as a place id was geocoded, calls the props.onUpdate method.
   * @param {Object} select - Clicked element.
   * @returns {void}
   */
  geocodePlaceId = select => {
    if (!this.mounted) {
      return;
    }

    if (select && select.place_id) {
      this.geocoder.geocode({ placeId: select.place_id }, (results, status) => {
        if (status === 'OK' && results[0]) {
          this.props.onUpdate(results[0]);
        }
      });
    }
  };

  render() {
    return (
      <Autocomplete
        itemToString={this.itemToString}
        onSelect={this.geocodePlaceId}
        render={({
          getRootProps,
          getInputProps,
          getItemProps,
          getButtonProps,
          isOpen,
          inputValue,
          highlightedIndex,
          selectedItem,
          clearSelection
        }) => (
          <Container {...getRootProps({ refKey: 'innerRef' })}>
            <Input.Wrap open={isOpen}>
              <Input.Select {...getInputProps()} placeholder="Search address" />
              {inputValue ? (
                <Input.Button onClick={() => clearSelection()}>
                  <Icon.Close />
                </Input.Button>
              ) : (
                <Input.Button {...getButtonProps()}>
                  <Icon.Search />
                </Input.Button>
              )}
            </Input.Wrap>
            {isOpen ? (
              <GooglePredictions
                debounce={this.props.debounce}
                threshold={this.props.threshold}
                query={inputValue}
                render={({ error, predictions }) => (
                  <List.Wrap>
                    {predictions &&
                      predictions.map((item, i) => (
                        <List.Item
                          key={item.id}
                          {...getItemProps({ item })}
                          highlighted={highlightedIndex === i}
                          selected={selectedItem && selectedItem.id === item.id}
                        >
                          <List.MainText text={item.formatted.main_text} />{' '}
                          <List.SecondaryText text={item.formatted.secondary_text} />
                        </List.Item>
                      ))}
                  </List.Wrap>
                )}
              />
            ) : null}
          </Container>
        )}
      />
    );
  }
}
