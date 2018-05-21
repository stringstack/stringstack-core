'use strict';

const async = require( 'async' );
const Loader = require( './loader' );
const path = require( 'path' );

class Core {

  constructor( config ) {

    this._config = config;

  }

  createApp() {

    let config = this._config;

    class App {

      constructor( env ) {

        this._initialized = false;

        this._config = config;
        this._loader = new Loader();

        this._loader.set( 'app', 'env', env );

        // boot strap the dependency tree
        async.eachSeries( this._config.rootComponents, ( rootModule, done ) => {
          this._loader.get( 'app', rootModule, done );
        } );

      }

      init( done ) {

        if ( this._initialized ) {
          return done( new Error( 'already initialized' ) );
        }
        this._initialized = true;

        this._loader.init( done );
      }

      dinit( done ) {

        if ( !this._initialized ) {
          return done( new Error( 'not initialized' ) );
        }
        this._loader.dinit( ( err ) => {

          this._initialized = false;

          if ( err ) {
            return done( err );
          }

          done();

        } );
      }

    }

    return App;

  }

}

module.exports = Core;