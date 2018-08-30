/* eslint-disable no-undefined */
'use strict';

const assert = require( 'assert' );
const async = require( 'async' );
const Core = require( '../index' );
const ncp = require( 'ncp' ).ncp;
const Path = require( 'path' );

// should be used in all tests after init/dinit methods to ensure all modules are initialized/dinitialized properly
let checkInitialized = function ( app, initialized ) {
  return ( done ) => {

    try {

      Object.keys( app._loader._components ).forEach( ( path ) => {

        if ( !app._loader._components.hasOwnProperty( path ) ) {
          return;
        }

        assert.equal(
          app._loader._components[ path ].initialized,
          initialized,
          'module path ' + path + ' should be ' + (initialized ? 'initialized' : 'dinitialized')
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

  if ( app._loader._components.hasOwnProperty( targetPath ) ) {
    return app._loader._components[ targetPath ].instance;
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
          './test/lib/class.f'
        ]
      } );
      let app = new App( 'test' );

      // reset event log
      getComponentManually( app, './test/lib/class.f' )._resetEvents();

    } );

    it( 'should set env', function ( done ) {

      let core = new Core();

      let App = core.createApp( {
        rootComponents: [
          './test/lib/class.a'
        ]
      } );
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

      let App = core.createApp( {
        rootComponents: [
          './test/lib/class.a'
        ]
      } );
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

      let App = core.createApp( {
        rootComponents: [
          './test/lib/class.a'
        ]
      } );
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
          './test/lib/class.a'
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

          let actualEvents = getComponentManually( app, './test/lib/class.f' )._getEvents();
          let expectedEvents = [
            'TestA:instantiate',
            'TestB:instantiate',
            'TestDatabase:instantiate',
            'TestConfig:instantiate',
            'TestC:instantiate',
            'TestD:instantiate',
            'TestE:instantiate',
            'StaticH:instantiate',
            'TestF:instantiate',
            'TestG:instantiate',
            'TestConfig:init',
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
            'TestConfig:dinit',
            'TestConfig:init',
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
            'TestConfig:dinit',
            'TestConfig:init',
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
            'TestConfig:dinit'
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
          './test/lib/class.node-module'
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

          let actualEvents = getComponentManually( app, './test/lib/class.node-module' )._getEvents();
          let expectedEvents = [
            'TestNodeModule:instantiate',
            'TestFakeModule:instantiate',
            'TestA:instantiate',
            'TestB:instantiate',
            'TestDatabase:instantiate',
            'TestConfig:instantiate',
            'TestC:instantiate',
            'TestD:instantiate',
            'TestE:instantiate',
            'StaticH:instantiate',
            'TestF:instantiate',
            'TestG:instantiate',
            'TestConfig:init',
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
            'TestDatabase:dinit',
            'TestConfig:dinit'
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
          './test/lib/class.root-a',
          './test/lib/class.root-c'
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

          let actualEvents = getComponentManually( app, './test/lib/class.root-a' )._getEvents();

          let expectedEvents = [
            'TestRootA:instantiate',
            'TestRootB:instantiate',
            'TestRootC:instantiate',
            'TestRootD:instantiate',
            'TestRootD:init',
            'TestRootC:init',
            'TestRootB:init',
            'TestRootA:init',
            'TestRootA:dinit',
            'TestRootB:dinit',
            'TestRootC:dinit',
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
          './test/lib/class.a'
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
          './test/lib/class.err.get_init'
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
            'you must access your dependencies in your constructor only',
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
          './test/lib/class.err.get_dinit'
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
            'you must access your dependencies in your constructor only',
            'error message does not match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      } );

    } );

    it( 'should return throw an error if attempting to get a dependency in any general method', function ( done ) {

      let core = new Core();

      let App = core.createApp( {
        rootComponents: [
          './test/lib/class.err.get_method'
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
            getComponentManually( app, './test/lib/class.err.get_method' ).method( done );
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
            'you must access your dependencies in your constructor only',
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
          './test/lib/class.err.load-self'
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
      assert.equal( exception.message, 'dependency cycle created' );


    } );

    it( 'should allow shared dependency chains without cycles (dependency paths need not be a tree)',
      function ( done ) {

        let core = new Core();

        let App = core.createApp( {
          rootComponents: [
            './test/lib/class.cycle-a'
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

            let actualEvents = getComponentManually( app, './test/lib/class.cycle-a' )._getEvents();
            let expectedEvents = [
              'TestCycleA:instantiate',
              'TestCycleB:instantiate',
              'TestCycleC:instantiate',
              'TestCycleD:instantiate',
              'TestCycleE:instantiate',
              'TestCycleF:instantiate',
              'TestCycleI:instantiate',
              'TestCycleG:instantiate',
              'TestCycleH:instantiate',
              'TestCycleI:init',
              'TestCycleF:init',
              'TestCycleE:init',
              'TestCycleD:init',
              'TestCycleC:init',
              'TestCycleH:init',
              'TestCycleG:init',
              'TestCycleB:init',
              'TestCycleA:init',
              'TestCycleA:dinit',
              'TestCycleB:dinit',
              'TestCycleG:dinit',
              'TestCycleH:dinit',
              'TestCycleC:dinit',
              'TestCycleD:dinit',
              'TestCycleE:dinit',
              'TestCycleF:dinit',
              'TestCycleI:dinit'
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
          './test/lib/class.log.a'
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
                'instantiating class component: ' + dir + '/test/lib/class.log.a',
                undefined
              ],
              [
                'info',
                dir + '/test/lib/class.log.a',
                'TestLogA constructor',
                {
                  'meta': 'data'
                }
              ],
              [
                'info',
                'loader',
                'instantiating class component: ' + dir + '/test/lib/class.log.b',
                undefined
              ],
              [
                'info',
                dir + '/test/lib/class.log.b',
                'TestLogB constructor',
                {
                  'meta': 'data'
                }
              ],
              [
                'verbose',
                dir + '/test/lib/class.log.b',
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
                dir + '/test/lib/class.log.b',
                'TestLogB init',
                {
                  'meta': 'data'
                }
              ],
              [
                'info',
                'loader',
                'initialized component ' + dir + '/test/lib/class.log.b',
                undefined
              ],
              [
                'debug',
                dir + '/test/lib/class.log.a',
                'TestLogA init',
                {
                  'meta': 'data'
                }
              ],
              [
                'warning',
                dir + '/test/lib/class.log.a',
                'TestLogA init warn',
                undefined
              ],
              [
                'warning',
                dir + '/test/lib/class.log.a',
                'TestLogA init warning',
                undefined
              ],
              [
                'info',
                'loader',
                'initialized component ' + dir + '/test/lib/class.log.a',
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
                dir + '/test/lib/class.log.a',
                'TestLogA dinit',
                {
                  'meta': 'data'
                }
              ],
              [
                'info',
                'loader',
                'd-initialized component ' + dir + '/test/lib/class.log.a',
                undefined
              ],
              [
                'debug',
                dir + '/test/lib/class.log.b',
                'TestLogB dinit',
                {
                  'meta': 'data'
                }
              ],
              [
                'info',
                dir + '/test/lib/class.log.b',
                'TestLogB information',
                undefined
              ],
              [
                'info',
                'loader',
                'd-initialized component ' + dir + '/test/lib/class.log.b',
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