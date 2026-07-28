-- FinIA: saved chat threads + their messages. See schema.prisma's doc
-- comments on Conversation/ConversationMessage for the "why" behind
-- sources/suggestions being plain string arrays rather than foreign keys.
CREATE TYPE "ConversationRole" AS ENUM ('USER', 'ASSISTANT');

CREATE TABLE "finia_conversations" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finia_conversations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "finia_conversations_profileId_updatedAt_idx" ON "finia_conversations" ("profileId", "updatedAt");

ALTER TABLE "finia_conversations" ADD CONSTRAINT "finia_conversations_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "finia_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "ConversationRole" NOT NULL,
    "content" TEXT NOT NULL,
    "sources" TEXT[],
    "suggestions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finia_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "finia_messages_conversationId_createdAt_idx" ON "finia_messages" ("conversationId", "createdAt");

ALTER TABLE "finia_messages" ADD CONSTRAINT "finia_messages_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "finia_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
