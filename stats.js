// Read in a patch file and check that the patches all apply correctly.
const fs = require('fs')
const zlib = require('zlib')

const filename = process.argv[2]

if (filename == null) {
  console.error(`Usage: $ node stats.js file.json[.gz]`)
  process.exit(1)
}

const { startContent, endContent, txns } = JSON.parse(
  filename.endsWith('.gz')
  ? zlib.gunzipSync(fs.readFileSync(filename))
  : fs.readFileSync(filename, 'utf-8')
)

const round2dp = x => `${Math.round(x * 100) / 100}`
const pct = (num, den) => `${round2dp(num/den * 100)}%`

// Things to measure:
// - % of inserts only insert a single character
// - % of inserts within single character runs (where each character follows the last)

const txnsOfLength = []
let numInserts = 0
let numDeletes = 0
let numTxnsWithInsert = 0
let numTxnsWithDelete = 0
let numTxnsWithReplace = 0
let insOfLength1 = 0
let ins1OfLength1 = 0
let numPatches = 0
let charsInserted = 0
let charsDeleted = 0
let numNonAscii = 0
const nonAsciiChars = new Set()
let numSurrogatePairs = 0

let longestInsert = 0
let longestDelete = 0

let numRuns = 0

let lastPos = -1

for (let i = 0; i < txns.length; i++) {
  const {patches} = txns[i]

  txnsOfLength[patches.length] = (txnsOfLength[patches.length] ?? 0) + 1
  numPatches += patches.length

  let hasInsert = false, hasDelete = false, hasReplace = false

  for (const [pos, delHere, insContent] of patches) {
    if (insContent.length > 0) {
      numInserts++
      const chars = [...insContent] // Split into unicode characters
      charsInserted += chars.length

      if (chars.length === 1) insOfLength1++
      if (chars.length === 1 && patches.length === 1) ins1OfLength1++

      for (const c of chars) {
        const charCode = c.charCodeAt(0)
        if (charCode >= 128) {
          numNonAscii++
          nonAsciiChars.add(c)
        }

        if (charCode > 0xffff) {
          // The character will use a surrogate pair in javascript.
          // It is not safe to use string.splice (and friends).
          numSurrogatePairs++
        }
      }

      // Should also check that the last edit was an insert..
      if (patches.length === 1 && pos === lastPos) numRuns++

      lastPos = pos + chars.length

      if (delHere === 0) hasInsert = true
      else hasReplace = true

      longestInsert = Math.max(longestInsert, chars.length)
    }

    if (delHere > 0) {
      numDeletes++
      charsDeleted += delHere
      lastPos = pos

      if (insContent.length === 0) hasDelete = true

      longestDelete = Math.max(longestDelete, delHere)
    }
  }

  if (hasInsert) numTxnsWithInsert++
  if (hasDelete) numTxnsWithDelete++
  if (hasReplace) numTxnsWithReplace++
}


let depth = 0
const log = (...args) => depth == 0 ? console.log(...args) : console.log(' '.repeat(depth-1), ...args)

log(`There are ${txns.length} txns taking the document from ${[...startContent].length} to ${[...endContent].length} characters`)
log(`In total, there are ${charsInserted} characters inserted and ${charsDeleted} characters deleted`)
log(`Or ${charsInserted + charsDeleted} keystrokes`)
depth += 2
log(pct(txnsOfLength[1], txns.length), 'txns of length 1. Mean length', round2dp(numPatches / txns.length))
log(pct(numTxnsWithInsert, txns.length), 'txns have insert')
log(pct(numTxnsWithDelete, txns.length), 'txns have deletes')
log(pct(numTxnsWithReplace, txns.length), 'txns replace characters')

console.log()
depth = 0
log(`There are ${numInserts} inserts (${pct(numInserts, numPatches)} of patches insert text)`)
depth += 2
log(pct(insOfLength1, numInserts), 'of inserts have length 1')
log(round2dp(charsInserted / numInserts), 'average characters per insert')
log(pct(ins1OfLength1, txns.length), 'of txns just insert a single character')
log(pct(numRuns, numInserts), 'of inserts run on from the previous edit')
log(`The longest insert inserts ${longestInsert} characters`)
log(`There are ${numNonAscii} non-ascii inserted characters ${!numNonAscii ? '' : `(Examples: ${[...nonAsciiChars.values()].slice(0, 10).join('')})`}`)
if (numNonAscii > 0) log(`There are ${numSurrogatePairs} characters that need surrogate pairs to be stored in UTF16`)

if (numSurrogatePairs > 0) {
  log('WARNING: This data set contains characters that cannot be naively processed in languages')
  log('that use UCS2 string encoding, like Javascript, Java and C#. See README for more information')
}


console.log()
depth = 0
log(`There are ${numDeletes} deletes (${pct(numDeletes, numPatches)} of patches delete text)`)
depth = 2
log(`The longest delete deletes ${longestDelete} characters`)
