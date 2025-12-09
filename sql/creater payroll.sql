/*
  Este script cria a tabela 'payrolls' para armazenar os eventos da folha de pagamento dos funcionários.
  A tabela é projetada para não existir antes da criação.

  Origem dos dados: Planilhas *.xlsx
*/

CREATE TABLE IF NOT EXISTS payrolls (
    id SERIAL PRIMARY KEY,                      -- Identificador único autoincrementável do registro.
    registration INT NOT NULL,                  -- Número de registro interno do funcionário.
    name VARCHAR(150) NOT NULL,                 -- Nome completo do funcionário.
    event_code INT NOT NULL,                    -- Código do evento da folha de pagamentos.
    event_reference DECIMAL(10, 2),             -- Referência/quantidade do evento (ex: horas, dias).
    event_value DECIMAL(10, 2) NOT NULL,        -- Valor monetário do evento.
    payment_date DATE NOT NULL,                 -- Data de pagamento do evento.
    registration_type VARCHAR(50),              -- Tipo de registro (ex: 'manual', 'importado').
    user_registration VARCHAR(50),              -- Usuário que efetuou o registro.
    registration_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP -- Data e hora do registro no sistema.
);