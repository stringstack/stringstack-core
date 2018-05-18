'use strict';

// this module is copied to node_modules, so needs to jump back to test lib to get this base library
const TestBase = require( '../test/lib/class.base' );

class TestFakeModule extends TestBase {

  constructor( deps ) {
    super( deps, 'TestFakeModule' );

    this._a = deps.get( './test/lib/class.a' );

  }

}

module.exports = TestFakeModule;