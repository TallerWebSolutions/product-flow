-- Step 1: Make sure all status tables are created (if migration 06 wasn't run)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'statuses') THEN
    -- Create statuses table if it doesn't exist yet
    CREATE TABLE statuses (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      color VARCHAR(50),
      "order" INTEGER NOT NULL DEFAULT 0,
      transition_id UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

    -- Create transitions table if it doesn't exist yet
    CREATE TABLE transitions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255),
      from_status_id UUID NOT NULL REFERENCES statuses(id) ON DELETE CASCADE,
      to_status_id UUID NOT NULL REFERENCES statuses(id) ON DELETE CASCADE,
      user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

    -- Add foreign key constraint to statuses.transition_id
    ALTER TABLE statuses
    ADD CONSTRAINT fk_status_transition
    FOREIGN KEY (transition_id) REFERENCES transitions(id) ON DELETE SET NULL;

    -- Create status_columns table to map statuses to columns
    CREATE TABLE status_columns (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      status_id UUID NOT NULL REFERENCES statuses(id) ON DELETE CASCADE,
      column_id UUID NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      UNIQUE(status_id, column_id)
    );
  END IF;
END $$;

-- Step 2: Create default statuses if none exist
DO $$
DECLARE
  status_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO status_count FROM statuses;
  
  IF status_count = 0 THEN
    -- Insert default statuses
    INSERT INTO statuses (name, color, "order") VALUES
      ('To Do', '#e5e7eb', 1),
      ('In Progress', '#fde68a', 2),
      ('Review', '#bfdbfe', 3),
      ('Done', '#bbf7d0', 4);
  END IF;
END $$;

-- Step 3: Create temporary mapping from columns to statuses based on column name
CREATE TEMPORARY TABLE temp_column_status_mapping AS
SELECT 
  c.id AS column_id,
  (
    SELECT s.id FROM statuses s 
    WHERE 
      (LOWER(c.name) LIKE '%to do%' AND LOWER(s.name) LIKE '%to do%') OR
      (LOWER(c.name) LIKE '%backlog%' AND LOWER(s.name) LIKE '%to do%') OR
      (LOWER(c.name) LIKE '%progress%' AND LOWER(s.name) LIKE '%progress%') OR
      (LOWER(c.name) LIKE '%review%' AND LOWER(s.name) LIKE '%review%') OR
      (LOWER(c.name) LIKE '%done%' AND LOWER(s.name) LIKE '%done%') OR
      (LOWER(c.name) LIKE '%complete%' AND LOWER(s.name) LIKE '%done%')
    ORDER BY 
      CASE 
        WHEN LOWER(c.name) = LOWER(s.name) THEN 0
        ELSE 1
      END
    LIMIT 1
  ) AS status_id
FROM columns c;

-- Set a default status for any column without a match
UPDATE temp_column_status_mapping
SET status_id = (SELECT id FROM statuses ORDER BY "order" LIMIT 1)
WHERE status_id IS NULL;

-- Step 4: Create status_columns mappings
INSERT INTO status_columns (status_id, column_id)
SELECT DISTINCT status_id, column_id FROM temp_column_status_mapping
ON CONFLICT (status_id, column_id) DO NOTHING;

-- Step 5: Update cards to have a status_id based on their column_id
UPDATE cards
SET status_id = (
  SELECT m.status_id 
  FROM temp_column_status_mapping m 
  WHERE m.column_id = cards.column_id
)
WHERE status_id IS NULL;

-- Step 6: Make status_id NOT NULL
ALTER TABLE cards ALTER COLUMN status_id SET NOT NULL;

-- Step 7: Add index for status-based queries
DROP INDEX IF EXISTS idx_cards_column_order;
CREATE INDEX IF NOT EXISTS idx_cards_status_order ON cards(status_id, "order");

-- Step 8: Keep column_id for now as a reference, but it's no longer required
-- Production migration would remove column_id after data verification
-- ALTER TABLE cards DROP COLUMN column_id; 