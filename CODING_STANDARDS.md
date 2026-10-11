# Coding Standards

## TypeScript return types

Prefer TypeScript's inferred return types when the implementation makes the
result clear. Add an explicit return type when it improves readability,
especially for object-shaped or union return types and at module boundaries
where the type is part of the function's contract.
