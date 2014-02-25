var variables    = require('rework-variables')
var transformify = require('transformify')
var through      = require('through')
var test         = require('tape')
var css          = require('css')
var pipeline     = require('./')
var fs           = require('fs')
var bl           = require('bl')

function reworker() {
  return pipeline().encode(function(ast, done) {
    done(null, css.stringify(ast))
  }).decode(function(str, done) {
    done(null, css.parse(str))
  })
}

test('single ast', function(t) {
  var piped = []

  piped.push(function(ast, next) {
    variables({ hello: 'world' })(ast.stylesheet)
    next()
  })

  fs.createReadStream(__dirname + '/fixture.css')
    .pipe(reworker()(piped))
    .pipe(bl(function(err, buf) {
      t.ifError(err)
      t.ok(Buffer.isBuffer(buf))
      var ast = css.parse(String(buf))
      t.equal(ast.type, 'stylesheet')
      ast = ast.stylesheet.rules[0]
      t.equal(ast.declarations[0].value, 'world')
      t.equal(ast.declarations[1].value, '$lorem')
      t.end()
    }))
})

test('double ast', function(t) {
  var piped = []

  piped.push(function(ast, next) {
    variables({ hello: 'world' })(ast.stylesheet)
    next()
  }, function(ast, next) {
    variables({ lorem: 'ipsum' })(ast.stylesheet)
    next()
  })

  fs.createReadStream(__dirname + '/fixture.css')
    .pipe(reworker()(piped))
    .pipe(bl(function(err, buf) {
      t.ifError(err)
      t.ok(Buffer.isBuffer(buf))
      var ast = css.parse(String(buf))
      t.equal(ast.type, 'stylesheet')
      ast = ast.stylesheet.rules[0]
      t.equal(ast.declarations[0].value, 'world')
      t.equal(ast.declarations[1].value, 'ipsum')
      t.end()
    }))
})

test('ast -> text', function(t) {
  var piped = []

  piped.push(function(ast, next) {
    variables({ hello: 'world' })(ast.stylesheet)
    next()
  }, transformify(function(str) {
    return str.toString().toUpperCase()
  })(__filename))

  fs.createReadStream(__dirname + '/fixture.css')
    .pipe(reworker()(piped))
    .pipe(bl(function(err, buf) {
      t.ifError(err)
      t.ok(Buffer.isBuffer(buf))
      var ast = css.parse(String(buf))
      t.equal(ast.type, 'stylesheet')
      ast = ast.stylesheet.rules[0]
      t.equal(ast.declarations[0].value, 'WORLD')
      t.equal(ast.declarations[1].value, '$LOREM')
      t.end()
    }))
})

test('text -> ast', function(t) {
  var piped = []

  piped.push(transformify(function(str) {
    return str.toString().toUpperCase()
  })(__filename), function(ast, next) {
    variables({ HELLO: 'world' })(ast.stylesheet)
    next()
  })

  fs.createReadStream(__dirname + '/fixture.css')
    .pipe(reworker()(piped))
    .pipe(bl(function(err, buf) {
      t.ifError(err)
      t.ok(Buffer.isBuffer(buf))
      var ast = css.parse(String(buf))
      t.equal(ast.type, 'stylesheet')
      ast = ast.stylesheet.rules[0]
      t.equal(ast.declarations[0].value, 'world')
      t.equal(ast.declarations[1].value, '$LOREM')
      t.end()
    }))
})
