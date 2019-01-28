'use strict';

const TestBase = require( '../class.base' );

class TestC extends TestBase {

  constructor( deps ) {
    super( deps, 'TestC' );

    this._config = deps.get( 'config' );
    this._d = deps.get( './test/lib/general/class.d' );
    this._e = deps.get( './test/lib/general/class.e' );
  }

}

module.exports = TestC;
