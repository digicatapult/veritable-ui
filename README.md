# veritable-ui

UI for `Veritable` utilizing [TSOA](https://tsoa-community.github.io/docs/getting-started.html), [HTMX](https://htmx.org/) and [@kitajs/html](https://www.npmjs.com/package/@kitajs/html) for JSX templating.

## Setup

To install dependencies:

```bash
npm install
```

And then to building the `tsoa` routes:

```bash
npm run tsoa:build
```

Followed by database migrations

```bash
npm run db:migrate
# seeding data
npm run db:seed
```

Finally to run:

```bash
npm run dev
```

## Seeds

Creating a new seed from template (knex)

```bash
npm run db:cmd -- seed:make "<name_of_seed_file>"
```

## Tests

Tests can be run with

```bash
npm run test
```
