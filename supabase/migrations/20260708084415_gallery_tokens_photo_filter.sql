alter table gallery_tokens
    add column photo_filter text not null default 'all'
        check (photo_filter in ('all', 'favourites'));