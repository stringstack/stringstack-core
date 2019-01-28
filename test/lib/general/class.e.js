'use strict';

const TestBase = require( '../class.base' );

class TestE extends TestBase {

  constructor( deps ) {
    super( deps, 'TestE' );

    this._config = deps.get( 'config' );
    this._database = deps.get( './test/lib/general/class.database' );
    this._h = deps.get( './test/lib/general/static.h' );
    this._f = deps.get( './test/lib/general/class.f' );

  }

}

module.exports = TestE;
