# Categories Game — Business Specification

---

## 1. Users and Roles

### Guest (not logged in)

- Can join a game using a code + choose a nickname visible to other players
- Cannot create games or be a host
- Can see the final results screen after the game ends
- Has no access to game history or statistics

### Logged-in Player

- Everything a guest can do, plus:
- Can create games and be a host
- Has access to a dashboard: game history, results, statistics
- Can manage their profile and account settings

### Host (logged-in player who created the game)

- Configures the game before it starts
- Manages the game during play (admin panel)
- During the game participates like any other player — no special privileges during verification
- Disconnecting does not block the game — configuration is set before start and does not require host presence

---

## 2. Creating, Joining and Lobby

- The start screen offers two paths: **Create Game** and **Join Game**
- Joining: game code + nickname
- Creating: available only to logged-in users — redirects to configuration
- Maximum **20 players** per game

### Lobby

- Players join using a code + nickname
- Nickname must be unique within the game — regardless of whether the player is logged in or a guest
- Players can only join before the game starts — joining after start is not possible
- Host sees the player list and can kick any player before start
- Host clicks **Start** when everyone is ready — no confirmation required from players
- If the host leaves the lobby before start — the game is **cancelled** (status: `cancelled`) and all players are removed

---

## 3. Game Configuration (host before start)

| Setting            | Description                                                              |
| ------------------ | ------------------------------------------------------------------------ |
| Number of rounds   | Set before start, cannot be changed during the game                      |
| Alphabet           | Several presets: PL (with diacritics), PL (without diacritics), EN, etc. |
| Categories         | Choose from default pool + host can add custom ones                      |
| Scoring            | Configurable by host (e.g. 15 / 10 / 5 pts)                              |
| Closing time       | Time remaining players get after the first player finishes (e.g. 15s)    |
| Verification timer | Time limit per answer during the verification phase                      |

---

## 4. Categories

- A global pool of default categories exists (e.g. Country, City, River, Plant, etc.)
- Host can add custom, non-predefined categories
- **Every category has a description** — helps players understand it and provides AI context for verification

---

## 5. Letters

- Alphabet preset chosen by host in configuration
- Letter is drawn automatically at the start of each round
- **Letters do not repeat within a single game**

---

## 6. Round Flow

### Between Rounds

- After Scoring completes, all players see the **current standings**
- Host manually starts each new round
- After the final round, the standings screen becomes the final results screen

### Answer Phase

1. Letter is drawn — all players see it simultaneously
2. Players fill in answers for each category
3. Player can freely switch between categories until they submit
4. A counter shows how many players have already finished
5. First player finishes → countdown starts (e.g. 15s) for the remaining players
6. When time runs out the round closes — no one can edit answers anymore

### Verification Phase

1. All players see the **same screen synchronously** — player by player, answer by answer
2. For each answer AI displays:
   - A percentage score (e.g. 87%)
   - A short reasoning (e.g. "typo, but the word exists")
   - Detects duplicates despite typos, different spellings, or language variants
3. Each player votes on **other players' answers** — never their own
4. Players can discuss before voting
5. Move to the next answer happens **automatically** — all players voted OR the timer expired

### Verification Result

- Final result = weighted sum of player votes + AI vote (AI counts as one player)
- Acceptance threshold: **≥ 50%** — ties pass

### Scoring Phase

- Points awarded according to host configuration, e.g.:
  - **15 pts** — only player who wrote that answer
  - **10 pts** — unique answer (no one else wrote the same)
  - **5 pts** — answer shared by multiple players
- AI detects whether two seemingly different answers are the same word (typos, language, inflection)
- Answers rejected in verification = 0 pts

---

## 7. Disconnections and Sessions

- A player who loses connection rejoins the current game state
- Rounds missed during absence = empty answers, no backfilling allowed
- **One session per player** — a second connection (e.g. from another device) takes over the session, the first is disconnected
- Game code is one-time — it expires when the game finishes

---

## 8. End of Game

- After the final round all players — logged in and guests — see the final results screen
- Results include a player ranking with scores

---

## 9. History and Statistics (logged-in users only)

- Dashboard with a list of played games
- Detailed view of each game: answers, results, verifications
- Player statistics (to be defined in the future)

---

## 10. Open Questions (to be resolved in the future)

- Exact algorithm for weighting player votes vs. AI
- Detailed statistics on the dashboard
