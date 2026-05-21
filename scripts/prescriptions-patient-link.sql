-- Run once in Supabase SQL Editor to link prescriptions to patient login accounts
-- Makes patient dashboard prescription queries reliable

ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS patient_user_id UUID REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_user_id
  ON prescriptions (patient_user_id);

-- Backfill from patients table
UPDATE prescriptions rx
SET patient_user_id = p.user_id
FROM patients p
WHERE rx.patient_id = p.id
  AND rx.patient_user_id IS NULL;
