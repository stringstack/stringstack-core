'use strict';

class Container {

  constructor( path, loader ) {

    // the path of the module that got this loader
    this._path = path;

    // the loader used for this container
    this._loader = loader;

  }

  get( path ) {
    // console.log( 'get path', this._path );
    return this._loader.get( this._path, path );
  }

  set( path, value ) {
    // console.log( 'set path', this._path );
    return this._loader.set( this._path, path, value );
  }

}

module.exports = Container;
