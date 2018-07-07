'use strict';

const TestBase = require( './class.base' );

class TestLogB extends TestBase {

  constructor( deps ) {
    super( deps, 'TestLogB' );

    this._logger = deps.get( 'logger' );

    this._logger( 'info', 'TestLogB constructor', { meta: 'data' } );
    this._logger( 'verbose', 'TestLogB constructor', { meta: 'data' } );
  }

  init( done ) {
    this._logger( 'debug', 'TestLogB init', { meta: 'data' } );
    super.init( done );
  }

  dinit( done ) {
    this._logger( 'debug', 'TestLogB dinit', { meta: 'data' } );
    this._logger( 'information', 'TestLogB information' );
    super.dinit( done );
  }

}

module.exports = TestLogB;