# StringStack Core

StringStack/core is the dependency management and injection system at the heart of the StringStack ecosystem of 
components. It is responsible for instantiating, initializing and d-initializing components in the correct order.

This document will explain the details of implementing component interfaces as well as the semantics for how 
dependencies are managed.

## Component Interfaces

In StringStack nomenclature each dependency is referred to as a component. A component is a chunk of code responsible 
for a specific task. In more general terms, a class in object oriented patterns would have the same level of granularity 
as a StringStack component. In NodeJS, a module would typically have the same level of granularity as a StringStack 
component. In fact, in StringStack, there is typically a 1-to-1 correspondence between NodeJS modules and components.

There are two possible interface forms for StringStack components. There is a 3rd possible form, but its not a component
in the strict sense.

### Form 1 - ES6 Class

```javascript

class SomeComponent {
  
  constructor(deps) {
    
  }
  
  init(done) {
    done();  
  }
  
  dinit(done) {
    done();
  }
  
}

module.exports = SomeComponent;

```

Here we see an ES6 style class named `SomeComponent` with a constructor and two methods: `init()` and `dinit()`. We also 
see that the only thing exported by the NodeJS module is the `SomeComponent` class.

The constructor is passed one value: deps. This is short for dependencies. You can name it whatever you want in your 
code. Just remember that the first and only parameter passed in is a StringStack dependency container. More on the this
later.

The two methods, `init()` and `dinit()` are each passed a callback function. Again, you can name this callback function
whatever you like, but the first and only parameter passed in is the done callback. If your component passes an instance
of `Error` class to `done()`, then all initialization will stop and core will exit with an error.

### Form 2 - Object Literal

```javascript

let SomeComponent = {
  
  load: (deps) => {
    
  },
  
  init: (done) => {
    done();  
  },
  
  dinit: (done) => {
    done();
  }
  
}

module.exports = SomeComponent;

```

An object literal looks almost like the ES6 form except for two distinct differences. First, object literals don't have
constructors, so we use a `load()` method to pass in dependencies. Second, only one object literal will exist for this
component (global singleton) since StringStack will not instantiate this object with the `new Class()` syntax. 
Otherwise the semantics of loading components of either form are identical.

### Form 3 - JSON

The final form is completely different than the other two forms. It is not instantiated, initialized or d-initialized. 
This form is for including JSON files. The files are parsed and returned as native javascript data structures. For 
example, in any component you could call `deps.get('./package.json')` and this would return the parsed package.json file 
for your application, assuming your current working directory is where your package.json file is located. This is a 
great way to load config or other meta data. 

### Choosing a Form

Should you use form 1 or form 2? The question is really about testing. If you want truly isolated tests, then you
should use form 1. With form 1 you can have multiple tests that each pass in different dependency variations to your
component. You can then test your component under each scenario. With form 2, although StringStack will recall `load()`
it is up to your code to ensure consistency between tests, which means your tests now need to also test for consistency.
Internal StringStack engineers only use form 1 for StringStack components and for projects that utilize StringStack. 

### Interface Methods

The methods of each form are constructor, init, dinit; and load, init, dinit; respectively. The constructor and load
methods both accept a dependency container. The dependency container has one method `get(path)`. Path is a string 
containing the path of the component to be retrieved. See the Path Resolution section in this document to know how paths
are resolved.

Each component MUST get all of its dependencies in its constructor or load method. If you attempt to get a dependency 
outside of one of these methods an exception will be through by the container. 

Each of the `init()` and `dinit()` methods are optional. But, if your component does define either method your component 
MUST call the done method passed once your component is ready for all dependent components to start using it.

For an imaginary database component, it might look something like this.

```javascript

const SomeDatabaseDriver = require('somedatabase');

class SomeDatabaseComponent {
  
  constructor(deps) {
    this._config = deps.get('config').database;
    this._handle = new SomeDatabaseDriver(this._config);
  }
  
  init(done) {
    this._handle.connect(done);
  }
  
  dinit(done) {
    this._handle.disconnect(done);
  }
  
}
  
  
module.exports = SomeDatabaseComponent;

```


## Semantics

StringStack will instantiate, initialize and d-initialize each of your components, and all 3rd party components you load
in a very specific manner. The goal of this semantic is to ensure a few things:

1. Your dependencies are 100% ready to be used anytime your component is initialized. That is, it ensures graceful 
propagation of start and stop signals of your application. 
2. Prevents cycles in your dependency graph. Cycles in dependencies create unmanageable code. (Spaghetti code) 
3. Promotes strong modularization of code and DRY patterns.
4. Enables considerably easier testing of your code since dependencies are injected via constructor or load methods.

Before we go on, a note on ES6 classes vs object literals. When we use the term 'instantiation', this refers to calling
`new SomeComponent(deps)` on a component of the ES6 class variety, or to calling `load(deps)` on the object literal 
variety. 

When StringStack core is instantiated, you pass in the root components. These are the top of your dependency graph. You
would do so like this.

```javascript

const Core = require('@stringstack/core');

let core = new Core();

const App = core.createApp( {
  rootComponents: [
     './lib/some-component-a',
     './lib/some-component-b',
  ]
} );

let app = new App('production');

app.init();

onSomeProcessShutdownSignal( () => {
  app.dinit();
});

```

Here we are passing in two root components. The order matters. StringStack instantiates components in depth-first order.

That is, say you have a dependency tree like this:

```
Core
|_ A
|  |_C
|_ B
   |_D
     |_E
```

