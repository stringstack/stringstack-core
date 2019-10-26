'use strict';

const Loader = require( './loader' );
const nconfProvider = require( 'nconf' ).Provider;

class Core {

  constructor() {

  }

  createApp( config = {} ) {

    class App {

      constructor( env ) {

        this._initialized = false;

        config = config || {};

        if ( typeof config.log !== 'function' ) {
          config.log = () => {
            // NO-OP
          };
        }

        this._logger = ( level, component, message, meta ) => {

          if ( typeof level !== 'string' ) {
            return;
          }

          // normalize log levels
          level = level.toLowerCase();

          try {
            config.log( level, component, message, meta );
          } catch ( e ) {

            // eslint-disable-next-line no-console
            console.error( 'user log method threw an exception', e );

            // re-throw this bad boy, let it all burn!
            throw e;
          }

        };

        // Create the loader and pass in the logger.
        //
        // The logger is passed in like this because it is wrapped by a scope for each component, which injects the
        // component's name space into each log entry. Env and config are the same for all components so we can just set
        // them globally on the next lines after instantiating the loader.
        this._loader = new Loader( this._logger );

        // env set globally because the env name is the same for all components
        this._loader.set( 'app', 'env', env );

        // config set globally because the config is the same for all components
        let nconf = new nconfProvider();
        this._loader.set( 'app', 'config', nconf );

        // clamp to array
        let rootComponents = config.rootComponents;
        if ( !Array.isArray( rootComponents ) ) {
          rootComponents = [];
        }

        // boot strap the dependency tree
        rootComponents.forEach( ( rootModule ) => {
          this._loader.get( 'app', rootModule );
        } );

        this._logger( 'notice', 'app', 'instantiated' );

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

      testComponent( path ) {

        const env = this._loader.get( 'app', 'env' );

        if ( typeof env !== 'string' || !env.match( /^test/ ) ) {

          const message = 'testComponent() is only indented for testing environment, ensure you instantiate App with an environment name beginning with the word \'test\' in order to access this method.';

          throw new Error( message )

        }

        return this._loader.get( 'app', path );

      }

    }

    return App;

  }

}

module.exports = Core;
