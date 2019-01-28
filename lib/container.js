'use strict';

class Container {

  constructor( path, loader, logger ) {

    // the path of the module that got this loader
    this._path = path;

    // the loader used for this container
    this._loader = loader;

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

  // set( path, value ) {
  //   return this._loader.set( this._path, path, value );
  // }

}

module.exports = Container;
