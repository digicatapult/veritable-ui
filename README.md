# veritable-ui

A user interface for `Veritable` that allows to manage connections across supply chain and perform queries in relation to the supply chain. Utilizing [TSOA](https://tsoa-community.github.io/docs/getting-started.html), [HTMX](https://htmx.org/) and [@kitajs/html](https://www.npmjs.com/package/@kitajs/html) for JSX templates.

## Table of Contents

- [Setup](#setup)
- [Getting Started](#getting-started)
- [Development Mode/Local dev](#development-mode)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Database](#database)
- [Establishing connection](#establishing-connection)

## Setup

veritable-ui depends on a few external services:

- [veritable-cloudagent](https://github.com/digicatapult/veritable-cloudagent) - APIs for managing connections, credentials and messages.
- [IPFS](https://ipfs.tech) - a distributed file server for storing credential schemas
- [Keycloak](https://www.keycloak.org) - runs as a docker image for each node that handles authentication and users.

### Development & Testing

- [smtp4dev](https://github.com/rnwood/smtp4dev) - runs as a docker image for exchanging emails during onboarding workflows
- [WireMock](https://wiremock.org) - runs as a docker image for `integration` and `e2e` tests to mock an official national company register

### Prerequisites

> :warning: last updated: 08/07/2025

- docker v28.1.1 (later versions currently have [issues](https://github.com/docker/for-mac/issues/7693))
- npm 11.0.0+
- node 22.0.0+
- postgresql 17.5+

## Getting started

Install dependencies using:

```sh
npm install
```

After all packages have been installed run the below command which will create two files: `src/routes.ts`, `./build/swagger.json` and run the typescript compiler

```sh
npm run build
```

The service requires a Companies House API key:

- Register a [developer account](https://developer.company-information.service.gov.uk/).
- Create [an application](https://developer.company-information.service.gov.uk/manage-applications/add) set to `Live` environment.
- Within the new application create a `REST` API key.
- Add an `.env` file at the root of the project containing `COMPANY_PROFILE_API_KEY=apikey`.

Bring up all the required services for local development:

```sh
docker compose up -d --build
```

Database migration for Alice.

```sh
npm run db:migrate
```

Assert the presence of issuance records (DID, schema and credential definition) via the Alice cloudagent. Specifically, the script asserts any valid DID, the `COMPANY_DETAILS` schema and a credential definition based on that schema. The default schema is below 

```json
{
  "COMPANY_DETAILS": {
    "version": "1.0.0",
    "attrNames": ["company_number", "company_name"]
  }
}
```

These issuance records are required to form connections between personas. Behaviour of `init` depends on configuration of `ISSUANCE_` envs, which default to use existing records or create new records if none exist.

```sh
npm run dev:init
```

Finally, start the service and enjoy local development:

```sh
npm run dev
```

##### CLI Arguments

The `dev` and `dev:init` scripts support the following command-line arguments via the CLI:

| Argument              | Description                                      |
|-----------------------|--------------------------------------------------|
| `--add-schema <path>` | Path to a JSON file containing a schema to add. |
| `-v`, `--version`     | Output the current version of the CLI tool.     |

##### Example usage

```sh
npm run dev:init -- --add-schema=./schemas/myCustomSchema.json
```

> :bulb: When service is running, it can be accessed on `http://localhost:3000/`. Api Docs are available on `http://localhost:3000/api-docs` and swagger `http://localhost:3000/swagger/`.
> If you have opted to use `SMTP_EMAIL` for `EMAIL_TRANSPORT` env you'll find the server on `http://localhost:5001/`.

## Environment variables

This is the list of all environment variables including brief description

| variable name                    | required | default                                                        | description                                                                                                                                                                    |
| -------------------------------- | -------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PORT                             | y        | 3000                                                           | Port number of the service                                                                                                                                                     |
| LOG_LEVEL                        | n        | info                                                           | Logging level. Valid values are [ trace , debug , info , warn , error , fatal ]                                                                                                |
| DB_HOST                          | y        | localhost                                                      | The database hostname / host                                                                                                                                                   |
| DB_NAME                          | y        | veritable-ui                                                   | The port for the database                                                                                                                                                      |
| DB_USERNAME                      | y        | postgres                                                       | The database username                                                                                                                                                          |
| DB_PASSWORD                      | y        | postgres                                                       | The database password                                                                                                                                                          |
| DB_PORT                          | y        | 5432                                                           | The database port number                                                                                                                                                       |
| COOKIE_SESSION_KEYS              | y        | ['secret']                                                     | Session cookies                                                                                                                                                                |
| PUBLIC_URL                       | y        | http://localhost:3000                                          | URL that UI can be accessed                                                                                                                                                    |
| API_SWAGGER_BG_COLOR             | n        | #fafafa                                                        | Swagger background color                                                                                                                                                       |
| API_SWAGGER_TITLE                | n        | Veritable                                                      | Title for swagger interface                                                                                                                                                    |
| API_SWAGGER_HEADING              | n        | Veritable                                                      | Heading for swagger interface                                                                                                                                                  |
| IDP_CLIENT_ID                    | y        | veritable-ui                                                   | Client ID required for Keycloak                                                                                                                                                |
| IDP_PUBLIC_URL_PREFIX            | y        | http://localhost:3080/realms/veritable/protocol/openid-connect | Public authentication URL                                                                                                                                                      |
| IDP_INTERNAL_URL_PREFIX          | y        | http://localhost:3080/realms/veritable/protocol/openid-connect | Internal authentication URL                                                                                                                                                    |
| IDP_AUTH_PATH                    | y        | /auth                                                          | Auth path for keycloak                                                                                                                                                         |
| IDP_TOKEN_PATH                   | y        | /token                                                         | Tokens path for keycloak                                                                                                                                                       |
| IDP_JWKS_PATH                    | y        | /certs                                                         | Certificates path for keycloak                                                                                                                                                 |
| COMPANY_HOUSE_API_URL            | y        | https://api.company-information.service.gov.uk                 | An external service that contain list of all UK companies, look ups                                                                                                            |
| COMPANY_PROFILE_API_KEY          | y        | -                                                              | An API KEY required to access the company-information service                                                                                                                  |
| EMAIL_TRANSPORT                  | y        | STREAM                                                         | Nodemailer transport for sending emails which can be `STREAM` or `SMTP_EMAIL`. If `SMTP_EMAIL` additional configuration of the transport will be needed and is described below |
| EMAIL_FROM_ADDRESS               | y        | hello@veritable.com                                            | Email address that will appear "send from" in an automated emails                                                                                                              |
| EMAIL_ADMIN_ADDRESS              | y        | admin@veritable.com                                            | Admin's email address that will receive a copy of all comms                                                                                                                    |
| CLOUDAGENT_ADMIN_ORIGIN          | y        | http://localhost:3100                                          | veritabler-cloudagent url                                                                                                                                                      |
| CLOUDAGENT_ADMIN_WS_ORIGIN       | y        | ws://localhost:3100                                            | veritable-cloudagent web socker address/url                                                                                                                                    |
| CLOUDAGENT_ADMIN_PING_TIMEOUT_MS | n        | 30000                                                          | Timeout waiting for the next ping from the websocket server                                                                                                                    |
| INVITATION_PIN_SECRET            | y        | Buffer.from('secret', 'utf8')                                  | an encoded array of utf-8 format                                                                                                                                               |
| INVITATION_PIN_ATTEMPT_LIMIT     | y        | 5                                                              | number of allowed pin validation attempts                                                                                                                                      |
| INVITATION_FROM_COMPANY_NUMBER   | n        | 07964699                                                       | default company number, currently is us                                                                                                                                        |
| ISSUANCE_DID_POLICY              | y        | EXISTING_OR_NEW                                                | DID and either create or use existing: [CREATE_NEW, FIND_EXIStING, EXISTING_OR_NEW, did:somedid]                                                                               |
| ISSUANCE_SCHEMA_POLICY           | y        | EXISTING_OR_NEW                                                | Same as above but for credential schema                                                                                                                                        |
| ISSUANCE_CRED_DEF_POLICY         | y        | EXISTING_OR_NEW                                                | Same as above but this is for credential definitions                                                                                                                           |
| DEMO_MODE                        | y        | true                                                           | Enables or disables the `/reset` endpoint                                                                                                                                      |
| SOCRATA_API_URL                  | y        | https://data.ny.gov/resource/p66s-i79p.json                    | External service containing list of companies in NY definitions                                                                                                                |
| LOCAL_REGISTRY_TO_USE            | y        | GB                                                             | Defines which registry to use to look up info about the local instance                                                                                                         |

### SMTP transport configuration

If using the `SMTP_EMAIL` value for `EMAIL_TRANSPORT` the following additional configuration applies

| variable name | required | default | description                                                                                                                                               |
| ------------- | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SMTP_HOST     | y        |         | Specifies the hostname of the SMTP server                                                                                                                 |
| SMTP_PORT     | y        |         | Defines the port number on which the SMTP server is listening                                                                                             |
| SMTP_SECURE   | n        | true    | A boolean indicating whether the connection to the SMTP server should be secure (i.e., use TLS/SSL)                                                       |
| SMTP_USER     | y        |         | Specifies the username for authenticating with the SMTP server, default is empty string. No authentication is required for local development environments |
| SMTP_PASS     | y        |         | Specifies the password for authenticating with the SMTP server, default is empty string. No authentication is required for local development environments |

## Testing

This repository consists of three test types: [**unit**, **integration**, **e2e**], using a combination of `mocha`, `chai`, `sinon` and `playwright` frameworks.

### Unit Testing

Unit tests in this repository are done per service/module or class, and follow the below pattern. In **tests** directories collated with the units they test.

```sh
# example
├── __tests__
│   ├── example.test.ts
│   ├── __tests__
│   │   ├── index.test.ts
├── __tests__
....
```

Unit tests can be executed by running:

```sh
npm run test:unit
```

### Integration Testing

Integration tests are located in [`test/integration`](test/integration/) along with mock services and helpers and a test environment variables in `./test/test.env`.

Integration tests can be run locally using Testcontainers (it is recommended to add debugging so you can follow the logs in the console, refer to [testcontainers section](#testcontainers))

```sh
npm run test:integration
```

### e2e Testing

End-to-end tests are located in [`test/e2e`](test/e2e/). They run by default in a Testcontainers environment.

Install dependencies for playwright with:

```sh
npx playwright install
```

Then run:

```sh
npm run test:e2e
```

This will run the tests without the ui. It is recommended to add debugging so you can follow the logs in the console, refer to [testcontainers section](#testcontainers).

Alternatively you can run:

```sh
npm run test:playwright
```

A browser window will pop up where you can run tests and follow their progress.

Then you'll find the test results in directory `playwright-report` at root level.

### Testcontainers

See logs from a container e.g. if it is dying on startup add:

```
.withLogConsumer((stream) => {
    stream.on('data', (line) => console.log(line))
    stream.on('err', (line) => console.error(line))
    stream.on('end', () => console.log('Stream closed'))
})
```

and run with

```
DEBUG=testcontainers* npm run test:integration
```

or

```
DEBUG=testcontainers* npm run test:e2e
```

Normally the containers are removed after a run, however you can keep them for further inspection by adding this:

```
await container.stop({ remove: false })
```

## Database

`veritable-ui` and cloudagent are each dependent on their own instances of PostgreSQL. `knex` wrapper is used for database queries. To ensure database integrity, **zod** is used to validate types of inserted and returned data at runtime. Configured in [`src/models/db/types.ts`](src/models/db/types.ts).

Main `knex` configuration file is [`knexfile.js`](knexfile.js), other files such as migrations can be found in [`src/models/db`](src/models/db).

> For migrations, do not update an existing file, always create a new one using `knex`. New migrations will appear in `src/models/db/migrations/` directory.

```sh
# creating a new migration
npm run db:cmd -- migrate:make migration_name -x ts

# running migrations
npm run db:migrate
```

## Establishing connection

- Bring up as per [getting started](#getting-started) (docker compose, run migrations and init, then `npm run dev`) to start Alice's UI.
- Alice: http://localhost:3000.
- Bob: http://localhost:3001.
- Go to Bob's [Invite New Connection](http://localhost:3001/connection/new) and enter `07964699` (default Company House Number for Alice) for the `Company House Number`. Enter any valid email and submit. The list of Bob's connections now contains a new connection with `Invite Sent` state.
- Go to the dev [email server](http://localhost:5001/) and copy the invitation text from bottom of the email sent to the email address entered in the previous step.
- Paste the invitation text into Alice's [Add from Invitation](http://localhost:3000/connection/new?fromInvite=true). The right hand box should update to show Bob's registered address (set by the `INVITATION_FROM_COMPANY_NUMBER` env). Submit.
- Search `Verification Code: ` in the logs of the terminal for the running Alice server. Copy this code. Select `Complete Verification` on [Bob's side](http://localhost:3001/connection) of the connection, paste the code and continue.
- The connection will now show as `Connected` for both personas, and queries can be sent.

## Registries

We currently support:
Company House: which requires an API KEY. (`COMPANY_PROFILE_API_KEY`)
[Socrata](https://dev.socrata.com/foundry/data.ny.gov/p66s-i79p): which does not require an API KEY. (Requests are rate-limited without an api-key)

- if you want e.g. Charlie to pose as a company registered with Socrata - set `LOCAL_REGISTRY_TO_USE` to `US` and `INVITATION_FROM_COMPANY_NUMBER` to `3211809` (company number we use to test Socrata functionality).