The components will be instantiated in this order: A, C, B, D, E. Instantiation order is pretty straight forward. 
Initialization, is a little less straight forward. Initialization is the process of calling `init()` on each component.
Recall that one of the goals of StringStack is to ensure all dependencies of a component are ready to accept requests
once `init()` is called on a component. That is, in our sample dependency graph, `B.init()`, will not be called until 
`D.init(done)` is called and `done()` is returned. Similarly, `D.init()` will not be called until `E.init(done)` is 
called and `done()` is returned. In the case of this graph, the initialization order would be E, D, B, C, A. 

For the case of d-initialization, the order is again simple, sorta. Components are d-initialized in reverse order of
initialization. For the above graph that would be A, C, B, D, E. But wait, isn't that just the instantiation order? In
this case it is. But it won't always be the same. Let us add another dependency to our example. Many applications use
a database. Furthermore, the database may be utilized at multiple levels in a dependency graph. Lets add one to our 
example.

```
Core
|_ A
|  |_C
|    |_DATABASE
|_ B
   |_D
     |_E
       |_DATABASE
```

Now we have both C and E components including DATABASE as a dependency. The instantiation order is now:

A, C, DATABASE, B, D, E. 

Notice that DATABASE is only instantiated once. E will be passed the same instance of DATABASE that was passed to C.
As for initialization order we have:

DATABASE, E, D, B, C, A

And for d-initialization we have:

A, C, B, D, E, DATABASE

Why?! The reason being is that during instantiation each component is simply declaring its dependencies. Nothing is 
going to start running yet. Its just depth-first order. Really, any order would be fine. Depth-first order is simply the
easiest order to implement and so we use it. Initialization is where order starts to matter because the moment `init()` 
is called on a component, that component MUST be able to start using all of its dependencies immediately. Since both C 
and E depend on DATABASE, DATABASE MUST be initialized before either C or E gets initialized. Although in this 
particular example there are more than one stable initialization orders, that will not always be the case for all 
examples. For example, this order would also work for this example:

DATABASE, C, E, A, D, B

The problem is this order is virtually random with a few constraints. It is not a consistent algorithm. The algorithm 
used by StringStack is reverse depth-first order, as apposed to the reverse of depth-first order. Finally, 
d-initialization is just the reverse of initialization order.

Finally, a component may include as many dependencies as is needed. Take for example this dependency graph.

```
Core
|_ A
   |_ B
   |  |_D
   |  |_E
   |_ C
      |_F
      |_G
```

The instantiation, initialization and d-initialization orders are:

Instantiate: A, B, D, E, C, F, G

Initialize: G, F, C, E, D, B, A

D-initialize: A, B, D, E, C, F, G


## Path Resolution

Path resolution in StringStack is very similar to native NodeJS `require(path)`. The only exception is for relative
include paths. That is, for paths that begin with `./` or `../`, StringStack will prefix the path with the current
working directory of your process. If your current working directory is `/src/app`, then `./lib/thing` becomes 
`/src/app/./lib/thing`, and `../lib/thing` becomes `/src/app/../lib/thing`. In both cases, the new path is passed
directly to native `require(path)`. 

All other paths which do not start with `./` or `../` are passed directly to native `require(path)` un-modified.

There is one caveat to everything just mentioned. Any include path that ends in `.js` is also modified and the trailing
`.js` is removed. This is because NodeJS doesn't require it and StringStack thinks there should be no difference in 
path for components that are a single file, or components that are a directory with an index.js file in it.

## Configuration

StringStack/core a built in configuration space. It is implemented with nconf (https://www.npmjs.com/package/nconf). 
The current version of nconf being used is v0.10.0. 

You can access the nconf instance with the dependency container. 

```javascript
  let config = deps.get( 'config' );
```

The nconf instance is a raw instance of nconf's provider class. We create an instance of nconf so that we don't create
a global, configuration singleton. Essentially we create the nconf instance like this.

```javascript
  let config = new require( 'nconf' ).Provider;
```

That is all that is done. It is up to you to initialize the instance. Keep in mind that nconf is is geared more toward 
synchronous loading of config, so you will need to trigger the loading and parsing of config resources in a constructor
of one of your custom components. It is recommended that you create a config setup component that is loaded as one of the
root components passed to ```rootComponents``` field passed to ```createApp()```. A config setup component would 
do something like this.

```javascript

  const request = require( 'request' );
  
  class SetupConfig {
    
    constructor(deps) {
      
      this._config = deps.get( 'config' );
        
      // This is where you would do the synchronous config loads. If your configs are local, loading synchronously in 
      // the constructor will make that config available immediately to all components in your application.
      //
      // You should consult documentation for nconf v0.10.0 for reference https://www.npmjs.com/package/nconf
      this._config
        .argv()
        .env()
        .file({ file: 'path/to/config.json' });
      
    }
    
    init(done) {
      
      // If you need to load config asynchronously, do it in the init method. That way all dependencies should wait
      // until init is called to pull their values. 
      request.get( 'http://some.config.server.com/app.json', (err, response, body) => {
        
        if (err) {
          return done(err);
        }
        
        body = JSON.parse( body );
        
        // You should consult documentation for nconf v0.10.0 for reference https://www.npmjs.com/package/nconf
        this._config.set('some.path', body);
        
        done();
        
      } );
      
    }
    
    // ...
    
  }
  
  module.exports = SetupConfig;

```

### Config for 3rd Party Components

One of the values of StringStack is the ability to include 3rd party libraries into your stack. Many of these 3rd party 
libraries, such as StringStack/express, will require config. Each of these components will specify where they will look
for config within the nconf component. The 3rd party component will also specify when the component expects config to be
available. For example, it may require config to be available at init time. This means you can provide config at load
or init time, since load time is before init. Another component may require its config to be available at load time so
that it may access config in its constructor or load method. However, we have yet to encounter a situation where load
time config requirements is the result of anything other than bad programming. If the developer of your 3rd party 
component requires load time config and has not made a solid case for why they can't wait until init time, you should
consider choosing a different 3rd party component.