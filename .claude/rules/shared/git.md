# rules/shared/git.md

> Applies to the entire repository. All commit messages and branch names in English.

---

## 1. Branch Naming

```
feature/<description>     # new feature
fix/<description>         # bug fix
refactor/<description>    # refactoring
chore/<description>       # maintenance, config, setup
```

## 2. Commit Format

```
<type>(<scope>): <short summary>
```

**Max 72 characters in the header.**

### Types

| Type       | Purpose                                    |
| ---------- | ------------------------------------------ |
| `feat`     | New feature or functionality               |
| `fix`      | Bug fix                                    |
| `refactor` | Restructure without behavior change        |
| `docs`     | Documentation updates                      |
| `test`     | Add or modify tests                        |
| `chore`    | Maintenance, configuration, setup          |
| `remove`   | Delete unused code, files, or dependencies |

### Scopes

| Scope      | When to use                          |
| ---------- | ------------------------------------ |
| `backend`  | Node.js backend code                 |
| `frontend` | Vue frontend code                    |
| `db`       | Prisma schema, migrations, seeds     |
| `config`   | Docker, Makefile, env files, tooling |
| `shared`   | Shared types, constants              |
| `docs`     | Documentation files                  |

## 3. Commit Body

Optional. Use when the header alone does not fully explain the change — describe what was changed and why, not how.

```
feat(backend): add round timer expiry handler

- added Socket.io event emission on timer end
- service delegates to RoundAggregate.end() — no logic in handler
```

## 4. Examples

```
feat(frontend): add lobby join form with nick validation
fix(backend): correct round status after all players submit
refactor(db): rename game_code column to code
chore(config): update Node.js base image to 22-alpine
test(backend): add unit tests for ScoringService
remove(frontend): delete unused CounterStore
docs(shared): update git conventions
```

## 5. Rules

- One logical change per commit — never bundle unrelated changes
- Never commit directly to `main` — always through a branch
- Never commit `.env` files — only `.env.example`
- Squash WIP commits before merging
