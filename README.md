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

To setup service dependencies make sure there's at a minimum an empty `.env` along with `COMPANY_PROFILE_API_KEY` key. It can be any string ->`COMPANY_PROFILE_API_KEY=a`. `.env` file must be in the root directory of this repository and then run:

```bash
docker compose up -d
```

Followed by database migrations

```bash
npm run db:migrate
```

Finally to run:

```bash
npm run dev
```

When the project is up, it can be found on `http://localhost:3000/`.
Api Docs are available on `http://localhost:3000/api-docs` and swagger `http://localhost:3000/swagger/`.

## Seeds

Seeding data

```bash
npm run db:seed
```

Creating a new seed from template (knex)

```bash
npm run db:cmd -- seed:make "<name_of_seed_file>"
```

## Tests

Unit tests can be run with

```bash
npm run test:unit
```

Integration tests can be run with

```bash
npm run test:integration
```

Note: If you have changed what will be rendered in different components, it is likely you will have to update snapshots for tests to pass. Refer to `chai-jest-snapshot` documentation to do that.
