-- Create cards table
CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  column_id UUID NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add constraints and indexes
CREATE INDEX IF NOT EXISTS idx_cards_column_id ON cards(column_id);
CREATE INDEX IF NOT EXISTS idx_cards_assignee_id ON cards(assignee_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cards_column_order ON cards(column_id, "order");
CREATE INDEX IF NOT EXISTS idx_cards_metadata ON cards USING gin(metadata);

-- Enable Row Level Security
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies based on board ownership
CREATE POLICY "cards_board_owner_select" ON cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM columns
      JOIN boards ON columns.board_id = boards.id
      WHERE columns.id = cards.column_id AND boards.owner_id = auth.uid()
    )
  );

CREATE POLICY "cards_board_owner_insert" ON cards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM columns
      JOIN boards ON columns.board_id = boards.id
      WHERE columns.id = cards.column_id AND boards.owner_id = auth.uid()
    )
  );

CREATE POLICY "cards_board_owner_update" ON cards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM columns
      JOIN boards ON columns.board_id = boards.id
      WHERE columns.id = cards.column_id AND boards.owner_id = auth.uid()
    )
  );

CREATE POLICY "cards_board_owner_delete" ON cards
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM columns
      JOIN boards ON columns.board_id = boards.id
      WHERE columns.id = cards.column_id AND boards.owner_id = auth.uid()
    )
  );

-- Trigger for updating updated_at
CREATE TRIGGER update_cards_updated_at
BEFORE UPDATE ON cards
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();