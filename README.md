# What is this?

This repository contains some editing histories from real world character-by-character editing traces. The goal of this repository is to provide some standard benchmarks that we can use to compare the performance of various OT / CRDT implementations.

## Data format

So far the data sets are all simply single user text editing histories. Each file has the same format:

```javascript
{
    startContent: '', // So far all traces start with empty documents
    endContent: '...', // Expected content after all patches have been applied

    txns: [{ // Each transaction contains 1 or more patches
        time: '2021-04-19T06:06:58.000Z', // <-- ISO timestamp of change
        patches: [ // 
            [2206,0,"r"] // Patches like [position, numDeleted, inserted content]
            [2204,1,""],
            /// ...
        ]
    }, // ...
    ]
}
```

The idea is, for each file you can start with `startContent` (so far, always the empty string), then apply all patches in each transaction in the file, and you should end up with `endContent`.

Each patch is an array with 3 fields:

1. Position in the document. This number should be specified in *unicode codepoints*, which is the same as the string.length field when all characters in the document are ASCII (as is the case now).
2. Number of deleted characters at this position
3. Inserted characters at this position, or an empty string.

This matches the semantics of [`Array.splice`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice).

Every patch will always either delete or insert something. Sometimes both.

When transactions contain multiple patches, the locations are in descending order so the patches are independent and can easily be applied sequentially.

Every transaction must have at least one patch.

The patches can be applied with this code:

```javascript
const {
  startContent,
  endContent,
  txns
} = JSON.parse(fs.readFileSync(filename, 'utf-8'))

let content = startContent

for (const {patches} in txns) {
  for (const [pos, delHere, insContent] of patches) {
    const before = content.slice(0, pos)
    const after = content.slice(pos + delHere)
    content = before + insContent + after
  }
}

assert(content === endContent)
```

Files are gzipped. Uncompress them on mac / linux using `gunzip *.gz`.

See check.js for a more complete example.


## Data sets

#### rustcode and sveltecomponent

These data sets were recorded by me (Joseph Gentle) using the [vscode tracker](https://github.com/josephg/vscode-tracker/). The change sets include multi-cursor edits and refactoring operations.

The `rustcode.json.gz` change set contains many of the edits to [this rust sourcecode file](https://github.com/josephg/skiplistrs/blob/140fe17f484daa2bf4e32983f6a4ce60020eee1a/src/skiplist.rs). Unfortunately most of the code was written before I started tracing edits.

And `sveltecomponent.json.gz` contains edits from [this svelte component](https://github.com/josephg/glassbeadtimer/blob/c3d8e14e2abc998a328cdabbd559c4db10b42e5b/src/App.svelte), which contains the UI for [this multiplayer game timer](https://glassbead.seph.codes/).

Timestamps for these traces are limited to second resolution for privacy.

These data sets are provided under the [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) license.


#### automerge-paper.json.gz

This data set is copied from the [automerge-perf](https://github.com/automerge/automerge-perf/) repository, prepared by [Martin Kleppmann](https://martin.kleppmann.com/). It contains the editing trace from writing [this LaTeX paper](https://arxiv.org/abs/1608.03960). The trace contains 182,315 inserts and 77,463 deletes.

Due to the editor in which the paper was written, each txn contains exactly 1 patch, which is either a single character insert or single character delete. Also there are no timestamps, so it looks like every edit happened at the same moment.


#### seph-blog1.json.gz

This contains the character by character editing trace while writing this blog post about CRDTs: [https://josephg.com/blog/crdts-go-brrr/](https://josephg.com/blog/crdts-go-brrr/). The post was written in markdown. This trace is similar to automerge-paper, since they both edit text - but it is about half the size and it has more variety in edit lengths.

At one point while writing this post, I thought inlining the images in SVG might be a good idea - so there's a single large insert of 4kb of content of SVG source (followed by me hitting undo!)

The final document length is 56769 characters.

This data set is provided under the [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) license.