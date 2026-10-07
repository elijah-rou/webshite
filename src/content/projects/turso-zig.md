---
name: turso-zig
repo: https://github.com/elijah-rou/turso-zig
language: Zig
summary: Early Zig SDK for Turso embedded and local databases.
order: 6
---
An early Zig 0.16 SDK for Turso's embedded and local databases.

It opens databases, prepares statements, binds values, runs SQL, streams rows
and copies typed values out, and supports custom scalar and aggregate functions
and collations written in Zig. Every public function in the vendored Turso SDK
Kit 0.7.1 C API has a safe Zig counterpart, checked by a generated parity
manifest.

Ownership is explicit. Databases, connections and statements are owning values
released in reverse order, and values copied out of a statement belong to the
caller's allocator.

The first verified platform is Ubuntu x86_64 with dynamic linking.
