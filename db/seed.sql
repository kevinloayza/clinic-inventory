INSERT INTO patients (full_name, dni, birth_date) VALUES
  ('María Fernández Quispe', '45678123', '1985-03-14'),
  ('Carlos Ramírez Soto',    '40123987', '1972-11-02'),
  ('Lucía Paredes Vega',     '71234560', '1996-07-21')
ON CONFLICT DO NOTHING;

-- Fechas relativas a hoy para que siempre haya un insumo vigente, uno por vencer y uno vencido
INSERT INTO supplies (name, unit, stock, min_stock, expiration_date) VALUES
  ('Paracetamol 500 mg',   'tabletas', 240, 100, CURRENT_DATE + 400),
  ('Jeringa 5 ml',         'unidades',  80,  50, NULL),
  ('Guantes de nitrilo M', 'cajas',      6,  10, CURRENT_DATE + 20),
  ('Alcohol 70%',          'litros',    18,   5, CURRENT_DATE - 15)
ON CONFLICT DO NOTHING;
