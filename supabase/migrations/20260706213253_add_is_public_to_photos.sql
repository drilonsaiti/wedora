alter table photos
    add column is_public boolean not null default false;