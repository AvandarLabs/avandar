CREATE TRIGGER tr_tokens__google__set_updated_at BEFORE UPDATE ON public.tokens__google FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();


