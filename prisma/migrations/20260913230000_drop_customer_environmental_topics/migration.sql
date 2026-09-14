-- The customer <-> ESG metric link is now owned by `customer_esg_metrics`
-- (see feat/link-esg-metrics-to-customer / PR #41). This table was a
-- redundant, independently-built implementation of the same relationship
-- and is being dropped in favor of that one.
-- DropForeignKey
ALTER TABLE "customer_environmental_topics" DROP CONSTRAINT IF EXISTS "customer_environmental_topics_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "customer_environmental_topics" DROP CONSTRAINT IF EXISTS "customer_environmental_topics_esg_metric_id_fkey";

-- DropTable
DROP TABLE IF EXISTS "customer_environmental_topics";
