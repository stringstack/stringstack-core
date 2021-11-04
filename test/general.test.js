/* eslint-disable no-undefined */
'use strict';

const assert = require( 'assert' );
const async = require( 'async' );
const Core = require( '../index' );
const ncp = require( 'ncp' ).ncp;
const Path = require( 'path' );

function removeSourceRootPath( str ) {
  return str.replace( new RegExp( process.cwd(), 'g' ), '' );
}

// should be used in all tests after init/dinit methods to ensure all modules are initialized/dinitialized properly
let checkInitialized = function ( app, initialized ) {
  return ( done ) => {

    try {

      Object.keys( app._loader._components ).forEach( ( path ) => {

        if ( !app._loader._components.hasOwnProperty( path ) ) {
          return;
        }

        assert.equal(
          app._loader._components[path].initialized,
          initialized,
          'module path ' + path + ' should be ' + ( initialized ? 'initialized' : 'dinitialized' )
        );

      } );

    } catch ( e ) {
      return done( e );
    }

    setImmediate( done );

  };
};

/**
 * Will not trigger any access logs and break tests checking access counts.
 *
 * @param app
 * @param targetPath
 * @returns {*}
 */
let getComponentManually = function ( app, targetPath ) {

  targetPath = app._loader._normalizePath( targetPath );

  if ( app._loader._componentInstances.hasOwnProperty( targetPath ) ) {
    return app._loader._componentInstances[targetPath];
  }

  return null;

};

/**
 *
 * Will trigger access logs and will break tests checking access counts.
 *
 * @param app
 * @param targetPath
 * @returns {*}
 */
let getComponentNative = function ( app, targetPath ) {
  return app._loader.get( 'app', targetPath );
};

