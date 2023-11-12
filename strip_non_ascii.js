// Read in a patch file and replace all non-ascii characters with ascii characters.
const fs = require('fs')
const zlib = require('zlib')

let filename = process.argv[2]

if (filename == null) {
  console.error(`Usage: $ node strip_non_ascii.js file.json[.gz]`)
  process.exit(1)
}

const {
  startContent,
  endContent,
  txns
} = JSON.parse(
  filename.endsWith('.gz')
  ? zlib.gunzipSync(fs.readFileSync(`sequential_traces/${filename}`))
  : fs.readFileSync(`sequential_traces/${filename}`, 'utf-8')
)

// Replace all characters that aren't ascii characters. Unicode aware.
// https://mathiasbynens.be/notes/es6-unicode-regex
const replaceNonAscii = s => s.replace(/[^\x00-\x7F]/ug, "_")

// The data is stored using charcode offsets, as if the document were a list of unicode characters.
// Replacing all the characters with ASCII equivalents should have no effect on the indexes.

const result = {
  startContent: replaceNonAscii(startContent),
  endContent: replaceNonAscii(endContent),
  txns: txns.map(t => ({
    ...t,
    patches: t.patches.map(([pos, delHere, insContent]) => (
      [pos, delHere, replaceNonAscii(insContent)]
    ))
  }))
}

const json = JSON.stringify(result)
const datasetName = filename.split('.')[0]
const outFile = `sequential_traces/ascii_only/${datasetName}.json.gz`
const zipped = zlib.gzipSync(Buffer.from(json))
fs.writeFileSync(outFile, zipped)
console.log(`Rewrote dataset to ${outFile}`)
