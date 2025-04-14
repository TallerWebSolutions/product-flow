-- Create metrics table
CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- Add constraints and indexes
CREATE INDEX IF NOT EXISTS idx_metrics_board_id ON metrics(board_id);
CREATE INDEX IF NOT EXISTS idx_metrics_card_id ON metrics(card_id);
CREATE INDEX IF NOT EXISTS idx_metrics_event_type ON metrics(event_type);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_metrics_data ON metrics USING gin(data);

-- Enable Row Level Security
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies based on board ownership
CREATE POLICY "metrics_board_owner_select" ON metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM boards WHERE boards.id = metrics.board_id AND boards.owner_id = auth.uid()
    )
  );

CREATE POLICY "metrics_board_owner_insert" ON metrics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards WHERE boards.id = metrics.board_id AND boards.owner_id = auth.uid()
    )
  );

-- No update policy needed as metrics should be immutable
-- No delete policy needed as metrics should be deleted only when boards/cards are deleted (cascade)