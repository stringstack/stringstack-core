'use strict';

const TestBase = require( '../class.base' );

class TestA extends TestBase {

  constructor( deps ) {
    super( deps, 'TestA' );

    this._b = deps.inject( './test/lib/inject/class.b' );

  }

}

module.exports = TestA;
