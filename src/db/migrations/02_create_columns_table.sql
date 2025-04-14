-- Create columns table
CREATE TABLE IF NOT EXISTS columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  "order" INTEGER NOT NULL,
  parent_column_id UUID REFERENCES columns(id) ON DELETE SET NULL,
  wip_limit INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add constraints and indexes
CREATE INDEX IF NOT EXISTS idx_columns_board_id ON columns(board_id);
CREATE INDEX IF NOT EXISTS idx_columns_parent_column_id ON columns(parent_column_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_columns_board_order ON columns(board_id, "order");

-- Enable Row Level Security
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies based on board ownership
CREATE POLICY "columns_board_owner_select" ON columns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM boards WHERE boards.id = columns.board_id AND boards.owner_id = auth.uid()
    )
  );

CREATE POLICY "columns_board_owner_insert" ON columns
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards WHERE boards.id = columns.board_id AND boards.owner_id = auth.uid()
    )
  );

CREATE POLICY "columns_board_owner_update" ON columns
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM boards WHERE boards.id = columns.board_id AND boards.owner_id = auth.uid()
    )
  );

CREATE POLICY "columns_board_owner_delete" ON columns
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM boards WHERE boards.id = columns.board_id AND boards.owner_id = auth.uid()
    )
  );

-- Trigger for updating updated_at
CREATE TRIGGER update_columns_updated_at
BEFORE UPDATE ON columns
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();