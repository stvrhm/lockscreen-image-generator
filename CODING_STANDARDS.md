# Coding Standards

## TypeScript return types

Prefer TypeScript's inferred return types when the implementation makes the
result clear. Add an explicit return type when it improves readability,
especially for object-shaped or union return types and at module boundaries
where the type is part of the function's contract.

## Lint policy

Oxlint correctness, suspicious, and performance categories are errors. Broad
style, pedantic, restriction, and nursery categories are disabled; enable style
rules individually when they express a convention this project wants to keep.
`no-undef` is an error, with browser globals for app code and Node globals for
server and build files. `sort-vars` is disabled because comma declarations are
used to group ordered initialization, and `no-use-before-define` is disabled
because Remix UI components can refer to module-level styles declared later in
the same file.
