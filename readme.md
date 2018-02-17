# Google Autocomplete Component
This is a customizable google autocomplete component written in reactjs.
It is basically a simple showcase for including the google autocomplete api into a react component.

## Build
```bash
# Install dependencies
$ npm install

# Run dev on localhost:3000
$ npm start

# Build production bundle
$ npm build
```

## Google API Key
You need a valid api key to authorize requests against the google services. \
To register a key see the [official documentation](https://developers.google.com/maps/documentation/javascript/get-api-key?hl=de).

We use a `.env` file to persist the api key.\
Simply add a `.env` file containing the following in the root of this project.
```env
REACT_APP_GOOGLEAPI_KEY=<your api key>
```

## Todo
* Tests
* Optimize google api requests to be more economical