
CREATE TABLE IF NOT EXISTS user_registration (
    id SERIAL PRIMARY KEY,			            -- Identificador único
    username VARCHAR(50) NOT NULL UNIQUE,	    -- Nome de usuário
    password VARCHAR(255) NOT NULL,		        -- Senha (idealmente armazenar hash)
    is_authorized BOOLEAN DEFAULT FALSE,       	-- TRUE = Ativo, FALSE = Bloqueado
    type_user VARCHAR(50),                     	-- Administrator, Suporte, Operador, Leitor
    date_registration TIMESTAMPTZ DEFAULT NOW(), -- Data de registro
    name VARCHAR(100),                         	-- Nome completo
    job_title VARCHAR(100),                    	-- Cargo
    recruitment VARCHAR(100),                   -- Processo de atrair e selecionar candidatos para vagas[CREATER,UPDATE,DELETE,READ].
    payroll VARCHAR(100),   			        -- Sistema de cálculo e gestão de salários, impostos e encargos trabalhistas.
    training VARCHAR(100),                      -- Atividades de capacitação e desenvolvimento de habilidades dos colaboradores.
    shift_schedule_and_vacation VARCHAR(100),   -- Organização de turnos de trabalho e controle de períodos de férias.
    evaluation VARCHAR(100),                    -- Processo de medir desempenho, competências ou resultados dos funcionários.
    communication VARCHAR(100),                 -- Fluxo de informações internas e externas na empresa.
    health_and_safety VARCHAR(100),             -- Práticas e normas para proteger colaboradores de riscos físicos e ocupacionais.
    benefits VARCHAR(100),                      -- Vantagens oferecidas além do salário (plano de saúde, vale alimentação, etc.).
    development VARCHAR(100),                   -- Crescimento profissional e organizacional, incluindo planos de carreira.
    infrastructure VARCHAR(100),                -- Recursos físicos e tecnológicos que sustentam operações da empresa.
    security VARCHAR(100),                      -- Proteção contra riscos físicos e digitais (acesso, dados, patrimônio).
    database VARCHAR(100),                      -- Estrutura organizada para armazenar e gerenciar informações digitais.
    table_load VARCHAR(100),                    -- Processo de inserir ou atualizar dados em tabelas de um banco de dados.
    allowed_sector VARCHAR(100),               	-- Setor permitido
    access_data TIMESTAMPTZ                    	-- Último acesso
);

-- Inserindo registros de exemplo
INSERT INTO user_registration (
    username,
    password,
    is_authorized,
    type_user,
    date_registration,
    name,
    job_title,
    recruitment,
    payroll,
    training,
    shift_schedule_and_vacation,
    evaluation,
    communication,
    health_and_safety,
    benefits,
    development,
    infrastructure,
    security,
    database,
    table_load,
    allowed_sector,
    access_data
) VALUES
(
    'BENJAMIM',
    'pbkdf2:2S1EJbIspUkZ2BV/obht8iKilmdajcRMUmsvC9VhFUKJfxLLm7Y6ZSJlMaktpTlT',  -- Padrão 123456
    TRUE,
    'ADMINISTRADOR',
    NOW(),
    'BENJAMIM GOMES',
    'COORDENADOR RH',
    'CREATER,UPDATE,DELETE,READ',
    'CREATER,UPDATE,DELETE,READ',
    'CREATER,UPDATE,DELETE,READ',
    'CREATER,UPDATE,DELETE,READ',
    'CREATER,UPDATE,DELETE,READ',
    'CREATER,UPDATE,DELETE,READ',
    'CREATER,UPDATE,DELETE,READ',
    'CREATER,UPDATE,DELETE,READ',
    'CREATER,UPDATE,DELETE,READ',
    'CREATER,UPDATE,DELETE,READ',
    'CREATER,UPDATE,DELETE,READ,PASSWORD',
    'CREATER,UPDATE,DELETE,READ',
    'CREATER,UPDATE,DELETE,READ',
    'TODOS',
    NOW()
),
(
    'YAGO',
    'pbkdf2:2S1EJbIspUkZ2BV/obht8iKilmdajcRMUmsvC9VhFUKJfxLLm7Y6ZSJlMaktpTlT',  -- Padrão 123456
    TRUE,
    'ADMINISTRADOR',
    NOW(),
    'YAGO FALHO',
    'ANALISTA DE SISTEMA',
    'CREATER,UPDATE,DELETE,READ',
    'CREATER,UPDATE,DELETE,READ',
    'CREATER,UPDATE,DELETE,READ',
    'CREATER,UPDATE,DELETE,READ',
    'CREATER,UPDATE,DELETE,READ',
    'CREATER,UPDATE,DELETE,READ',
    'CREATER,UPDATE,DELETE,READ',
    'CREATER,UPDATE,DELETE,READ',
    'CREATER,UPDATE,DELETE,READ',
    'CREATER,UPDATE,DELETE,READ',
    'CREATER,UPDATE,DELETE,READ',
    'CREATER,UPDATE,DELETE,READ',
    'CREATER,UPDATE,DELETE,READ',
    'TODOS',
    NOW()
);
