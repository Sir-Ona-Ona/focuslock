-- I-8. Domain order is an argument, not a convention: Faith opens as a filter
-- because it produces the constraints the rest are tested against, and Health
-- closes as an audit because every other domain declares an hour demand as it
-- is built. The order is also a method setting, so a household can change it,
-- and changing it is a decision with a recorded reason.
insert into domain (code, name, short_name, sort_order) values
  ('FTH', 'Faith, values, community, legacy', 'Faith', 1),
  ('FAM', 'Family, marriage, children', 'Family', 2),
  ('FIN', 'Finance, investment, property', 'Finance', 3),
  ('CAR', 'Career and professional trajectory', 'Career', 4),
  ('REL', 'Relocation and mobility', 'Relocation', 5),
  ('LRN', 'Learning, credentials, capability', 'Learning', 6),
  ('HLT', 'Health, energy, sustainability', 'Health', 7)
on conflict (code) do update
  set name = excluded.name,
      short_name = excluded.short_name,
      sort_order = excluded.sort_order;
