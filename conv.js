// This is a simple tool to move the older format of a .time property on each txn into
// all the individual patches.

// Read in a patch file and check that the patches all apply correctly.
const fs = require('fs')
const assert = require('assert')
const zlib = require('zlib')



function convert(filename) {
  console.log('converting', filename)

  const data = JSON.parse(
    filename.endsWith('.gz')
    ? zlib.gunzipSync(fs.readFileSync(filename))
    : fs.readFileSync(filename, 'utf-8')
  )

  const result = {
    ...data,
    txns: data.txns.map(t => {
      let timestamp = t.time
      if (timestamp == null) throw Error('missing timestamp on txn')
      return {
        patches: t.patches.map(([a, b, c]) => [a, b, c, timestamp])
      }
    })
  }

  let out = JSON.stringify(result)
  if (filename.endsWith('.gz')) out = zlib.gzipSync(out)
  fs.writeFileSync(filename, out)

  console.log('OK')
}


const files = process.argv.slice(2)

if (files.length == 0) {
  console.error(`Usage: $ node conv.js file.json[.gz]`)
  process.exit(1)
}

files.forEach(convert)
