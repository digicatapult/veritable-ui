# veritable-ui

A user interface for `Veritable` that allows to manage connections across supply chain and perform queries in relation to the supply chain. Utilizing [TSOA](https://tsoa-community.github.io/docs/getting-started.html), [HTMX](https://htmx.org/) and [@kitajs/html](https://www.npmjs.com/package/@kitajs/html) for JSX templates.

#### Table of Contents

- [Setup](#setup)
- [Getting Started](#getting-started)
- [Development Mode/Local dev](#development-mode)
- [Environment Variables](#environment-variables)
- [Testing](#testing)

## Setup
veritable-ui depends on a few external services:
- [veritable-cloudagent](https://github.com/digicatapult/veritable-cloudagent) - APIs for managing connections, credentials and messages.
- `keycloak` - runs as a docker image for each node that handles authentication and users.
- `docker` - for orchestrating multiple nodes and running other dependencies such as database (PostgreSQL) along with node specific environment variables

### Prerequisites
> :warning: last updated: 01/08/2024
- docker v27.0.3+
- npm 10.0.0+
- node 22.0.0+
- keycloak:25.0.2+ - included in the docker-compose.yml
- veritable-cloudagent@latest - last used -> v0.9.42

## Getting started
Ensure you're running the correct version of npm, then install dependencies using:
```sh
npm install
```

After all packages have been installed run the below command which will create two files under `/src` directory: `src/routes.ts`, `src/swagger.json`
```sh
npm run tsoa:build
```

Once TSOA build has completed, then run a typescript compiler
```sh
npm run build
```

> :memo: Note that this is just the service on itself without other dependencies like keycloak or database, for local development please refer to the section below

## Development mode
Before reading this please make sure that you have executed all the tasks from **Getting Started** section (installation and build), should have a directory `/build` and make sure there is at a minimum an empty `.env` at the root of project containing the below:
```sh
COMPANY_PROFILE_API_KEY=apikey
```

After creating `.env` file you can execute `docker` which will bring all the nodes and required services for local development
```sh
docker compose up -d
```
> :memo: If doing this for the first it might take some time to pull all the images

Followed by the database migrations
```sh
npm run db:migrate
```

> :memo: Optional: you can seed some mock data for rendering some items in tables and etc. run: `npm run db:seed`

Also, we need to create some credential definitions along with `veritable-cloudagent` instance
```sh
npm run dev:init
```

Finally, start the service and enjoy local development
```sh
npm run dev
```

> :bulb: When service is running, it can be accessed on `http://localhost:3000/`. Api Docs are available on `http://localhost:3000/api-docs` and swagger `http://localhost:3000/swagger/`.


## Environment variables
This is the list of all environment variables including brief description

| variable name                  | required | default                                                        | description                                                                                      |
|--------------------------------|----------|----------------------------------------------------------------|--------------------------------------------------------------------------------------------------|
| PORT                           | y        | 3000                                                           | Port number of the service                                                                       |
| LOG_LEVEL                      | n        | info                                                           | Logging level. Valid values are [ trace ,   debug ,   info ,   warn ,   error ,   fatal ]        |
| DB_HOST                        | y        | localhost                                                      | The database hostname / host                                                                     |
| DB_NAME                        | y        | veritable-ui                                                   | The port for the database                                                                        |
| DB_USERNAME                    | y        | postgres                                                       | The database username                                                                            |
| DB_PASSWORD                    | y        | postgres                                                       | The database password                                                                            |
| DB_PORT                        | y        | 5432                                                           | The database port number                                                                         |
| COOKIE_SESSION_KEYS            | y        | ['secret']                                                     | Session cookies                                                                                  |
| PUBLIC_URL                     | y        | http://localhost:3000                                          | URL that UI can be accessed                                                                      |
| API_SWAGGER_BG_COLOR           | n        | #fafafa                                                        | Swagger background color                                                                         |
| API_SWAGGER_TITLE              | n        | Veritable                                                      | Title for swagger interface                                                                      |
| API_SWAGGER_HEADING            | n        | Veritable                                                      | Heading for swagger interface                                                                    |
| IDP_CLIENT_ID                  | y        | veritable-ui                                                   | Client ID required for Keycloak                                                                  |
| IDP_PUBLIC_URL_PREFIX          | y        | http://localhost:3080/realms/veritable/protocol/openid-connect | Public authentication URL                                                                        |
| IDP_INTERNAL_URL_PREFIX        | y        | http://localhost:3080/realms/veritable/protocol/openid-connect | Internal authentication URL                                                                      |
| IDP_AUTH_PATH                  | y        | /auth                                                          | Auth path for keycloak                                                                           |
| IDP_TOKEN_PATH                 | y        | /token                                                         | Tokens path for keycloak                                                                         |
| IDP_JWKS_PATH                  | y        | /certs                                                         | Certificates path for keycloak                                                                   |
| COMPANY_HOUSE_API_URL          | y        | https://api.company-information.service.gov.uk                 | An external service that contain list of all UK companies, look ups                              |
| COMPANY_PROFILE_API_KEY        | y        |  -                                                             | An API KEY required to access the company-information service                                    |
| EMAIL_TRANSPORT                | y        | STREAM                                                         | Nodemailer transport for sending emails                                                          |
| EMAIL_FROM_ADDRESS             | y        | hello@veritable.com                                            | Email address that will appear "send from" in an automated emails                                |
| EMAIL_ADMIN_ADDRESS            | y        | admin@veritable.com                                            | Admin's email address that will receive a copy of all comms                                      |
| CLOUDAGENT_ADMIN_ORIGIN        | y        | http://localhost:3100                                          | veritabler-cloudagent url                                                                        |
| CLOUDAGENT_ADMIN_WS_ORIGIN     | y        | ws://localhost:3100                                            | veritable-cloudagent web socker address/url                                                      |
| INVITATION_PIN_SECRET          | y        | Buffer.from('secret', 'utf8')                                  | an encoded array of utf-8 format                                                                 |
| INVITATION_PIN_ATTEMPT_LIMIT   | y        | 5                                                              | number of allowed pin validation attempts                                                        |
| INVITATION_FROM_COMPANY_NUMBER | n        | 07964699                                                       | default company number, currently is us                                                          |
| ISSUANCE_DID_POLICY            | y        | EXISTING_OR_NEW                                                | DID and either create or use existing: [CREATE_NEW, FIND_EXIStING, EXISTING_OR_NEW, did:somedid] |
| ISSUANCE_SCHEMA_POLICY         | y        | EXISTING_OR_NEW                                                | Same as above but for credential schema                                                          |
| ISSUANCE_CRED_DEF_POLICY       | y        | EXISTING_OR_NEW                                                | Same as above but this is for credential definitions                                             |

## Testing
Currently this repository consist of two test types: [**integration**, **unit**] and we are using a combination of `mocha`, `chai` and `sinon` frameworks

### Unit Testing
Unit tests in this repository are done per service/module or class, and follow the bellow pattern. In __tests__ directories collated with the units they test.

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
Integration tests are placed at the root level of a repository and can be found at the root level `test/` folder along with mock services and helpers and a test environment variables that will be in `test/test.env`.


Integration tests can be run locally by executing the below command
```sh
npm run test:integration
```

### E2E/UI Testing
> :This is something that currently is not implemented but it's already on a roadmap so leaving this section for later and if nothing changes we will be using cypress

## Database
This service is dependant on postgreSQL which will sync up across all nodes and will update cloudagent when needed. We use `knex` wrapper for wrapping [create, read, write, update] database quries. We also have different models for inserting and returning data which gives us a control of sensitive data or data we do not want to get along the record. We also use **zod** for enchanted validation. It's currently used in `src/models/db/types.ts` file.

Main configuration file can be found in at the root level of a repo `knexfile.js` other files such as migrations can be found in `src/models/db` directory. 

> Migrations, do not update an existing file, please create a new one using knex. New migrations will appear in `src/models/db/migrations/` directory.

```sh
# creating a new migration
knex migrate:make migration_name -x ts

# running migrations
npm run db:migrate
```

> Seeds, currently seeds are at the root level of a repository `seeds/`.
```sh
npm run db:seed
```

## Service Specifics
We do have a `init.ts` file that sets up veritable-cloudagent and credential definition along with schema. Covered in `Development Mode`
Note: If you have changed what will be rendered in different components, it is likely you will have to update snapshots for tests to pass. Refer to `chai-jest-snapshot` documentation to do that.

## Establishing connection

Bring up as per above (docker compose, run migrations and seed, then npm run dev).
You can find Bob's UI on `localhost:3001` and Alice's on `localhost:3000`.
On Bob's UI go to `Connections > Invite New Connection` and enter a valid Company House Number (for testing purposes we have been using Digital Catapult's). Enter an email and submit your invite. Then in the list of Bob's connections you should see a new connection in 'Pending' state. Then go to Docker -> container called `Bob` in it's logs you will find a generated invite and also a pin code.
You will enter the invitation and pin into Alice's UI in `Connections > Add From Invitation`.
NOTE: you will need to format the Invitation Text. You need to remove any datetime stamps from the logs, remove spaces and equal signs and make sure that there are no leading ot trailing spaces when pasted to the form.

