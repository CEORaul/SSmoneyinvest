-- CreateIndex
CREATE UNIQUE INDEX "dividend_payments_companyId_exDate_type_key" ON "dividend_payments"("companyId", "exDate", "type");

