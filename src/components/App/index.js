import React from 'react';

// Components
import { Flex } from './Flex';
import { Header, Label, Pre } from './Elements';
import { GoogleAutocomplete } from 'components/GoogleAutocomplete';

/**
 * Base App (Entry Point)
 * Holds the state for debounce and threshold rates.
 */
class App extends React.Component {
  state = {
    debounce: 200,
    threshold: 2,
    item: null
  };

  /**
   * On update, console.log the payload.
   * In this case it is the selected google place api response.
   */
  onUpdate = payload => {
    const parsed = {};
    if (payload.address_components) {
      payload.address_components.forEach(component => {
        // Strasse
        if (component.types.includes('route')) {
          parsed['route'] = component.long_name;
        }
        // Hausnummer
        if (component.types.includes('street_number')) {
          parsed['street_number'] = component.long_name;
        }
        // Stadt
        if (component.types.includes('locality')) {
          parsed['locality'] = component.long_name;
        }
        // Stadtteil
        if (component.types.includes('sublocality')) {
          parsed['sublocality'] = component.long_name;
        }
        // Bundesland
        if (component.types.includes('administrative_area_level_1')) {
          parsed['administrative_area_level_1'] = component.long_name;
        }
        // ZIP
        if (component.types.includes('postal_code')) {
          parsed['postal_code'] = component.long_name;
        }
        // Land
        if (component.types.includes('country')) {
          parsed['country'] = component.long_name;
        }
      });
      // Formatted address by google
      parsed['formatted_address'] = payload.formatted_address;
    }
    console.log(parsed);
    this.setState({ item: parsed });
  };

  /**
   * Handles the change event of one of the range inputs.
   * Parses the target value as Int and sets it as local state.
   */
  handleChange = (event, type) => {
    this.setState({
      [type]: parseInt(event.target.value, 10)
    });
  };

  render() {
    return (
      <div>
        <Header title={'Autocomplete'} />

        <Flex.Row>
          <Flex.Item>
            <Label style={{}}>Debounce: {this.state.debounce}ms</Label>
            <input
              type="range"
              min="0"
              max="1000"
              step="100"
              value={this.state.debounce}
              onChange={e => this.handleChange(e, 'debounce')}
            />
          </Flex.Item>
          <Flex.Item>
            <Label>Threshold: {this.state.threshold} characters</Label>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={this.state.threshold}
              onChange={e => this.handleChange(e, 'threshold')}
            />
          </Flex.Item>
        </Flex.Row>

        {/* Google Autocomplete component */}
        <GoogleAutocomplete
          debounce={this.state.debounce}
          threshold={this.state.threshold}
          onUpdate={this.onUpdate}
        />

        {this.state.item && <Pre>{JSON.stringify(this.state.item, null, 2)}</Pre>}
      </div>
    );
  }
}

export default App;
