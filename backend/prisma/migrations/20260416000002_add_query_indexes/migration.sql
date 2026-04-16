-- CreateIndex
CREATE INDEX "rounds_gameId_status_idx" ON "rounds"("gameId", "status");

-- CreateIndex
CREATE INDEX "verifications_roundId_idx" ON "verifications"("roundId");

-- CreateIndex
CREATE INDEX "verifications_gameId_idx" ON "verifications"("gameId");
