-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('lobby', 'active', 'finished', 'cancelled');

-- CreateEnum
CREATE TYPE "AlphabetPreset" AS ENUM ('PL_WITH_DIACRITICS', 'PL_WITHOUT_DIACRITICS', 'EN');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('answering', 'closing', 'verification', 'finished');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'in_progress', 'finished');

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'lobby',
    "hostId" TEXT NOT NULL,
    "alphabetPreset" "AlphabetPreset" NOT NULL,
    "roundCount" INTEGER NOT NULL,
    "currentRoundNumber" INTEGER NOT NULL DEFAULT 0,
    "usedLetters" TEXT[],
    "uniqueOnlyPoints" INTEGER NOT NULL,
    "uniquePoints" INTEGER NOT NULL,
    "duplicatePoints" INTEGER NOT NULL,
    "closingTimeSeconds" INTEGER NOT NULL,
    "verificationTimeoutSeconds" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT,
    "nick" TEXT NOT NULL,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "socketId" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_categories" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "game_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nick" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rounds" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "letter" CHAR(1) NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'answering',
    "closingDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_answers" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answers" (
    "id" TEXT NOT NULL,
    "playerAnswersId" TEXT NOT NULL,
    "gameCategoryId" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "cursorPlayerId" TEXT,
    "cursorCategoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_verifications" (
    "id" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "gameCategoryId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "aiScore" INTEGER,
    "aiReasoning" TEXT,
    "isAccepted" BOOLEAN,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "answer_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" TEXT NOT NULL,
    "answerVerificationId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "games_code_key" ON "games"("code");

-- CreateIndex
CREATE UNIQUE INDEX "players_gameId_nick_key" ON "players"("gameId", "nick");

-- CreateIndex
CREATE UNIQUE INDEX "game_categories_gameId_categoryId_key" ON "game_categories"("gameId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_nick_key" ON "users"("nick");

-- CreateIndex
CREATE UNIQUE INDEX "rounds_gameId_roundNumber_key" ON "rounds"("gameId", "roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "player_answers_roundId_playerId_key" ON "player_answers"("roundId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "answers_playerAnswersId_gameCategoryId_key" ON "answers"("playerAnswersId", "gameCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "verifications_roundId_key" ON "verifications"("roundId");

-- CreateIndex
CREATE UNIQUE INDEX "answer_verifications_verificationId_playerId_gameCategoryId_key" ON "answer_verifications"("verificationId", "playerId", "gameCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "votes_answerVerificationId_voterId_key" ON "votes"("answerVerificationId", "voterId");

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_categories" ADD CONSTRAINT "game_categories_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_categories" ADD CONSTRAINT "game_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_answers" ADD CONSTRAINT "player_answers_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_answers" ADD CONSTRAINT "player_answers_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_playerAnswersId_fkey" FOREIGN KEY ("playerAnswersId") REFERENCES "player_answers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_verifications" ADD CONSTRAINT "answer_verifications_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "verifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_verifications" ADD CONSTRAINT "answer_verifications_gameCategoryId_fkey" FOREIGN KEY ("gameCategoryId") REFERENCES "game_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_answerVerificationId_fkey" FOREIGN KEY ("answerVerificationId") REFERENCES "answer_verifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
