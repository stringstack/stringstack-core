'use strict';

const TestBase = require( '../class.base' );

class ErrGetDinit extends TestBase {

  constructor( deps ) {
    super( deps, 'ErrGetDinit' );
  }

  dinit( done ) {
    this._f = this._deps.get( './test/lib/class.f' );
    super.dinit( done );
  }

}

module.exports = ErrGetDinit;
