create table if not exists email_templates (
    id uuid primary key,
    template_key varchar(50) not null unique,
    subject_template text not null,
    body_template text not null,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp
);