-- Local test data only. Runs on `supabase db reset`, never on `supabase db push`.
-- Photos are uploaded to the local store-images bucket by `pnpm db:seed:images`.

insert into public.products (
  name, slug, description, pet_type_id, category_id, price, availability, production_days,
  is_featured, is_active, created_at
)
select
  p.name, p.slug, p.description,
  (select id from public.pet_types where slug = p.pet_type),
  (select id from public.categories where slug = p.category),
  p.price, p.availability::public.availability, p.production_days,
  p.is_featured, p.is_active, now() - make_interval(days => p.days_ago)
from (values
  ('Abrigo Osito Rosa', 'abrigo-osito-rosa',
    'Abrigo de peluche suave con capucha de orejitas. Forro de algodón y broches en el pecho.',
    'perro', 'abrigos', 120, 'in_stock', null::integer, true, true, 1),
  ('Impermeable Amarillo', 'impermeable-amarillo',
    'Impermeable con forro polar, pensado para razas de pecho ancho como bulldog y pug.',
    'perro', 'abrigos', 140, 'in_stock', null, false, true, 2),
  ('Vestido Flores Lila', 'vestido-flores-lila',
    'Vestido de algodón con estampado de flores y lazo en la espalda.',
    'perro', 'vestidos', 90, 'in_stock', null, true, true, 3),
  ('Vestido Cuadritos', 'vestido-cuadritos',
    'Vestido liviano a cuadros, ideal para gatos tranquilos.',
    'gato', 'vestidos', 85, 'in_stock', null, false, true, 4),
  ('Chompa Trenzada Crema', 'chompa-trenzada-crema',
    'Chompa tejida a mano con punto trenzado.',
    'gato', 'abrigos', 110, 'in_stock', null, false, true, 5),
  ('Abrigo Polar Azul', 'abrigo-polar-azul',
    'Abrigo polar con cuello alto y cierre de velcro.',
    'perro', 'abrigos', 130, 'in_stock', null, false, true, 6),
  ('Abrigo Cuadros Rojo', 'abrigo-cuadros-rojo',
    'Abrigo escocés de lana con botones de madera.',
    'perro', 'abrigos', 125, 'in_stock', null, false, true, 7),
  ('Vestido Tul Rosado', 'vestido-tul-rosado',
    'Vestido de fiesta con falda de tul.',
    'gato', 'vestidos', 95, 'in_stock', null, false, true, 8),
  ('Bandana Estrellas', 'bandana-estrellas',
    'Bandana reversible con estrellas bordadas.',
    'perro', 'otros', 40, 'in_stock', null, false, true, 9),
  ('Poncho Aguayo', 'poncho-aguayo',
    'Poncho con tela de aguayo y borde de lana. Lo hacemos a la medida de tu mascota.',
    'perro', 'otros', 150, 'made_to_order', 10, true, true, 10),
  ('Abrigo a Medida para Gato', 'abrigo-a-medida-gato',
    'Abrigo acolchado hecho a pedido en el color que elijas.',
    'gato', 'abrigos', 160, 'made_to_order', 7, false, true, 11),
  ('Abrigo Borrador', 'abrigo-borrador',
    'Producto inactivo para comprobar que no aparece en la tienda.',
    'perro', 'abrigos', 100, 'in_stock', null, false, false, 12)
) as p (
  name, slug, description, pet_type, category, price, availability, production_days,
  is_featured, is_active, days_ago
);

insert into public.variants (
  product_id, size_id, stock, neck_cm, chest_cm, back_length_cm, tolerance_cm
)
select
  (select id from public.products where slug = v.product),
  (select id from public.sizes where label = v.size),
  v.stock, v.neck_cm, v.chest_cm, v.back_length_cm, v.tolerance_cm
