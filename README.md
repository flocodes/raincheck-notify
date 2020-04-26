# Raincheck

The app that tells you about the weather when you need it.
Get personalized weather notifications for your recurring trips.

Raincheck is a three-part project:

* [raincheck-db](https://github.com/flocodes/raincheck-db): SQL database for trips with a GraphQL interface, built with [graphql-yoga](https://github.com/prisma-labs/graphql-yoga), [Prisma](https://www.prisma.io/), the [HERE Geocoding API](https://developer.here.com/products/geocoding-and-search) and [Docker](https://www.docker.com/)
* [raincheck-notify](https://github.com/flocodes/raincheck-notify): Weather notification service with direct SQL access to the database, built with [Sendgrid](https://sendgrid.com/) and the [DarkSky forecast API](https://darksky.net/dev/docs)
* [raincheck-web](https://github.com/flocodes/raincheck-web): Single-page web app for managing trips, built with [React](https://reactjs.org/), [Apollo Client](https://www.apollographql.com/docs/react/) and [Material-UI](https://material-ui.com/)

All three project parts use [Typescript](https://www.typescriptlang.org/).

## raincheck-notify

### Project setup

1. Run `yarn install` in the directory you cloned this repository.

2. Set up all required environment variables in a `.env` file. The required variables are listed in `.env.example`.
You need a [SendGrid Email API key](https://sendgrid.com/solutions/email-api/) and a DarkSky API secret.
The MySQL setup (host, port, user, ...) depends on your setup of `raincheck-db`.

`raincheck-notify` is set up to be deployed as a Docker image on the same server as `raincheck-db`.
If you choose a different deployment strategy, you have to change the `docker-compose` setup of `raincheck-db` in a way that allows a connection between `raincheck-web` and the MySQL image.
You can do that by exposing the relevant port (should be 3306).

Docker is not required for development.

### Running raincheck-notify

`raincheck-db` must be running before starting `raincheck-notify`.

* To run the Typescript development version, run `yarn run start-dev`
* To build to Javascript and run the result, first run `yarn run build`, then `yarn run start`
* To build the Docker image, run `yarn run docker-build`
* To start the Docker image using `docker-compose`, run `yarn run docker-up`

### Deployment with GitHub Actions

The configured GitHub Action in `./.github/workflows/main.yml` will run ESLint, build the Docker image and push it to DockerHub.
You need to configure this action to work with your Docker account.
Additionally, you need to set your Docker password/token as a secret in your GitHub repository of `raincheck-notify`.

### Linting

To run ESLint, run `yarn run lint`.
