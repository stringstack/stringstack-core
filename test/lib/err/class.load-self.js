'use strict';

const TestBase = require( '../class.base' );

class TestLoadSelf extends TestBase {

  constructor( deps ) {
    super( deps, 'TestLoadSelf' );

    this._err_load_self = deps.get( './test/lib/err/class.load-self' );

  }

}

module.exports = TestLoadSelf;
