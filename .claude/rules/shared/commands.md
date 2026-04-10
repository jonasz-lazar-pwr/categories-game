# rules/shared/commands.md

> All commands run from project root via Make. Assumes Docker and Make are installed.

---

## 1. Local

```bash
make install            # install dependencies in backend and frontend
make format             # format code with Prettier
make lint               # lint code with ESLint
make test               # run unit tests in backend and frontend
make check              # format + lint + type-check + test
```

## 2. Docker — dev

```bash
make dev                  # start dev containers
make dev-down             # stop and remove dev containers
make dev-rebuild          # rebuild and restart dev containers
make dev-logs             # stream logs from all dev containers
make dev-shell-backend    # open shell in backend container
make dev-shell-frontend   # open shell in frontend container
make dev-shell-db         # open psql in postgres container
```

## 3. Docker — prod

```bash
make prod             # start prod containers
make prod-down        # stop and remove prod containers
make prod-rebuild     # rebuild and restart prod containers
make prod-logs        # stream logs from all prod containers
```

## 4. Database

```bash
make generate         # generate Prisma Client from schema
make migrate          # create and apply new migration (interactive, dev only)
make db-studio        # open Prisma Studio in browser
make db-reset         # reset dev database — deletes all data
```

## 5. Clean

```bash
make clean                # remove build artifacts and coverage
make clean-docker         # remove project Docker images
make clean-docker-volumes # remove Docker volumes including database (destructive)
```

## 6. First-time Setup

```bash
cp infra/.env.example infra/.env   # create env file and fill in values
make install                        # install dependencies
make dev                            # start containers
make generate                       # generate Prisma Client from schema
make migrate                        # create and apply initial migration
```

> `backend/generated/` is not committed to the repository. Regenerate it with
> `make generate` after cloning the repo or after changing the Prisma schema.
>
> Migrations are never applied automatically — always run `make migrate` manually after
> changing the Prisma schema.
