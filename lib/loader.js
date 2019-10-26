'use strict';

const async = require( 'async' );
const Container = require( './container' );
const Path = require( 'path' );

class Loader {

  constructor( logger ) {

    this._logger = logger;

    this._instantiateStack = [ 'app' ];

    /**
     *
     * @type {{
     *  path: string,
     *  instance: instance,
     *  initialized: boolean,
     *  dependencies: [ string ]
     * }}
     *
     * @private
     */
    this._components = {};
    this._componentInstances = {};

  }

  init( done ) {

    this._logger( 'notice', 'loader', 'begin initializing components' );

    async.eachSeries( this._generateInitList(), ( path, done ) => {

      const component = this._components[path];
      const instance = this._componentInstances[path];

      // bad component entry or already initialized, there is a bug someplace in this code!
      if ( !component ) {
        this._logger( 'warn', 'loader', 'possible bug in stringstack/core, component not found in init stack ' + path );
        return done();
      }

      // no initialization needed
      if ( path === 'app' || path === 'config' || path === 'env' ) {
        component.initialized = true;
      }

      // we are already shutting down, skip it
      if ( component.initialized ) {
        this._logger( 'info', 'loader', 'initialized component ' + path );
        return done();
      }

      if ( instance && typeof instance.init === 'function' ) {

        try {

          instance.init( ( err ) => {

            if ( err ) {
              this._logger( 'error', 'loader', 'error initializing component ' + path, err );
              return done( err );
            }

            component.initialized = true;
            this._logger( 'info', 'loader', 'initialized component ' + path );

            return done();

          } );

        } catch ( e ) {
          this._logger( 'error', 'loader', 'caught exception initializing component ' + path, e );
          return done( e );
        }

      } else {

        // no init function, consider it initialized
        this._logger( 'info', 'loader', 'initialized component ' + path );
        component.initialized = true;

        done();

      }

    }, ( err ) => {

      if ( err ) {
        this._logger( 'error', 'loader', 'error initializing components', err );
        return done( err );
      }

      this._logger( 'notice', 'loader', 'finished initializing components' );
      done();

    } );

  }

  dinit( done ) {

    this._logger( 'notice', 'loader', 'begin d-initializing components' );

    async.eachSeries( this._generateDinitList(), ( path, done ) => {

      const component = this._components[path];
      const instance = this._componentInstances[path];

      // bad component entry or already initialized, there is a bug someplace in this code!
      if ( !component ) {
        this._logger( 'warn', 'loader', 'possible bug in stringstack/core, component not found in init stack ' + path );
        return done();
      }

      // no initialization needed
      if ( path === 'app' || path === 'config' || path === 'env' ) {
        component.initialized = false;
      }

      // we are already shutting down, skip it
      if ( !component.initialized ) {
        this._logger( 'info', 'loader', 'd-initialized component ' + path );
        return done();
      }

      if ( instance && typeof instance.dinit === 'function' ) {

        try {

          instance.dinit( ( err ) => {

            if ( err ) {
              this._logger( 'error', 'loader', 'error d-initializing component ' + path, err );
              return done( err );
            }

            component.initialized = false;
            this._logger( 'info', 'loader', 'd-initialized component ' + path );

            return done();

          } );

        } catch ( e ) {
          this._logger( 'error', 'loader', 'caught exception d-initializing component ' + path, e );
          return done( e );
        }

      } else {

        // no dinit function, consider it d-initialized
        this._logger( 'info', 'loader', 'd-initialized component ' + path );
        component.initialized = false;

        done();

      }

    }, ( err ) => {

      if ( err ) {
        this._logger( 'error', 'loader', 'error d-initializing components', err );
        return done( err );
      }

      this._logger( 'notice', 'loader', 'finished d-initializing components' );
      done();

    } );

  }

  inject( sourcePath, targetPath ) {
    return this._load( sourcePath, targetPath, true );
  }

  get( sourcePath, targetPath ) {
    return this._load( sourcePath, targetPath, false );
  }

  isLoaded( targetPath ) {

    targetPath = this._normalizePath( targetPath );

    return this._componentInstances.hasOwnProperty( targetPath ) && !!this._componentInstances[targetPath];

  }

