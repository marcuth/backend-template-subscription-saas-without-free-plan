/*
  Warnings:

  - You are about to drop the column `stripe_price_id` on the `plans` table. All the data in the column will be lost.
  - You are about to drop the column `stripe_product_id` on the `plans` table. All the data in the column will be lost.
  - You are about to drop the column `stripe_subscription_id` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `stripe_subscription_item_id` on the `subscriptions` table. All the data in the column will be lost.
  - Added the required column `external_price_id` to the `plans` table without a default value. This is not possible if the table is not empty.
  - Added the required column `external_product_id` to the `plans` table without a default value. This is not possible if the table is not empty.
  - Added the required column `external_id` to the `subscriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `item_id` to the `subscriptions` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "currency_code" TEXT NOT NULL DEFAULT 'BRL',
    "external_product_id" TEXT NOT NULL,
    "external_price_id" TEXT NOT NULL,
    "features" JSONB NOT NULL
);
INSERT INTO "new_plans" ("created_at", "currency_code", "description", "features", "id", "name", "price", "slug", "updated_at") SELECT "created_at", "currency_code", "description", "features", "id", "name", "price", "slug", "updated_at" FROM "plans";
DROP TABLE "plans";
ALTER TABLE "new_plans" RENAME TO "plans";
CREATE UNIQUE INDEX "plans_name_key" ON "plans"("name");
CREATE UNIQUE INDEX "plans_slug_key" ON "plans"("slug");
CREATE UNIQUE INDEX "plans_external_product_id_key" ON "plans"("external_product_id");
CREATE UNIQUE INDEX "plans_external_price_id_key" ON "plans"("external_price_id");
CREATE TABLE "new_subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "user_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "current_period_start" DATETIME NOT NULL,
    "current_period_end" DATETIME NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" DATETIME,
    "ended_at" DATETIME,
    CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_subscriptions" ("cancel_at_period_end", "canceled_at", "created_at", "current_period_end", "current_period_start", "ended_at", "id", "status", "updated_at", "user_id") SELECT "cancel_at_period_end", "canceled_at", "created_at", "current_period_end", "current_period_start", "ended_at", "id", "status", "updated_at", "user_id" FROM "subscriptions";
DROP TABLE "subscriptions";
ALTER TABLE "new_subscriptions" RENAME TO "subscriptions";
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");
CREATE UNIQUE INDEX "subscriptions_external_id_key" ON "subscriptions"("external_id");
CREATE UNIQUE INDEX "subscriptions_item_id_key" ON "subscriptions"("item_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
