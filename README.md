# StringStack Core

StringStack/core is the dependency management and injection system at the heart of the StringStack echo system of 
components. It is responsible for instantiating, initializing and d-initializing components in the correct order.

This document will explain the details of implementing component interfaces as well as the semantics for how 
dependencies are managed.

## Component Interfaces

In StringStack nomenclature each dependency is referred to as a component. A component is a chunk of code responsible 
for a specific task. In more general terms, a class in object oriented patterns would have the same level of granularity 
as a StringStack component. In NodeJS, a module would typically have the same level of granularity as a StringStack 
component. In fact, in StringStack, there is typically a 1-to-1 correspondence between NodeJS modules and components.

There are two possible interface forms for StringStack components.

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
2. Prevents cycles in the graph of your dependency graph. Cycles in dependencies creates unmanageable code.
3. Promotes strong modularization of code and DRY patterns.
4. Enables considerably easier testing of your code since dependencies are injected via constructor or load methods.

Before we go on, a note on ES6 classes vs object literals. When we use the term 'instantiation', this refers to calling
`new SomeComponent(deps)` on a component of the ES6 class variety, or to calling `load(deps)` on the object literal 
variety. 

When StringStack core is instantiated, you pass in the root components. These are the top of your dependency graph. You
would do so like this.

```javascript

const Core = require('@stringstack/core');

let core = new Core({
    rootComponents: [
        './lib/some-component-a',
        './lib/some-component-b',
    ]
});

const App = core.createApp();

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
   |_B
     |_D
     |_E
   |_C
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
`/src/app/./lib/thing`, and `../lib/thing` becomes `/src/app/../lib/thing`. In both cases, the path new path is passed
directly to native `require(path)`. 

All other paths which do not start with `./` or `../` are passed directly to native `require(path)` un-modified.