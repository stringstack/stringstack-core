'use strict';

const TestBase = require( './class.base' );

class TestRootC extends TestBase {

  constructor( deps ) {
    super( deps, 'TestRootC' );

    this._root_d = deps.get( './test/lib/class.root-d' );

  }

}

module.exports = TestRootC;