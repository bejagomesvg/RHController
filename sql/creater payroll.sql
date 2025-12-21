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
CREATE TABLE IF NOT EXISTS public.closing_payroll (
    id                 SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company            NUMERIC NOT NULL,
    registration       NUMERIC NOT NULL,
    competence         DATE NOT NULL,
    name               TEXT NOT NULL,
    status_            NUMERIC NOT NULL,
    status_date        DATE NOT NULL,
    date_registration  TIMESTAMPTZ DEFAULT now(),
    type_registration  TEXT NOT NULL,
    user_registration  TEXT NOT NULL,
    user_update        TEXT,
    date_update        TIMESTAMPTZ,
    CONSTRAINT fk_payroll_employee FOREIGN KEY (registration)
        REFERENCES public.employee (registration)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_payroll_status FOREIGN KEY (status_)
        REFERENCES public.status (status)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.closing_payroll_item (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    closing_payroll_id SMALLINT NOT NULL,
    event_code         NUMERIC NOT NULL,
    event_reference    NUMERIC,
    event_value        NUMERIC NOT NULL,
    CONSTRAINT fk_closing_payroll_item_closing FOREIGN KEY (closing_payroll_id)
        REFERENCES public.closing_payroll (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);
