'use strict';

const TestBase = require( './class.base' );

class TestC extends TestBase {

  constructor( deps ) {
    super( deps, 'TestC' );

    this._config = deps.get( './test/lib/class.config' );
    this._d = deps.get( './test/lib/class.d' );
    this._e = deps.get( './test/lib/class.e' );
  }

}

module.exports = TestC;