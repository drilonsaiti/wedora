ALTER TABLE public.tables DROP CONSTRAINT tables_number_key;
ALTER TABLE public.tables
    ADD CONSTRAINT tables_wedding_id_number_key UNIQUE (wedding_id, number);