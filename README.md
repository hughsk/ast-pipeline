# ast-pipeline [![Flattr this!](https://api.flattr.com/button/flattr-badge-large.png)](https://flattr.com/submit/auto?user_id=hughskennedy&url=http://github.com/hughsk/ast-pipeline&title=ast-pipeline&description=hughsk/ast-pipeline%20on%20GitHub&language=en_GB&tags=flattr,github,javascript&category=software)[![experimental](http://hughsk.github.io/stability-badges/dist/experimental.svg)](http://github.com/hughsk/stability-badges) #

Seamlessly pipe between text transform streams and AST transforms.

Say, for example, you have a source transform API similar to
[browserify](http://github.com/substack/node-browserify)'s: each file goes
through a series of transforms streams, the output of one becoming the input
of the next. Recently an increasing number of transform streams have appeared
that operate on plain old parseable JavaScript, generally using the following
pattern:

``` javascript
var escodegen = require('escodegen')
var through = require('through')
var esprima = require('esprima')
var modify = require('./modify')

module.exports = function(file, opts) {
  var buffer = []

  return through(function(data) {
    buffer.push(data)
  }, function() {
    buffer = buffer.join('\n')

    var ast = esprima.parse(buffer)

    // Whatever functionality goes here...
    modify(ast)

    buffer = escodegen.generate(ast)
    this.queue(buffer)
    this.queue(null)
  })
}
```

This is straightforward and pretty repeatable, but if you start chaining
together multiple transforms together that work like this, you get increasing
overhead from parsing/deparsing the JavaScript AST. In larger projects, this
can make builds take considerably longer than they would without the
transforms.

So, `ast-pipeline` lets you pass in an array of streams as normal, but also
allows you to pass in *functions* too. These functions are expected to take an
AST and transform it, calling a callback when they're ready to pass it on to
the next transform. If you chain a few AST transforms together, you'll only
have to parse/deparse once!

Switching between text transform streams and AST modifiers is handled
transparently, so you can still pass transforms in any order and they'll be
converted to the right format as required.

## Usage ##

[![ast-pipeline](https://nodei.co/npm/ast-pipeline.png?mini=true)](https://nodei.co/npm/ast-pipeline)

### `createPipeline = astPipeline([opts])` ###

Creates a new pipeline "factory". Takes the following options:

* `opts.preferAST`: expect a single AST object as both the input
  and ouptut of these pipelines.

### `createPipeline.decode(handle)` ###

Specify how to convert from a buffered text stream to an AST:

``` javascript
var css = require('css')

pipeline.decode(function(contents, next) {
  var ast = css.parse(contents)
  next(null, ast)
})
```

### `createPipeline.encode(handle)` ###

Specify how to convert from an AST object to a transform stream:

``` javascript
var css = require('css')

pipeline.encode(function(ast, next) {
  var contents = css.stringify(ast)
  next(null, contents)
})
```

### `createPipeline(transforms)` ###

Takes an array of `Stream` and `Function` transforms, returning a duplex
stream which will take the inital file input and output the transformed
contents.

``` javascript
var pipeline = require('ast-pipeline')
var css = require('css')
var fs = require('fs')
var bl = require('bl')

function reworker() {
  return pipeline().encode(function(ast, done) {
    done(null, css.stringify(ast))
  }).decode(function(ast, done) {
    done(null, css.parse(ast))
  })
}

function transformFile(filename, transforms, callback) {
  transforms = transforms.map(function(tr) {
    return tr(filename)
  })

  fs.createReadStream(filename)
    .pipe(reworker()(transforms))
    .pipe(bl(callback))
}
```

### AST Transforms ###

AST transforms are simply functions with the signature `(ast, done)`. They take
an object (generally, an AST), modify it, and pass it back to `done(err, ast)`.

If no new value is passed through the `done` callback, the previous value will
be used instead.

``` javascript
var variables = require('rework-variables')

module.exports = function(file) {
  return function(ast, done) {
    variables({
      hello: 'world'
    })(ast.stylesheet)

    done(null, ast)
  }
}
```

## License ##

MIT. See [LICENSE.md](http://github.com/hughsk/ast-pipeline/blob/master/LICENSE.md) for details.
