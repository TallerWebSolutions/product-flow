-- Create boards table
CREATE TABLE IF NOT EXISTS boards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_boards_owner_id ON boards(owner_id);
CREATE INDEX IF NOT EXISTS idx_boards_created_at ON boards(created_at);

-- Enable Row Level Security
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "boards_owner_select" ON boards
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "boards_owner_insert" ON boards
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "boards_owner_update" ON boards
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "boards_owner_delete" ON boards
  FOR DELETE USING (auth.uid() = owner_id);

-- Trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_boards_updated_at
BEFORE UPDATE ON boards
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();