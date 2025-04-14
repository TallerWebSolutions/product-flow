-- Create card_templates table
CREATE TABLE IF NOT EXISTS card_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template JSONB NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add RLS policies for card_templates
ALTER TABLE card_templates ENABLE ROW LEVEL SECURITY;

-- Policies for card_templates - all authenticated users can view templates
CREATE POLICY "All users can view templates"
  ON card_templates FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

-- Only owners can modify or delete their own templates
CREATE POLICY "Users can insert their own templates"
  ON card_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON card_templates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON card_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Add a function to automatically set user_id for new card templates
CREATE OR REPLACE FUNCTION set_card_template_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to set the user_id when a card template is created
CREATE TRIGGER set_card_template_user_id_trigger
  BEFORE INSERT ON card_templates
  FOR EACH ROW
  EXECUTE FUNCTION set_card_template_user_id();

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_card_template_updated_at
  BEFORE UPDATE ON card_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();