-- Create comment_likes table to support comment liking feature
CREATE TABLE IF NOT EXISTS public.comment_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL, -- Firebase UID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- Set up RLS Policies
-- 1. Everyone can see how many likes a comment has
CREATE POLICY "Public profiles can view comment likes" 
ON public.comment_likes FOR SELECT 
USING (true);

-- 2. Authenticated users can like/unlike comments
CREATE POLICY "Users can manage their own comment likes" 
ON public.comment_likes FOR ALL 
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- Explicitly allow insert/delete for more clarity if needed
-- CREATE POLICY "Users can insert their own comment likes" ON public.comment_likes FOR INSERT WITH CHECK (auth.uid()::text = user_id);
-- CREATE POLICY "Users can delete their own comment likes" ON public.comment_likes FOR DELETE USING (auth.uid()::text = user_id);
