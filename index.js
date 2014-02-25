var debug   = require('debug')('ast-pipeline')
var combine = require('stream-combiner')
var through = require('through')

module.exports = createPipeline

function createPipeline(opts) {
  var encode = null
  var decode = null

  opts = opts || {}

  pipeline.encode = _encode
  pipeline.decode = _decode

  return pipeline

  function pipeline(streams) {
    var count = streams.length

    debug('creating pipeline')

    streams = streams.filter(Boolean)

    if (!streams.length) return through()
    if (streams.every(isTextStream)) {
      return combine.apply(null, streams)
    }

    streams = streams.reduce(function(line, curr, i) {
      var next = streams[i+1]
      var prev = streams[i-1]

      var currIsText = isTextStream(curr)
      var nextIsText = isTextStream(next)
      var prevIsText = isTextStream(prev)

      var pushDecoder = prevIsText && !currIsText
      var pushEncoder = nextIsText && !currIsText
      var pushWrapper = currIsText

      line.push(
          pushDecoder && decoder()
        , pushWrapper ? curr : wrap(curr)
        , pushEncoder && encoder()
      )

      if (pushDecoder) debug('decoder')
      debug(pushWrapper ? 'text' : 'ast')
      if (pushEncoder) debug('encoder')

      return line
    }, [])

    debug('finished pipeline')

    return combine.apply(null, streams.filter(Boolean))
  }

  function _encode(_encoder) {
    encode = _encoder
    return this
  }

  function _decode(_decoder) {
    decode = _decoder
    return this
  }

  function encoder() {
    var ast = null

    return through(function(data) {
      ast = data
    }, function() {
      var stream = this

      encode(ast, function(err, data) {
        if (err) return stream.emit('error', err)
        stream.queue(data)
        stream.queue(null)
      })
    })
  }

  function decoder() {
    var buffer = []

    return through(function(data) {
      buffer.push(data)
    }, function() {
      var stream = this

      decode(buffer.join(''), function(err, data) {
        if (err) return stream.emit('error', err)
        stream.queue(data)
        stream.queue(null)
      })
    })
  }

  function wrap(modify) {
    var stream = through(write, flush)
    var ast = null

    return stream

    function write(data) {
      ast = data
    }

    function flush() {
      modify(ast, function(err, modified) {
        if (err) return stream.emit('error', err)
        stream.queue(modified || ast)
        stream.queue(null)
      })
    }
  }

  function isTextStream(stream) {
    if (!stream) return !opts.preferAST
    return typeof stream !== 'function'
  }
}
