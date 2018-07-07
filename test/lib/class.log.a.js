'use strict';

const TestBase = require( './class.base' );

class TestLogA extends TestBase {

  constructor( deps ) {
    super( deps, 'TestLogA' );

    this._logger = deps.get( 'logger' );

    this._logger( 'info', 'TestLogA constructor', { meta: 'data' } );

    this._logb = deps.get( './test/lib/class.log.b' );

  }

  init( done ) {
    this._logger( 'debug', 'TestLogA init', { meta: 'data' } );
    this._logger( 'warn', 'TestLogA init warn' );
    this._logger( 'warning', 'TestLogA init warning' );
    super.init( done );
  }

  dinit( done ) {
    this._logger( 'debug', 'TestLogA dinit', { meta: 'data' } );
    super.dinit( done );
  }

}

module.exports = TestLogA;