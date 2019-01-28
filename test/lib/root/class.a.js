'use strict';

const TestBase = require( '../class.base' );

class TestRootA extends TestBase {

  constructor( deps ) {
    super( deps, 'TestRootA' );

    this._root_b = deps.get( './test/lib/root/class.b' );

  }

}

module.exports = TestRootA;
