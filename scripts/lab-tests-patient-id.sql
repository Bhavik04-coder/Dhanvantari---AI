-- Run in Supabase SQL Editor to fix lab_tests patient FK (UUID, not integer)
-- Resolves: invalid input syntax for type integer: "<uuid>"

-- Add users.id link for queries when patient_id column was integer
ALTER TABLE lab_tests
  ADD COLUMN IF NOT EXISTS patient_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Change patient_id to UUID to match patients(id)
ALTER TABLE lab_tests
  ALTER COLUMN patient_id DROP NOT NULL;

-- If patient_id is integer, convert via patients table (run only if column is integer)
-- ALTER TABLE lab_tests ALTER COLUMN patient_id TYPE UUID USING NULL;

-- Recommended: set patient_id as UUID FK (new installs / after clearing bad rows)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lab_tests'
      AND column_name = 'patient_id'
      AND data_type = 'integer'
  ) THEN
    ALTER TABLE lab_tests ALTER COLUMN patient_id TYPE UUID USING NULL;
  END IF;
END $$;

ALTER TABLE lab_tests
  DROP CONSTRAINT IF EXISTS lab_tests_patient_id_fkey;

ALTER TABLE lab_tests
  ADD CONSTRAINT lab_tests_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lab_tests_patient_user_id ON lab_tests (patient_user_id);
CREATE INDEX IF NOT EXISTS idx_lab_tests_patient_id ON lab_tests (patient_id);

-- Backfill patient_user_id from patients
UPDATE lab_tests lt
SET patient_user_id = p.user_id
FROM patients p
WHERE lt.patient_id = p.id
  AND lt.patient_user_id IS NULL;
