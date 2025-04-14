-- Create statuses table
CREATE TABLE IF NOT EXISTS statuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  color VARCHAR(50),
  "order" INTEGER NOT NULL DEFAULT 0,
  transition_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create transitions table
CREATE TABLE IF NOT EXISTS transitions (
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
CREATE TABLE IF NOT EXISTS status_columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status_id UUID NOT NULL REFERENCES statuses(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(status_id, column_id)
);

-- Add status_id to cards
ALTER TABLE cards
ADD COLUMN IF NOT EXISTS status_id UUID REFERENCES statuses(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_statuses_transition_id ON statuses(transition_id);
CREATE INDEX IF NOT EXISTS idx_transitions_from_status_id ON transitions(from_status_id);
CREATE INDEX IF NOT EXISTS idx_transitions_to_status_id ON transitions(to_status_id);
CREATE INDEX IF NOT EXISTS idx_transitions_user_id ON transitions(user_id);
CREATE INDEX IF NOT EXISTS idx_status_columns_status_id ON status_columns(status_id);
CREATE INDEX IF NOT EXISTS idx_status_columns_column_id ON status_columns(column_id);
CREATE INDEX IF NOT EXISTS idx_cards_status_id ON cards(status_id);

-- Enable Row Level Security
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_columns ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for statuses based on board and column ownership
CREATE POLICY "statuses_through_columns_select" ON statuses
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM status_columns
      JOIN columns ON status_columns.column_id = columns.id
      JOIN boards ON columns.board_id = boards.id
      WHERE status_columns.status_id = statuses.id AND boards.owner_id = auth.uid()
    )
  );

CREATE POLICY "statuses_through_columns_insert" ON statuses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM status_columns
      JOIN columns ON status_columns.column_id = columns.id
      JOIN boards ON columns.board_id = boards.id
      WHERE status_columns.status_id = statuses.id AND boards.owner_id = auth.uid()
    )
  );

CREATE POLICY "statuses_through_columns_update" ON statuses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM status_columns
      JOIN columns ON status_columns.column_id = columns.id
      JOIN boards ON columns.board_id = boards.id
      WHERE status_columns.status_id = statuses.id AND boards.owner_id = auth.uid()
    )
  );

-- Create similar policies for transitions and status_columns tables
CREATE POLICY "transitions_status_owner_select" ON transitions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM statuses
      JOIN status_columns ON statuses.id = status_columns.status_id
      JOIN columns ON status_columns.column_id = columns.id
      JOIN boards ON columns.board_id = boards.id
      WHERE (transitions.from_status_id = statuses.id OR transitions.to_status_id = statuses.id)
        AND boards.owner_id = auth.uid()
    )
  );

CREATE POLICY "status_columns_board_owner_select" ON status_columns
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM columns
      JOIN boards ON columns.board_id = boards.id
      WHERE status_columns.column_id = columns.id AND boards.owner_id = auth.uid()
    )
  );

CREATE POLICY "status_columns_board_owner_insert" ON status_columns
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM columns
      JOIN boards ON columns.board_id = boards.id
      WHERE status_columns.column_id = columns.id AND boards.owner_id = auth.uid()
    )
  );

-- Triggers for updating updated_at
CREATE TRIGGER update_statuses_updated_at
BEFORE UPDATE ON statuses
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_transitions_updated_at
BEFORE UPDATE ON transitions
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_status_columns_updated_at
BEFORE UPDATE ON status_columns
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column(); 