-- Drop existing RESTRICT foreign keys and re-add with CASCADE

-- players.gameId → games.id
ALTER TABLE "players" DROP CONSTRAINT "players_gameId_fkey";
ALTER TABLE "players" ADD CONSTRAINT "players_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- game_categories.gameId → games.id
ALTER TABLE "game_categories" DROP CONSTRAINT "game_categories_gameId_fkey";
ALTER TABLE "game_categories" ADD CONSTRAINT "game_categories_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- rounds.gameId → games.id
ALTER TABLE "rounds" DROP CONSTRAINT "rounds_gameId_fkey";
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- player_answers.roundId → rounds.id
ALTER TABLE "player_answers" DROP CONSTRAINT "player_answers_roundId_fkey";
ALTER TABLE "player_answers" ADD CONSTRAINT "player_answers_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- answers.playerAnswersId → player_answers.id
ALTER TABLE "answers" DROP CONSTRAINT "answers_playerAnswersId_fkey";
ALTER TABLE "answers" ADD CONSTRAINT "answers_playerAnswersId_fkey" FOREIGN KEY ("playerAnswersId") REFERENCES "player_answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- answer_verifications.verificationId → verifications.id
ALTER TABLE "answer_verifications" DROP CONSTRAINT "answer_verifications_verificationId_fkey";
ALTER TABLE "answer_verifications" ADD CONSTRAINT "answer_verifications_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "verifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- votes.answerVerificationId → answer_verifications.id
ALTER TABLE "votes" DROP CONSTRAINT "votes_answerVerificationId_fkey";
ALTER TABLE "votes" ADD CONSTRAINT "votes_answerVerificationId_fkey" FOREIGN KEY ("answerVerificationId") REFERENCES "answer_verifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