from (values
  ('abrigo-osito-rosa', '0', 1, 25::numeric, 37::numeric, 27::numeric, null::numeric),
  ('abrigo-osito-rosa', '1', 1, null, null, null, null),
  ('impermeable-amarillo', '2', 1, 31, 54, 37, 4),
  ('vestido-flores-lila', '00', 1, 22, 32, 22, null),
  ('vestido-cuadritos', '000', 1, null, null, null, null),
  ('chompa-trenzada-crema', '0', 1, 24.5, 36, 26, null),
  ('abrigo-polar-azul', '1', 0, 28, 42, 32, null),
  ('abrigo-polar-azul', '2', 1, 31, 47, 37, null),
  ('abrigo-cuadros-rojo', '1', 0, 28, 41, 31, null),
  ('vestido-tul-rosado', '00', 0, null, null, null, null),
  ('bandana-estrellas', '3', 0, 34, null, null, null),
  ('poncho-aguayo', '1', 0, null, null, null, null),
  ('poncho-aguayo', '2', 0, null, null, null, null),
  ('poncho-aguayo', '3', 0, null, null, null, null),
  ('poncho-aguayo', '4', 0, null, null, null, null),
  ('abrigo-a-medida-gato', '000', 0, null, null, null, null),
  ('abrigo-a-medida-gato', '00', 0, null, null, null, null),
  ('abrigo-a-medida-gato', '0', 0, null, null, null, null),
  ('abrigo-borrador', '1', 1, null, null, null, null)
) as v (product, size, stock, neck_cm, chest_cm, back_length_cm, tolerance_cm);

insert into public.product_photos (product_id, storage_path, alt_text, sort_order)
select
  (select id from public.products where slug = ph.product),
  'seed/placeholder-' || ph.image || '.png',
  ph.alt_text,
  ph.sort_order
from (values
  ('abrigo-osito-rosa', 1, 'Abrigo Osito Rosa, vista de frente', 1),
  ('abrigo-osito-rosa', 2, 'Abrigo Osito Rosa, vista de espalda', 2),
  ('abrigo-osito-rosa', 3, 'Detalle de la capucha del Abrigo Osito Rosa', 3),
  ('impermeable-amarillo', 4, 'Impermeable Amarillo, vista de frente', 1),
  ('impermeable-amarillo', 5, 'Impermeable Amarillo, vista lateral', 2),
  ('vestido-flores-lila', 2, 'Vestido Flores Lila, vista de frente', 1),
  ('vestido-cuadritos', 6, 'Vestido Cuadritos, vista de frente', 1),
  ('chompa-trenzada-crema', 3, 'Chompa Trenzada Crema, vista de frente', 1),
  ('abrigo-polar-azul', 5, 'Abrigo Polar Azul, vista de frente', 1),
  ('abrigo-polar-azul', 1, 'Abrigo Polar Azul, vista de espalda', 2),
  ('abrigo-cuadros-rojo', 4, 'Abrigo Cuadros Rojo, vista de frente', 1),
  ('vestido-tul-rosado', 1, 'Vestido Tul Rosado, vista de frente', 1),
  ('bandana-estrellas', 6, 'Bandana Estrellas puesta en un perro', 1),
  ('poncho-aguayo', 2, 'Poncho Aguayo, vista de frente', 1),
  ('poncho-aguayo', 3, 'Detalle de la tela de aguayo', 2),
  ('abrigo-a-medida-gato', 5, 'Abrigo a Medida para Gato, vista de frente', 1),
  ('abrigo-borrador', 1, 'Abrigo Borrador', 1)
) as ph (product, image, alt_text, sort_order);

-- A proof_uploaded order holds stock with no expiry, so the product stays "Reservada".
with reserved as (
  insert into public.orders (
    channel, status, customer_name, customer_phone, delivery_method, items_total
  ) values ('web', 'proof_uploaded', 'Cliente de prueba', '71234567', 'pickup_point', 110)
  returning id
)
insert into public.order_items (order_id, variant_id, quantity, unit_price, product_name, is_made_to_order)
select reserved.id, v.id, 1, 110, 'Chompa Trenzada Crema', false
from reserved
join public.variants v on v.product_id = (select id from public.products where slug = 'chompa-trenzada-crema');
