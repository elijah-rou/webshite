---
title: "Mock entry: a fixed-size ring buffer"
description: Placeholder post for checking how long-form writing reads in the terminal.
date: 2026-10-08
category: MOCK
---

This is a placeholder post for checking long-form layout. Its subject is a small
data structure, so it has the paragraphs, headings, lists and code a real post would.

A ring buffer stores up to a fixed number of items in an array and reuses the slots
as items are removed. Adding and removing are constant time, and it never allocates
after construction. That suits queues with a known bound: audio voices, input
events, or the last few hundred log lines kept for a crash report.

## The shape

Two numbers describe the contents: the index of the oldest item, and how many items
there are. The next free slot is derived from them, wrapping at the end of the array.

```ts
export class RingBuffer<T> {
    private readonly items: (T | undefined)[];
    private head = 0;
    private count = 0;

    constructor(readonly capacity: number) {
        if (!Number.isInteger(capacity) || capacity < 1) {
            throw new RangeError('capacity must be a positive integer');
        }
        this.items = new Array(capacity);
    }

    push(item: T): boolean {
        if (this.count === this.capacity) { return false; }
        this.items[(this.head + this.count) % this.capacity] = item;
        this.count++;
        return true;
    }

    shift(): T | undefined {
        if (this.count === 0) { return undefined; }
        const item = this.items[this.head];
        this.items[this.head] = undefined;
        this.head = (this.head + 1) % this.capacity;
        this.count--;
        return item;
    }
}
```

Keeping a count instead of a tail index avoids the usual ambiguity where
`head === tail` could mean either empty or full.

> JavaScript's [remainder operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Remainder)
> keeps the sign of the dividend, so `-1 % 8` is `-1`. The indices above never go
> negative, but stepping backwards from the head would need
> `(index + capacity - 1) % capacity`.

## When it is full

`push` refuses new items once the buffer is full. That is one of three common
policies:

- Reject the new item and tell the caller, as here.
- Overwrite the oldest item, which suits logs where recent entries matter most.
- Wait until space frees up, which needs a second thread or an async queue.

Which one is right depends on what the items are, so a general-purpose buffer
should make the policy explicit rather than pick one silently.

### Clearing references

`shift` writes `undefined` into the slot it empties. Without that, the array keeps
a reference to the removed item, and the garbage collector cannot reclaim it until
the slot is reused. For a large buffer that is mostly idle, that may be never.

## Testing it

A ring buffer has few states, so the useful tests walk it through all of them:

1. Fill it to capacity and check that the next push is rejected.
2. Drain it and check that `shift` returns items in insertion order, then `undefined`.
3. Interleave pushes and shifts for several times the capacity, so the indices wrap
   more than once.

The third test catches most off-by-one mistakes in the modulo arithmetic. For the
rest, compare it with a plain array used as a queue over a few thousand random
operations.
