'use strict';

const TestBase = require( './class.base' );

let testBase = null;

// static modules get load, init, dinit called, which are parallels to new, init, dinit on class modules.
let StaticH = {

  load: ( deps ) => {
    testBase = new TestBase( deps, 'StaticH' );
  },

  init: ( done ) => {
    testBase.init( done );
  },

  dinit: ( done ) => {
    testBase.dinit( done );
  }

};

module.exports = StaticH;