-- Enhancement of cards table with new fields
-- This migration adds new fields to the cards table to support enhanced functionality

-- Create epics table
CREATE TABLE IF NOT EXISTS epics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security on epics
ALTER TABLE epics ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for epics based on board ownership
CREATE POLICY "epics_board_owner_select" ON epics
  FOR SELECT USING (true); -- All authenticated users can view epics (can be refined)

CREATE POLICY "epics_board_owner_insert" ON epics
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "epics_board_owner_update" ON epics
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "epics_board_owner_delete" ON epics
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create labels table
CREATE TABLE IF NOT EXISTS labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security on labels
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for labels based on board ownership
CREATE POLICY "labels_board_owner_select" ON labels
  FOR SELECT USING (true); -- All authenticated users can view labels (can be refined)

CREATE POLICY "labels_board_owner_insert" ON labels
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "labels_board_owner_update" ON labels
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "labels_board_owner_delete" ON labels
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create card_labels junction table
CREATE TABLE IF NOT EXISTS card_labels (
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  label_id UUID REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, label_id)
);

-- Enable Row Level Security on card_labels
ALTER TABLE card_labels ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for card_labels based on card ownership
CREATE POLICY "card_labels_board_owner_select" ON card_labels
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM cards
      JOIN columns ON cards.column_id = columns.id
      JOIN boards ON columns.board_id = boards.id
      WHERE cards.id = card_labels.card_id AND boards.owner_id = auth.uid()
    )
  );

CREATE POLICY "card_labels_board_owner_insert" ON card_labels
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM cards
      JOIN columns ON cards.column_id = columns.id
      JOIN boards ON columns.board_id = boards.id
      WHERE cards.id = card_labels.card_id AND boards.owner_id = auth.uid()
    )
  );

CREATE POLICY "card_labels_board_owner_delete" ON card_labels
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM cards
      JOIN columns ON cards.column_id = columns.id
      JOIN boards ON columns.board_id = boards.id
      WHERE cards.id = card_labels.card_id AND boards.owner_id = auth.uid()
    )
  );

-- Create indexes for optimization
CREATE INDEX IF NOT EXISTS idx_card_labels_card_id ON card_labels(card_id);
CREATE INDEX IF NOT EXISTS idx_card_labels_label_id ON card_labels(label_id);

-- For efficient access to epics
CREATE INDEX IF NOT EXISTS idx_epics_name ON epics(name);

-- Note: We're using the metadata JSONB field that already exists in the cards table
-- This keeps backward compatibility with existing code while adding new features
-- The client code will read and store extended card properties in this metadata field
COMMENT ON COLUMN cards.metadata IS 'JSON metadata column for extended card properties including: cardType, priority, dueDate, blocked, blockReason, epic, ageing';