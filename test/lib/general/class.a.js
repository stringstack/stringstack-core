'use strict';

const TestBase = require( '../class.base' );

class TestA extends TestBase {

  constructor( deps ) {
    super( deps, 'TestA' );

    this._b = deps.get( './test/lib/general/class.b' );

  }

}

module.exports = TestA;
