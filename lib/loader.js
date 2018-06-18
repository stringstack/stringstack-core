'use strict';

const async = require( 'async' );
const Container = require( './container' );
const Path = require( 'path' );

class Loader {

  constructor() {

    this._instantiateCurrent = null;
    this._instantiateStack = [];
    this._initializeStack = [];
    this._dinitializeStack = [];

    this._components = {};

  }

  init( done ) {

    // clone then reverse the initialize stack
    let components = this._initializeStack.slice( 0 ).reverse();

    async.eachSeries( components, ( path, done ) => {

      let component = this._components[ path ];

      // bad component entry or already initialized, there is a bug someplace in this code!
      if ( !component ) {
        return done();
      }

      // no initialization needed
      if ( path === 'config' ) {
        component.initialized = true;
      }

      // we are already shutting down, skip it
      if ( component.initialized ) {
        return done();
      }

      if ( component.instance && typeof component.instance.init === 'function' ) {

        try {
          component.instance.init( ( err ) => {

            component.initialized = true;

            if ( err ) {
              return done( err );
            }

            return done();

          } );
        } catch ( e ) {
          return done( e );
        }

      } else {

        component.initialized = true;
        done();

      }

    }, done );

  }

  dinit( done ) {

    let components = this._dinitializeStack;

    async.eachSeries( components, ( path, done ) => {

      let component = this._components[ path ];

      // bad component entry or already dinitialized, there is a bug someplace in this code!
      if ( !component ) {
        return done();
      }

      // no dinitialization needed
      if ( path === 'config' ) {
        component.initialized = false;
      }

      // we never initialized this, skip it
      if ( !component.initialized ) {
        return done();
      }

      if ( component.instance && typeof component.instance.dinit === 'function' ) {

        try {
          component.instance.dinit( ( err ) => {
            component.initialized = false;

            if ( err ) {
              return done( err );
            }

            return done();

          } );
        } catch ( e ) {
          return done( e );
        }

      } else {

        component.initialized = false;
        done();

      }

    }, done );

  }

  get( sourcePath, targetPath ) {

    if ( typeof sourcePath !== 'string' || sourcePath.trim().lenght < 1 ) {
      throw new Error( 'sourcePath must be a non-empty string string' );
    }

    if ( typeof targetPath !== 'string' || targetPath.trim().lenght < 1 ) {
      throw new Error( 'targetPath must be a non-empty string string' );
    }

    sourcePath = this._normalizePath( sourcePath );
    targetPath = this._normalizePath( targetPath );

    if ( sourcePath !== this._instantiateCurrent && sourcePath !== 'app' ) {
      throw new Error( 'you must access your dependencies in your constructor only' );
    }

    if ( this._createsCycle( sourcePath, targetPath ) ) {
      throw new Error( 'dependency cycle created' );
    }

    // only create one of everything
    if ( this._components.hasOwnProperty( targetPath ) ) {

      // reset the init/dinit stacks to ensure this component initializes before everything that needs it
      // and dinitializes after everything that needs it.
      this._resetStacks( targetPath );

      return this._components[ targetPath ].instance;
    }

    let targetPathResolve = targetPath;
    if ( targetPathResolve.startsWith( '.' + Path.sep ) || targetPathResolve.startsWith( '..' + Path.sep ) ) {
      targetPathResolve = Path.normalize( Path.join( process.cwd(), targetPath ) );
    }

    let Module = null;
    try {
      Module = require( targetPathResolve );
    } catch ( e ) {
      throw e;
    }

    this._instantiateStack.push( targetPath );
    this._instantiateCurrent = targetPath;

    // initializes the init/dinit stacks and stores initial component reference.
    // also, avoid circular dependency
    this.set( sourcePath, targetPath, null );

    let container = new Container( targetPath, this );
    let instance = null;
    if ( typeof Module === 'function' ) {
      instance = new Module( container );
    } else {
      instance = Module;

      // if the component returns an object, we will pass dependencies to a load method if it exists
      if ( typeof Module === 'object' && Module && typeof Module.load === 'function' ) {
        Module.load( container );
      }

    }
    this._instantiateStack.pop();

    if ( this._instantiateStack.length > 0 ) {
      this._instantiateCurrent = this._instantiateStack[ this._instantiateStack.length - 1 ];
    } else {
      this._instantiateCurrent = null;
    }

    this.set( sourcePath, targetPath, instance );

    return instance;

  }

