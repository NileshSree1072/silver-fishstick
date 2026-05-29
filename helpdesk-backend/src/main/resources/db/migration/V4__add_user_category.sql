ALTER TABLE users
    ADD COLUMN category_id UUID REFERENCES categories(id);
