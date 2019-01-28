'use strict';

const TestBase = require( '../class.base' );

class TestNodeModule extends TestBase {

  constructor( deps ) {
    super( deps, 'TestNodeModule' );

    // pulls from node_modules, not test/lib/fake-module.js
    this._fakeModule = deps.get( 'fake-module' );

  }

}

module.exports = TestNodeModule;