describe( 'general', function () {

  describe( 'core', function () {

    beforeEach( function () {

      let core = new Core();

      let App = core.createApp( {
        rootComponents: [
          './test/lib/general/class.f'
        ]
      } );
      let app = new App( 'test' );

      // reset event log
      getComponentManually( app, './test/lib/general/class.f' )._resetEvents();

    } );

    it( 'should set env', function ( done ) {

      let core = new Core();

      let App = core.createApp();
      let app = new App( 'test' );

      async.series( [
        ( done ) => {
          app.init( done );
        },
        checkInitialized( app, true ),
        ( done ) => {


          try {

            assert.equal( getComponentManually( app, 'env' ), 'test', 'environment should be test' );

          } catch ( e ) {
            return done( e );
          }

          done();

        },
        ( done ) => {
          app.dinit( done );
        },
        checkInitialized( app, false )
      ], done );

    } );

    it( 'should set package', function ( done ) {

      let core = new Core();

      let App = core.createApp();
      let app = new App( 'test' );

      async.series( [
        ( done ) => {
          app.init( done );
        },
        checkInitialized( app, true ),
        ( done ) => {


          try {

            let actualPackage = getComponentNative( app, './package.json' );

            // clone the expected package
            let expectedPackage = JSON.parse( JSON.stringify( require( Path.join( process.cwd(), 'package.json' ) ) ) );

            assert.deepStrictEqual( actualPackage,
              expectedPackage,
              'package.json should load and match the package.json in the root app directory (working directory)' );

          } catch ( e ) {
            return done( e );
          }

          done();

        },
        ( done ) => {
          app.dinit( done );
        },
        checkInitialized( app, false )
      ], done );

    } );

    it( 'should set config', function ( done ) {

      let testConfig = {
        testModule: {
          test: 'value'
        }
      };

      let core = new Core();

      let App = core.createApp();
      let app = new App( 'test' );

      async.series( [
        ( done ) => {

          try {

            let config = getComponentManually( app, 'config' );

            config.defaults( testConfig );

            assert( config, 'config should be truthy' );

          } catch ( e ) {
            return done( e );
          }

          done();


        },
        ( done ) => {
          app.init( done );
        },
        checkInitialized( app, true ),
        ( done ) => {

          try {

            let config = getComponentNative( app, 'config' );

            assert( config, 'config should be truthy' );

            let testValue = config.get( 'testModule' );

            assert.deepEqual( testValue, testConfig.testModule );

          } catch ( e ) {
            return done( e );
          }

          done();

        },
        ( done ) => {
          app.dinit( done );
        },
        checkInitialized( app, false )
      ], done );

    } );

    it( 'should load dependencies correctly and init/dinit in the correct order', function ( done ) {

      let core = new Core();

      let App = core.createApp( {
        rootComponents: [
          './test/lib/general/class.config.setup',
          './test/lib/general/class.a'
        ]
      } );
      let app = new App( 'test' );

      // console.log( 'STACK', JSON.stringify( app._loader._components, null, 4 ) );

      // init/dinit over and over. It is up to the actual modules to ensure they reset their internal state
      // correctly on subsequent init/dinit cycles.
      async.series( [
        checkInitialized( app, false ),
        ( done ) => {
          app.init( done );
        },
        checkInitialized( app, true ),
        ( done ) => {
          app.dinit( done );
        },
        checkInitialized( app, false ),
        ( done ) => {
          app.init( done );
        },
        checkInitialized( app, true ),
        ( done ) => {
          app.dinit( done );
        },
        checkInitialized( app, false ),
        ( done ) => {
          app.init( done );
        },
        checkInitialized( app, true ),
        ( done ) => {
          app.dinit( done );
        },
        checkInitialized( app, false ),
        ( done ) => {

          let actualEvents = getComponentManually( app, './test/lib/general/class.a' )._getEvents();
          let expectedEvents = [
            'TestConfigSetup:instantiate',
            'TestA:instantiate',
            'TestB:instantiate',
            'TestDatabase:instantiate',
            'TestC:instantiate',
            'TestD:instantiate',
            'TestE:instantiate',
            'StaticH:instantiate',
            'TestF:instantiate',
            'TestG:instantiate',
            'TestConfigSetup:init',
            'TestDatabase:init',
            'TestG:init',
            'TestF:init',
            'StaticH:init',
            'TestE:init',
            'TestD:init',
            'TestC:init',
            'TestB:init',
            'TestA:init',
            'TestA:dinit',
            'TestB:dinit',
            'TestC:dinit',
            'TestD:dinit',
            'TestE:dinit',
            'StaticH:dinit',
            'TestF:dinit',
            'TestG:dinit',
            'TestDatabase:dinit',
            'TestConfigSetup:dinit',
            'TestConfigSetup:init',
            'TestDatabase:init',
            'TestG:init',
            'TestF:init',
            'StaticH:init',
            'TestE:init',
            'TestD:init',
            'TestC:init',
            'TestB:init',
            'TestA:init',
            'TestA:dinit',
            'TestB:dinit',
            'TestC:dinit',
            'TestD:dinit',
            'TestE:dinit',
            'StaticH:dinit',
            'TestF:dinit',
            'TestG:dinit',
            'TestDatabase:dinit',
            'TestConfigSetup:dinit',
            'TestConfigSetup:init',
            'TestDatabase:init',
            'TestG:init',
            'TestF:init',
            'StaticH:init',
            'TestE:init',
            'TestD:init',
            'TestC:init',
            'TestB:init',
            'TestA:init',
            'TestA:dinit',
            'TestB:dinit',
            'TestC:dinit',
            'TestD:dinit',
            'TestE:dinit',
            'StaticH:dinit',
            'TestF:dinit',
            'TestG:dinit',
            'TestDatabase:dinit',
            'TestConfigSetup:dinit'
          ];

          try {

            assert.deepStrictEqual( actualEvents,
              expectedEvents,
              'log of instantiation, initialization and d-initialization is not correct' );

          } catch ( e ) {
            return done( e );
          }

          done();

        }
      ], done );

    } );

    it( 'should allow test access via testComponent()', function ( done ) {

      let core = new Core();

      let App = core.createApp( {
        rootComponents: [
          './test/lib/general/class.config.setup',
          './test/lib/general/class.a'
        ]
      } );
      let app = new App( 'test' );

      // init/dinit over and over. It is up to the actual modules to ensure they reset their internal state
      // correctly on subsequent init/dinit cycles.
      async.series( [
        ( done ) => {

          try {
            const component = app.testComponent( './test/lib/general/class.d' );
            assert.strictEqual( component.isInitialized(), false, 'component should not be initialized' );
          } catch ( e ) {
            return done( e );
          }

          done();
        },
        checkInitialized( app, false ),
        ( done ) => {
          app.init( done );
        },
        ( done ) => {

          try {
            const component = app.testComponent( './test/lib/general/class.d' );
            assert.strictEqual( component.isInitialized(), true, 'component should be initialized' );
          } catch ( e ) {
            return done( e );
          }

          done();
        },
        checkInitialized( app, true ),
        ( done ) => {
          app.dinit( done );
        },
        ( done ) => {

          try {
            const component = app.testComponent( './test/lib/general/class.d' );
            assert.strictEqual( component.isInitialized(), false, 'component should not be initialized' );
          } catch ( e ) {
            return done( e );
          }

          done();
        },
        checkInitialized( app, false ),
        ( done ) => {

          let actualEvents = getComponentManually( app, './test/lib/general/class.a' )._getEvents();
          let expectedEvents = [
            'TestConfigSetup:instantiate',
            'TestA:instantiate',
            'TestB:instantiate',
            'TestDatabase:instantiate',
            'TestC:instantiate',
            'TestD:instantiate',
            'TestE:instantiate',
            'StaticH:instantiate',
            'TestF:instantiate',
            'TestG:instantiate',
            'TestConfigSetup:init',
            'TestDatabase:init',
            'TestG:init',
            'TestF:init',
            'StaticH:init',
            'TestE:init',
            'TestD:init',
            'TestC:init',
            'TestB:init',
            'TestA:init',
            'TestA:dinit',
            'TestB:dinit',
            'TestC:dinit',
            'TestD:dinit',
            'TestE:dinit',
            'StaticH:dinit',
            'TestF:dinit',
            'TestG:dinit',
            'TestDatabase:dinit',
            'TestConfigSetup:dinit'
          ];

          try {

            assert.deepStrictEqual( actualEvents,
              expectedEvents,
              'log of instantiation, initialization and d-initialization is not correct' );

          } catch ( e ) {
            return done( e );
          }

          done();

        }
      ], done );

    } );

    it( 'should allow test access via testComponent() for other compatible environment names', function ( done ) {

      let core = new Core();

      let App = core.createApp( {
        rootComponents: [
          './test/lib/general/class.config.setup',
          './test/lib/general/class.a'
        ]
      } );
      let app = new App( 'testing' );

      // init/dinit over and over. It is up to the actual modules to ensure they reset their internal state
      // correctly on subsequent init/dinit cycles.
      async.series( [
        ( done ) => {

          try {
            const component = app.testComponent( './test/lib/general/class.d' );
            assert.strictEqual( component.isInitialized(), false, 'component should not be initialized' );
          } catch ( e ) {
            return done( e );
          }

          done();
        },
        checkInitialized( app, false ),
        ( done ) => {
          app.init( done );
        },
        ( done ) => {

          try {
            const component = app.testComponent( './test/lib/general/class.d' );
            assert.strictEqual( component.isInitialized(), true, 'component should be initialized' );
          } catch ( e ) {
            return done( e );
          }

          done();
        },
        checkInitialized( app, true ),
        ( done ) => {
          app.dinit( done );
        },
        ( done ) => {

          try {
            const component = app.testComponent( './test/lib/general/class.d' );
            assert.strictEqual( component.isInitialized(), false, 'component should not be initialized' );
          } catch ( e ) {
            return done( e );
          }

          done();
        },
        checkInitialized( app, false ),
        ( done ) => {

          let actualEvents = getComponentManually( app, './test/lib/general/class.a' )._getEvents();
          let expectedEvents = [
            'TestConfigSetup:instantiate',
            'TestA:instantiate',
            'TestB:instantiate',
            'TestDatabase:instantiate',
            'TestC:instantiate',
            'TestD:instantiate',
            'TestE:instantiate',
            'StaticH:instantiate',
            'TestF:instantiate',
            'TestG:instantiate',
            'TestConfigSetup:init',
            'TestDatabase:init',
            'TestG:init',
            'TestF:init',
            'StaticH:init',
            'TestE:init',
            'TestD:init',
            'TestC:init',
            'TestB:init',
            'TestA:init',
            'TestA:dinit',
            'TestB:dinit',
            'TestC:dinit',
            'TestD:dinit',
            'TestE:dinit',
            'StaticH:dinit',
            'TestF:dinit',
            'TestG:dinit',
            'TestDatabase:dinit',
            'TestConfigSetup:dinit'
          ];

          try {

            assert.deepStrictEqual( actualEvents,
              expectedEvents,
              'log of instantiation, initialization and d-initialization is not correct' );

          } catch ( e ) {
            return done( e );
          }

          done();

        }
      ], done );

    } );

    it( 'should not allow test access via testComponent() when environment name doesn\'t start with test', function ( done ) {

      let core = new Core();

      let App = core.createApp( {
        rootComponents: [
          './test/lib/general/class.config.setup',
          './test/lib/general/class.a'
        ]
      } );
      let app = new App( 'production' );

      // correctly on subsequent init/dinit cycles.
      async.series( [
        ( done ) => {

          try {

            assert.throws(
              () => {
                app.testComponent( './test/lib/general/class.d' );
              },
              {
                message: 'testComponent() is only indented for testing environment, ensure you instantiate App with an environment name beginning with the word \'test\' in order to access this method.'
              },
              'error message does not match'
            );

          } catch ( e ) {
            return done( e );
          }

          done();
        }
      ], done );

    } );

    it( 'should load dependencies correctly on injection', function ( done ) {

      let core = new Core();

      let App = core.createApp( {
        rootComponents: [
          './test/lib/inject/class.a'
        ]
      } );
      let app = new App( 'test' );

      // console.log( 'STACK', JSON.stringify( app._loader._components, null, 4 ) );

      // init/dinit over and over. It is up to the actual modules to ensure they reset their internal state
      // correctly on subsequent init/dinit cycles.
      async.series( [
        checkInitialized( app, false ),
        ( done ) => {
          app.init( done );
        },
        checkInitialized( app, true ),
        ( done ) => {
          app.dinit( done );
        },
        checkInitialized( app, false ),
        ( done ) => {

          let actualEvents = getComponentManually( app, './test/lib/inject/class.a' )._getEvents();
          let expectedEvents = [
            'TestA:instantiate',
            'TestB:instantiate',
            'TestA:init',
            'TestB:init',
            'TestB:dinit',
            'TestA:dinit'
          ];

          try {

            assert.deepStrictEqual( actualEvents,
              expectedEvents,
              'log of instantiation, initialization and d-initialization is not correct' );

          } catch ( e ) {
            return done( e );
          }

          done();

        }
      ], done );

    } );

    it( 'should load dependencies correctly including node_modules in the correct order', function ( done ) {

      let core = new Core();

      let App = core.createApp( {
        rootComponents: [
          './test/lib/general/class.node-module'
        ]
      } );
      let app = null;

      // init/dinit over and over. It is up to the actual modules to ensure they reset their internal state
      // correctly on subsequent init/dinit cycles.
      async.series( [
        ( done ) => {
          ncp( 'test/lib/fake-module.js', 'node_modules/fake-module.js', ( err ) => {

            if ( err ) {
              return done( err );
            }

            setTimeout( done, 10 );
          } );
        },
        ( done ) => {

          try {
            app = new App( 'test' );
          } catch ( e ) {
            return done( e );
          }

          done();

        },
        ( done ) => {
          checkInitialized( app, false )( done );
        },
        ( done ) => {
          app.init( done );
        },
        ( done ) => {
          checkInitialized( app, true )( done );
        },
        ( done ) => {
          app.dinit( done );
        },
        ( done ) => {
          checkInitialized( app, false )( done );
        },
        ( done ) => {

          let actualEvents = getComponentManually( app, './test/lib/general/class.node-module' )._getEvents();
          let expectedEvents = [
            'TestNodeModule:instantiate',
            'TestFakeModule:instantiate',
            'TestA:instantiate',
            'TestB:instantiate',
            'TestDatabase:instantiate',
            'TestC:instantiate',
            'TestD:instantiate',
            'TestE:instantiate',
            'StaticH:instantiate',
            'TestF:instantiate',
            'TestG:instantiate',
            'TestDatabase:init',
            'TestG:init',
            'TestF:init',
            'StaticH:init',
            'TestE:init',
            'TestD:init',
            'TestC:init',
            'TestB:init',
            'TestA:init',
            'TestFakeModule:init',
            'TestNodeModule:init',
            'TestNodeModule:dinit',
            'TestFakeModule:dinit',
            'TestA:dinit',
            'TestB:dinit',
            'TestC:dinit',
            'TestD:dinit',
            'TestE:dinit',
            'StaticH:dinit',
            'TestF:dinit',
            'TestG:dinit',
            'TestDatabase:dinit'
          ];

          try {

            assert.deepStrictEqual( actualEvents,
              expectedEvents,
              'log of instantiation, initialization and d-initialization is not correct' );

          } catch ( e ) {
            return done( e );
          }

          done();

        }
      ], done );

    } );

    it( 'should allow multiple root components', function ( done ) {

      let core = new Core();

      let App = core.createApp( {
        rootComponents: [
          './test/lib/root/class.a',
          './test/lib/root/class.c'
        ]
      } );

      let app = new App( 'test' );

      // init/dinit over and over. It is up to the actual modules to ensure they reset their internal state
      // correctly on subsequent init/dinit cycles.
      async.series( [
        checkInitialized( app, false ),
        ( done ) => {
          app.init( done );
        },
        checkInitialized( app, true ),
        ( done ) => {
          app.dinit( done );
        },
        checkInitialized( app, false ),
        ( done ) => {

          let actualEvents = getComponentManually( app, './test/lib/root/class.a' )._getEvents();

          let expectedEvents = [
            'TestRootA:instantiate',
            'TestRootB:instantiate',
            'TestRootC:instantiate',
            'TestRootD:instantiate',
            'TestRootD:init',
            'TestRootB:init',
            'TestRootC:init',
            'TestRootA:init',
            'TestRootA:dinit',
            'TestRootC:dinit',
            'TestRootB:dinit',
            'TestRootD:dinit'
          ];

          try {

            assert.deepStrictEqual( actualEvents, expectedEvents,
              'log of instantiation, initialization and d-initialization is not correct' );

          } catch ( e ) {
            return done( e );
          }

          done();

        }
      ], done );

    } );

    it( 'should return an error if attempting to init twice', function ( done ) {

      let core = new Core();

      let App = core.createApp( {
        rootComponents: [
          './test/lib/general/class.a'
        ]
      } );
      let app = new App( 'test' );

      async.series( [
        ( done ) => {
          app.init( done );
        },
        checkInitialized( app, true ),
        ( done ) => {
          app.init( done );
        }
      ], ( err ) => {

        try {

          assert.equal( err.message,
            'already initialized',
            'error message does not match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      } );

    } );

    it( 'should return an error if attempting to get a dependency in an init method', function ( done ) {

      let core = new Core();

      let App = core.createApp( {
        rootComponents: [
          './test/lib/err/class.get_init'
        ]
      } );
      let app = new App( 'test' );

      async.series( [
        ( done ) => {
          app.init( done );
        },
        () => {
          done( new Error( 'init should have returned an error' ) );
        }
      ], ( err ) => {

        try {

          assert.equal( err.message,
            'you must access your dependencies in your constructor or load() method only',
            'error message does not match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      } );

    } );

    it( 'should return an error if attempting to get a dependency in a dinit method', function ( done ) {

      let core = new Core();

      let App = core.createApp( {
        rootComponents: [
          './test/lib/err/class.get_dinit'
        ]
      } );
      let app = new App( 'test' );

      let initGood = false;

      async.series( [
        ( done ) => {
          app.init( done );
        },
        checkInitialized( app, true ),
        ( done ) => {
          initGood = true;
          app.dinit( done );
        },
        () => {
          done( new Error( 'init should have returned an error' ) );
        }
      ], ( err ) => {

        try {

          assert.equal( initGood, true, 'should have passed init without error' );
          assert.equal( err.message,
            'you must access your dependencies in your constructor or load() method only',
            'error message does not match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      } );

    } );

    it( 'should throw an error if attempting to get a dependency in any general method', function ( done ) {

      let core = new Core();

      let App = core.createApp( {
        rootComponents: [
          './test/lib/err/class.get_method'
        ]
      } );
      let app = new App( 'test' );

      let initGood = false;
      let dinitGood = true;

      async.series( [
        ( done ) => {
          app.init( done );
        },
        checkInitialized( app, true ),
        ( done ) => {
          initGood = true;

          try {
            getComponentManually( app, './test/lib/err/class.get_method' ).method( done );
          } catch ( e ) {
            return done( e );
          }

          done();

        },
        ( done ) => {
          dinitGood = false;
          done();
        }
      ], ( err ) => {

        try {

          assert.equal( initGood, true, 'should have passed init without error' );
          assert.equal( dinitGood, true, 'should not have gotten to dinit' );
          assert.equal( err.message,
            'you must access your dependencies in your constructor or load() method only',
            'error message does not match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      } );

    } );

    it( 'should throw an error if component uses self as dependency', function () {

      let core = new Core();

      let App = core.createApp( {
        rootComponents: [
          './test/lib/err/class.load-self'
        ]
      } );

      let exception = null;
      try {

        // eslint-disable-next-line no-new
        new App( 'test' );

      } catch ( e ) {
        exception = e;
      }

      assert.ok( exception, 'failed to throw exception' );
      assert.equal( removeSourceRootPath( exception.message ), 'dependency cycle created from /test/lib/err/class.load-self to /test/lib/err/class.load-self' );


    } );

    it( 'should throw an error if a dependency cycle is created', function () {

      let core = new Core();

      let App = core.createApp( {
        rootComponents: [
          './test/lib/cycle.err/class.a'
        ]
      } );

      let exception = null;
      try {

        // eslint-disable-next-line no-new
        new App( 'test' );

      } catch ( e ) {
        exception = e;
      }

      assert.ok( exception, 'failed to throw exception' );
      assert.equal( removeSourceRootPath( exception.message ), 'dependency cycle created from /test/lib/cycle.err/class.d to /test/lib/cycle.err/class.b' );


    } );

    it( 'should throw an error if a.get(b) and b.inject(a)', function () {

      let core = new Core();

      let App = core.createApp( {
        rootComponents: [
          './test/lib/cycle.err.part-2/class.a'
        ]
      } );

      let exception = null;
      try {

        // eslint-disable-next-line no-new
        new App( 'test' );

      } catch ( e ) {
        exception = e;
      }

      assert.ok( exception, 'failed to throw exception' );
      assert.equal( removeSourceRootPath( exception.message ), 'dependency cycle created from /test/lib/cycle.err.part-2/class.b to /test/lib/cycle.err.part-2/class.a' );
      assert.equal( removeSourceRootPath( exception.stack ), "Error: dependency cycle created from /test/lib/cycle.err.part-2/class.b to /test/lib/cycle.err.part-2/class.a\n    at Loader._setComponentDependency (/lib/loader.js:308:13)\n    at Loader._load (/lib/loader.js:210:10)\n    at Loader.inject (/lib/loader.js:178:17)\n    at Container.inject (/lib/container.js:42:25)\n    at new TestCycleB (/test/lib/cycle.err.part-2/class.b.js:10:20)\n    at Loader._load (/lib/loader.js:226:18)\n    at Loader.get (/lib/loader.js:182:17)\n    at Container.get (/lib/container.js:29:25)\n    at new TestCycleA (/test/lib/cycle.err.part-2/class.a.js:10:20)\n    at Loader._load (/lib/loader.js:226:18)\n    at Loader.get (/lib/loader.js:182:17)\n    at /lib/core.js:72:24\n    at Array.forEach (<anonymous>)\n    at new App (/lib/core.js:71:24)\n    at Context.<anonymous> (/test/general.test.js:1083:9)\n    at callFn (/node_modules/mocha/lib/runnable.js:387:21)\n    at Test.Runnable.run (/node_modules/mocha/lib/runnable.js:379:7)\n    at Runner.runTest (/node_modules/mocha/lib/runner.js:535:10)\n    at /node_modules/mocha/lib/runner.js:653:12\n    at next (/node_modules/mocha/lib/runner.js:447:14)\n    at /node_modules/mocha/lib/runner.js:457:7\n    at next (/node_modules/mocha/lib/runner.js:362:14)\n    at /node_modules/mocha/lib/runner.js:420:7\n    at done (/node_modules/mocha/lib/runnable.js:334:5)\n    at callFn (/node_modules/mocha/lib/runnable.js:410:7)\n    at Hook.Runnable.run (/node_modules/mocha/lib/runnable.js:379:7)\n    at next (/node_modules/mocha/lib/runner.js:384:10)\n    at Immediate._onImmediate (/node_modules/mocha/lib/runner.js:425:5)\n    at processImmediate (internal/timers.js:456:21)" );

    } );

    it( 'should allow shared dependency chains without cycles (dependency paths need not be a tree)',
      function ( done ) {

        let core = new Core();

        let App = core.createApp( {
          rootComponents: [
            './test/lib/non-cycle/class.a'
          ]
        } );
        let app = new App( 'test' );

        // init/dinit over and over. It is up to the actual modules to ensure they reset their internal state
        // correctly on subsequent init/dinit cycles.
        async.series( [
          checkInitialized( app, false ),
          ( done ) => {
            app.init( done );
          },
          checkInitialized( app, true ),
          ( done ) => {
            app.dinit( done );
          },
          checkInitialized( app, false ),
          ( done ) => {

            let actualEvents = getComponentManually( app, './test/lib/non-cycle/class.a' )._getEvents();
            let expectedEvents = [
              'TestNonCycleA:instantiate',
              'TestNonCycleB:instantiate',
              'TestNonCycleC:instantiate',
              'TestNonCycleD:instantiate',
              'TestNonCycleE:instantiate',
              'TestNonCycleF:instantiate',
              'TestNonCycleI:instantiate',
              'TestNonCycleG:instantiate',
              'TestNonCycleH:instantiate',
              'TestNonCycleI:init',
              'TestNonCycleF:init',
              'TestNonCycleE:init',
              'TestNonCycleD:init',
              'TestNonCycleC:init',
              'TestNonCycleH:init',
              'TestNonCycleG:init',
              'TestNonCycleB:init',
              'TestNonCycleA:init',
              'TestNonCycleA:dinit',
              'TestNonCycleB:dinit',
              'TestNonCycleG:dinit',
              'TestNonCycleH:dinit',
              'TestNonCycleC:dinit',
              'TestNonCycleD:dinit',
              'TestNonCycleE:dinit',
              'TestNonCycleF:dinit',
              'TestNonCycleI:dinit'
            ];

            try {

              assert.deepStrictEqual( actualEvents,
                expectedEvents,
                'log of instantiation, initialization and d-initialization is not correct' );

            } catch ( e ) {
              return done( e );
            }

            done();

          }
        ], done );

      } );

    it( 'should handle log events', function ( done ) {

      let logHistory = [];

      let core = new Core();

      let App = core.createApp( {
        rootComponents: [
          './test/lib/log/class.a'
        ],
        log: ( level, path, message, meta ) => {
          logHistory.push( [ level, path, message, meta ] );
        }
      } );
      let app = new App( 'test' );

      async.series( [
        ( done ) => {
          app.init( done );
        },
        checkInitialized( app, true ),
        ( done ) => {
          app.dinit( done );
        },
        checkInitialized( app, false ),
        ( done ) => {

          try {

            // console.log( 'logHistory', JSON.stringify( logHistory, null, 4 ) );

            let dir = process.cwd();

            assert.deepStrictEqual( logHistory, [
              [
                'info',
                'loader',
                'instantiating class component: ' + dir + '/test/lib/log/class.a',
                undefined
              ],
              [
                'info',
                dir + '/test/lib/log/class.a',
                'TestLogA constructor',
                {
                  'meta': 'data'
                }
              ],
              [
                'info',
                'loader',
                'instantiating class component: ' + dir + '/test/lib/log/class.b',
                undefined
              ],
              [
                'info',
                dir + '/test/lib/log/class.b',
                'TestLogB constructor',
                {
                  'meta': 'data'
                }
              ],
              [
                'verbose',
                dir + '/test/lib/log/class.b',
                'TestLogB constructor',
                {
                  'meta': 'data'
                }
              ],
              [
                'notice',
                'app',
                'instantiated',
                undefined
              ],
              [
                'notice',
                'loader',
                'begin initializing components',
                undefined
              ],
              [
                'debug',
                dir + '/test/lib/log/class.b',
                'TestLogB init',
                {
                  'meta': 'data'
                }
              ],
              [
                'info',
                'loader',
                'initialized component ' + dir + '/test/lib/log/class.b',
                undefined
              ],
              [
                'debug',
                dir + '/test/lib/log/class.a',
                'TestLogA init',
                {
                  'meta': 'data'
                }
              ],
              [
                'warn',
                dir + '/test/lib/log/class.a',
                'TestLogA init warn',
                undefined
              ],
              [
                'warning',
                dir + '/test/lib/log/class.a',
                'TestLogA init warning',
                undefined
              ],
              [
                'info',
                'loader',
                'initialized component ' + dir + '/test/lib/log/class.a',
                undefined
              ],
              [
                'info',
                'loader',
                'initialized component config',
                undefined
              ],
              [
                'info',
                'loader',
                'initialized component env',
                undefined
              ],
              [
                'info',
                'loader',
                'initialized component app',
                undefined
              ],
              [
                'notice',
                'loader',
                'finished initializing components',
                undefined
              ],
              [
                'notice',
                'loader',
                'begin d-initializing components',
                undefined
              ],
              [
                'info',
                'loader',
                'd-initialized component app',
                undefined
              ],
              [
                'info',
                'loader',
                'd-initialized component env',
                undefined
              ],
              [
                'info',
                'loader',
                'd-initialized component config',
                undefined
              ],
              [
                'debug',
                dir + '/test/lib/log/class.a',
                'TestLogA dinit',
                {
                  'meta': 'data'
                }
              ],
              [
                'info',
                'loader',
                'd-initialized component ' + dir + '/test/lib/log/class.a',
                undefined
              ],
              [
                'debug',
                dir + '/test/lib/log/class.b',
                'TestLogB dinit',
                {
                  'meta': 'data'
                }
              ],
              [
                'information',
                dir + '/test/lib/log/class.b',
                'TestLogB information',
                undefined
              ],
              [
                'info',
                'loader',
                'd-initialized component ' + dir + '/test/lib/log/class.b',
                undefined
              ],
              [
                'notice',
                'loader',
                'finished d-initializing components',
                undefined
              ]
            ], 'should pass log events to logger' );

          } catch ( e ) {
            return done( e );
          }

          done();

        }
      ], done );

    } );

  } );

} );
