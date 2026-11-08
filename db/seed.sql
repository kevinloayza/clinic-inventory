INSERT INTO patients (full_name, dni, birth_date) VALUES
  ('María Fernández Quispe', '45678123', '1985-03-14'),
  ('Carlos Ramírez Soto',    '40123987', '1972-11-02'),
  ('Lucía Paredes Vega',     '71234560', '1996-07-21')
ON CONFLICT DO NOTHING;

INSERT INTO supplies (name, unit, stock, min_stock) VALUES
  ('Paracetamol 500 mg',   'tabletas', 240, 100),
  ('Jeringa 5 ml',         'unidades',  80,  50),
  ('Guantes de nitrilo M', 'cajas',      6,  10),
  ('Alcohol 70%',          'litros',    18,   5)
ON CONFLICT DO NOTHING;