  _load( sourcePath, targetPath, inject = false ) {

    this._checkPath( sourcePath );
    this._checkPath( targetPath );

    // make sure the paths are standard, so all comparisons work later on
    sourcePath = this._normalizePath( sourcePath );
    targetPath = this._normalizePath( targetPath );

    if ( sourcePath !== this._instantiateStackTop() ) {
      throw new Error( 'you must access your dependencies in your constructor or load() method only' );
    }

    // ensure stub in dependency tree without instance
    this._setComponent( targetPath );

    if ( inject ) {
      this._setComponentDependency( targetPath, sourcePath ); // source requested becoming dependency of target
    } else {
      this._setComponentDependency( sourcePath, targetPath ); // source requested target as a dependency
    }

    if ( this.isLoaded( targetPath ) ) {
      return this._componentInstances[targetPath];
    }

    this._instantiateStack.push( targetPath );

    const container = new Container( targetPath, this, this._logger );

    const Module = require( targetPath );
    let instance = null;

    if ( typeof Module === 'function' ) {

      this._logger( 'info', 'loader', 'instantiating class component: ' + targetPath );
      instance = new Module( container );

    } else {

      this._logger( 'info', 'loader', 'loading static component: ' + targetPath );
      instance = Module;

      // if the component returns an object, we will pass dependencies to a load method if it exists
      if ( Module && typeof Module.load === 'function' ) {
        Module.load( container );
      }

    }

    this._instantiateStack.pop();

    this._setComponent( targetPath, instance );

    return instance;

  }

  _instantiateStackTop() {

    if ( this._instantiateStack.length < 1 ) {
      return null;
    }

    return this._instantiateStack[this._instantiateStack.length - 1];
  }

  _checkPath( path ) {

    if ( typeof path !== 'string' || path.trim().lenght < 1 ) {
      throw new Error( 'path must be a non-empty string string' );
    }

  }

  _setComponent( path, instance = null ) {

    if ( !this._components.hasOwnProperty( path ) ) {

      this._components[path] = {
        path: path,
        initialized: false,
        dependencies: []
      };

      this._componentInstances[path] = instance || null;

    } else if ( !this._componentInstances[path] ) {

      // replace stub
      this._componentInstances[path] = instance || null;
    }

    return this._components[path].instance;

  }

  _setComponentDependency( sourcePath, targetPath ) {

    if ( !this._components.hasOwnProperty( sourcePath ) ) {

      this._components[sourcePath] = {
        path: sourcePath,
        instance: null,
        initialized: false,
        dependencies: []
      };

    }

    this._components[sourcePath].dependencies.push( targetPath );

    if ( this._createsCycle( sourcePath, targetPath ) ) {
      throw new Error( 'dependency cycle created' );
    }


  }


  set( sourcePath, targetPath, targetInstance ) {

    this._checkPath( sourcePath );
    this._checkPath( targetPath );

    sourcePath = this._normalizePath( sourcePath );
    targetPath = this._normalizePath( targetPath );

    this._setComponent( sourcePath );
    this._setComponent( targetPath, targetInstance );

    this._setComponentDependency( sourcePath, targetPath );

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

  _createsCycle( sourcePath, targetPath ) {

    // app is the meta root of all, so it always creates a cycle if someone includes it
    // also, its a cycle if something eventually includes itself
    if ( targetPath === 'app' || sourcePath === targetPath ) {
      return true;
    }

    let component = this._components[targetPath];

    if ( !component ) {
      return false;
    }

    let cycleExists = false;
    component.dependencies.forEach( ( dependencyPath ) => {

      if ( cycleExists ) {
        return;
      }

      cycleExists = this._createsCycle( sourcePath, dependencyPath );

    } );

    return cycleExists;

  }

  _generateInitList() {

    // The init order is reverse breadth first search. Dinit order is breadth first search, so we just reverse that list
    // and return it.
    return this._generateDinitList().slice( 0 ).reverse(); // shallow clone and reverse dinit list

  }

  _generateDinitList() {

    // we dinit in breadth-first search order

    // seed breadth first search
    const processList = Object.keys( this._components ); // we will run through all
    const outputList = [];

    const shiftPath = ( index ) => {

      let path = outputList[index];

      outputList.splice( index, 1 ); // remove path from middle
      outputList.push( path ); // put path on end

      // put dependencies on the end now, and their dependencies, etc.
      this._components[path].dependencies.forEach( ( dependency ) => {

        let index = outputList.indexOf( dependency );

        if ( index > -1 ) {
          shiftPath( index );
        }

      } );

    };

    const processPath = ( path ) => {

      let index = outputList.indexOf( path );

      // if path is already in the output, it needs to bump to the end, shift it!
      if ( index > -1 ) {

        shiftPath( index );

      } else {

        // path doesn't exist, add it to the list and queue up its dependencies for processing
        outputList.push( path );

        this._components[path].dependencies.forEach( ( dependency ) => {

          processList.push( dependency );

        } );

      }

    };

    while ( processList.length > 0 ) {
      processPath( processList.shift() );
    }

    return outputList;

  }

}


module.exports = Loader;
