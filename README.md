# Leserei

Leserei is a local EPUB to clean text/Markdown converter. It loads an `.epub`,
filters optional front matter, extracts book structure from XHTML, applies
reading cleanup heuristics, and exports plain text or Markdown.

## CLI

There is also a command line interface.

* Download the repo.
* Install the dependencies: `bun install`.
* Run the CLI: `bun convert`. Use `bun convert --help` for usage instructions.

## Development

Install dependencies:

```bash
bun install
```

Run the app:

```bash
bun dev
```

Verify changes:

```bash
bun test
bun run typecheck
```

Build for production:

```bash
bun run build
```
