-- Split into its own migration file: ALTER TYPE ... ADD VALUE cannot run in
-- the same transaction as other DDL that might use the new value.
ALTER TYPE "AiContentKind" ADD VALUE 'RADAR_SUMMARY';
