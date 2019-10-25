'use strict';

class Container {

  constructor( path, loader, logger ) {

    // the path of the module that got this loader
    this._path = path;

    // the loader used for this container
    this._loader = loader;

    // logger has to be passed with the container because logging is scoped to the component and so is the container.
    // so the container is the first time we can inject the path of the component doing the logging
    this._logger = logger;

  }

  get( path ) {

    if ( path === 'logger' ) {

      return ( level, message, meta ) => {
        this._logger( level, this._path, message, meta );
      };

    }

    return this._loader.get( this._path, path );
  }

  inject( path ) {

    if ( path === 'logger' ) {

      return ( level, message, meta ) => {
        this._logger( level, this._path, message, meta );
      };

    }

    return this._loader.inject( this._path, path );

  }

}

module.exports = Container;
