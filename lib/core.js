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

          switch ( level ) {
            case 'emergency':
              level = 'emerg';
              break;
            case 'critical':
              level = 'crit';
              break;
            case 'err':
              level = 'error';
              break;
            case 'warn':
              level = 'warning';
              break;
            case 'information':
              level = 'info';
              break;
            default:
              // NO-OP
              break;
          }

          try {
            config.log( level, component, message, meta );
          } catch ( e ) {

            // eslint-disable-next-line no-console
            console.error( 'user log method threw an exception', e );

            // re-throw this bad boy, let it all burn!
            throw e;
          }

        };

        this._loader = new Loader( this._logger );

        this._loader._set( 'app', 'env', env );

        let nconf = new nconfProvider();
        this._loader._set( 'app', 'config', nconf );

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

    }

    return App;

  }

}

module.exports = Core;
