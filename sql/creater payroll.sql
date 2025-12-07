CREATE TABLE IF NOT EXISTS payroll (
    id INT PRIMARY KEY,                  -- Identificador
    registration INT,                    -- Número de registro interno do funcionário
    name VARCHAR(150),                   -- Nome completo do funcionário
    events_payroll INT,                  -- Eventos da Folha de Pagamentos
    references_payroll DECIMAL,          -- Refere a quantidade do evento
    date_payroll DATE,                   -- Data de pagamento do evento
    type_registration VARCHAR(50),       -- Tipo de registro (manual ou exportado)
    user_registration VARCHAR(50),       -- Usuário que registrou
    date_registration TIMESTAMPTZ        -- Data de registro no sistema
);


/* dados da planilha
planilha: *.xlsx

 */