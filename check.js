// Read in a patch file and check that the patches all apply correctly.
const fs = require('fs')
const assert = require('assert')
const zlib = require('zlib')

const filename = process.argv[2]

if (filename == null) {
  console.error(`Usage: $ node check.js file.json[.gz]`)
  process.exit(1)
}

const {
  startContent,
  endContent,
  txns
} = JSON.parse(
  filename.endsWith('.gz')
  ? zlib.gunzipSync(fs.readFileSync(filename))
  : fs.readFileSync(filename, 'utf-8')
)

let content = startContent

console.log('applying', txns.length, 'txns...')
console.time('apply')
let lastTime = 0
for (let i = 0; i < txns.length; i++) {
  if (i % 10000 == 0) console.log(i)
  const {patches} = txns[i]
  // assert(time != null)
  assert(patches != null)
  assert(patches.length > 0)

  // let t = new Date(time).getTime()
  // assert(t >= lastTime)
  // lastTime = t

  for (const [pos, delHere, insContent, timestamp] of patches) {
    // if (insContent != '') console.log('Ins', {pos, content: insContent})
    // if (delHere != 0) console.log('Del', {pos, len: delHere})
    assert(content.length >= pos + delHere)
    const before = content.slice(0, pos)
    const after = content.slice(pos + delHere)
    content = before + insContent + after

    if (new Date(timestamp).toString() === 'Invalid Date') throw Error('invalid date')
  }
}
console.timeEnd('apply')

assert.strictEqual(content, endContent)

console.log(`Looking good - ${txns.length} apply cleanly.`)