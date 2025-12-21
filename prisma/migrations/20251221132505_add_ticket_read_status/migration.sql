-- CreateTable
CREATE TABLE "ticket_read_statuses" (
    "id" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ticket_read_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ticket_read_statuses_ticketId_userId_key" ON "ticket_read_statuses"("ticketId", "userId");

-- AddForeignKey
ALTER TABLE "ticket_read_statuses" ADD CONSTRAINT "ticket_read_statuses_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_read_statuses" ADD CONSTRAINT "ticket_read_statuses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