  _resetStacks( targetPath ) {

    // move to start of init stack, items popped off
    let initIndex = this._initializeStack.indexOf( targetPath );
    if ( initIndex > -1 ) {
      this._initializeStack.push( this._initializeStack[ initIndex ] );
      this._initializeStack.splice( initIndex, 1 );
    }

    // move to end of dinit stack, items shifted off
    let dinitIndex = this._dinitializeStack.indexOf( targetPath );
    if ( dinitIndex > -1 ) {
      this._dinitializeStack.push( this._dinitializeStack[ dinitIndex ] );
      this._dinitializeStack.splice( dinitIndex, 1 );
    }

    // propagate the reset to all child dependencies
    this._components[ targetPath ].dependencies.forEach( ( dependencyPath ) => {
      this._resetStacks( dependencyPath );
    } );

  }

  set( sourcePath, targetPath, instance ) {

    if ( typeof sourcePath !== 'string' || sourcePath.trim().lenght < 1 ) {
      throw new Error( 'sourcePath must be a non-empty string string' );
    }

    if ( typeof targetPath !== 'string' || targetPath.trim().lenght < 1 ) {
      throw new Error( 'targetPath must be a non-empty string string' );
    }

    if ( this._initializeStack.indexOf( targetPath ) < 0 ) {
      this._initializeStack.push( targetPath ); // we pop off this stack to init
    }

    if ( this._dinitializeStack.indexOf( targetPath ) < 0 ) {
      this._dinitializeStack.push( targetPath ); // we shift off this stack to dinit
    }

    let defaultInitialized = false;

    sourcePath = this._normalizePath( sourcePath );
    targetPath = this._normalizePath( targetPath );

    // ensure we track dependencies to check for cycles and resets
    if ( sourcePath !== 'app' && this._components.hasOwnProperty( sourcePath ) ) {
      let dependencyIndex = this._components[ sourcePath ].dependencies.indexOf( targetPath );
      if ( dependencyIndex < 0 ) {
        this._components[ sourcePath ].dependencies.push( targetPath );
      }
    }

    if ( this._components.hasOwnProperty( targetPath ) ) {

      this._components[ targetPath ].instance = instance;
      this._components[ targetPath ].initialized = defaultInitialized;

      return instance;

    }

    this._components[ targetPath ] = {
      path: targetPath,
      instance: instance,
      initialized: defaultInitialized,
      dependencies: []
    };

    return instance;

  }

  _normalizePath( path ) {


    path = path.trim();


    if ( path.endsWith( '.js' ) ) {
      path = path.replace( /\.js$/, '' ); // don't need this, require adds if needed
    }


    // relative paths are processed relative to process.cwd() globally
    if ( path.startsWith( '.' + Path.sep ) || path.startsWith( '..' + Path.sep ) ) {

      path = Path.join( process.cwd(), path );
    }

    path = Path.normalize( path );


    return path;

  }

  _createsCycle( sourcePath, targetPath, prefix ) {

    if ( typeof prefix !== 'string' ) {
      prefix = '';
    }

    // app is the meta root of all, so it always creates a cycle if someone includes it
    if ( targetPath === 'app' || sourcePath === targetPath ) {
      return true;
    }

    let component = this._components[ targetPath ];

    if ( !component ) {
      return false;
    }

    let cycleExists = false;
    component.dependencies.forEach( ( dependencyPath ) => {

      if ( cycleExists ) {
        return;
      }

      cycleExists = this._createsCycle( sourcePath, dependencyPath, prefix + '\t' );

    } );

    return cycleExists;

  }

}


module.exports = Loader;
