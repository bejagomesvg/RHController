import pandas as pd
import re
import math
from datetime import datetime

# Códigos que queremos somar (agora incluindo 303 e 304)
CODIGOS_INTERESSE = ["303", "304", "505", "506", "511", "512"]


def tempo_str_para_minutos(valor):
    """
    Converte qualquer coisa tipo:
    - 001:35
    - 1:35
    - 01:35:00
    - 01:35:00.002000
    - '0 days 01:35:00'
    em minutos inteiros.
    """
    if valor is None:
        return 0

    # Se vier como float NaN
    if isinstance(valor, float) and math.isnan(valor):
        return 0

    s = str(valor).strip()
    if not s or s.upper() == "NAT":
        return 0

    # Pega o primeiro padrão H:MM ou H:MM:SS[.fração]
    m = re.search(r"(\d+):(\d{2})(?::(\d{2})(?:\.\d+)?)?", s)
    if not m:
        return 0

    horas = int(m.group(1))
    minutos = int(m.group(2))
    # segundos ignorados
    return horas * 60 + minutos


def minutos_para_hhmm(minutos):
    """
    Converte minutos inteiros para string HH:MM
    Sempre com 5 caracteres: 00:00, 01:30, 10:15, etc.
    """
    if minutos <= 0:
        return ""
    h = minutos // 60
    m = minutos % 60
    return f"{h:02d}:{m:02d}"


def extrair_periodo(df):
    """
    Procura a linha que contém 'Período:' e extrai a data da coluna onde está a data
    """
    for idx, row in df.iterrows():
        for col in range(df.shape[1]):
            cell_value = row[col]
            if cell_value is not None:
                cell_str = str(cell_value).strip()
                if cell_str == "Período:":
                    # Agora procura por uma data nas próximas colunas
                    for next_col in range(col + 1, min(col + 4, df.shape[1])):
                        data_cell = row[next_col]
                        if data_cell is not None:
                            data_str = str(data_cell).strip()
                            # Procura por padrão de data dd/mm/aaaa
                            match = re.search(r'(\d{2}/\d{2}/\d{4})', data_str)
                            if match:
                                try:
                                    # Valida se é uma data válida
                                    data_obj = datetime.strptime(match.group(1), '%d/%m/%Y')
                                    return data_obj.strftime('%d/%m/%Y')
                                except ValueError:
                                    continue
    return ""


def extrair_apuracao_de_excel(caminho_xlsx):
    """
    Lê o XLSX no layout do relatório de apuração
    e devolve um dicionário com os totais por colaborador.
    """
    # Lê tudo como objeto para não perder formatos
    df = pd.read_excel(caminho_xlsx, header=None, dtype=object)

    # Extrair código da empresa da célula A2 (índice 0,1)
    codigo_empresa = ""
    if df.shape[0] > 1 and df.iloc[1, 0] is not None:
        empresa_valor = df.iloc[1, 0]
        if isinstance(empresa_valor, (int, float)):
            codigo_empresa = str(int(empresa_valor))
        else:
            codigo_empresa = str(empresa_valor).strip()

    # Extrair período buscando por "Período:" no arquivo
    periodo = extrair_periodo(df)

    colaboradores = {}
    matricula_atual = None
    nome_atual = None

    for _, row in df.iterrows():
        mat = row[0]  # matrícula
        nome = row[1]  # nome

        # Detecta início de um novo colaborador:
        #   - coluna 0 com número grande (matrícula)
        #   - coluna 1 com nome
        if mat is not None and not (isinstance(mat, float) and math.isnan(mat)):
            try:
                mat_int = int(str(mat).split('.')[0])
            except ValueError:
                mat_int = None

            # Ignora o "5" da empresa, pega só matrículas grandes
            if mat_int is not None and mat_int >= 100000 and isinstance(nome, str) and nome.strip():
                matricula_atual = str(mat_int).zfill(6)
                nome_atual = nome.strip()

                if matricula_atual not in colaboradores:
                    colaboradores[matricula_atual] = {
                        "codigo_empresa": codigo_empresa,
                        "periodo": periodo,
                        "matricula": matricula_atual,
                        "nome": nome_atual,
                        "303": 0,
                        "304": 0,
                        "505": 0,
                        "506": 0,
                        "511": 0,
                        "512": 0,
                    }
                else:
                    # se aparecer de novo, só garante o nome atualizado
                    colaboradores[matricula_atual]["nome"] = nome_atual

        # Se já temos um colaborador "ativo" nessa parte do relatório…
        if matricula_atual:
            cod = row[6]  # código (303/304/505/506/511/512)

            if cod is not None and not (isinstance(cod, float) and math.isnan(cod)):
                cod_str = str(cod).strip()

                if cod_str in CODIGOS_INTERESSE:
                    # Procura o horário na mesma linha (normalmente coluna 9)
                    hora_valor = None
                    for col in range(7, df.shape[1]):
                        v = row[col]
                        if v is None or (isinstance(v, float) and math.isnan(v)):
                            continue
                        # pega a célula que tem algo no formato de hora
                        if re.search(r"\d+:\d{2}", str(v)):
                            hora_valor = v

                    if hora_valor is not None:
                        minutos = tempo_str_para_minutos(hora_valor)
                        colaboradores[matricula_atual][cod_str] += minutos

    return colaboradores


def gerar_csv_apuracao(caminho_xlsx):
    dados = extrair_apuracao_de_excel(caminho_xlsx)

    # Converte o dicionário em DataFrame
    linhas = []
    for colab in dados.values():
        linhas.append({
            # REMOVIDO: "codigo_empresa": colab["codigo_empresa"],
            "matricula": colab["matricula"],
            "nome": colab["nome"],
            "303": minutos_para_hhmm(colab["303"]),
            "304": minutos_para_hhmm(colab["304"]),
            "505": minutos_para_hhmm(colab["505"]),
            "506": minutos_para_hhmm(colab["506"]),
            "511": minutos_para_hhmm(colab["511"]),
            "512": minutos_para_hhmm(colab["512"]),
        })

    df_saida = pd.DataFrame(linhas)
    df_saida.sort_values(by=["matricula"], inplace=True)

    # Gerar nome do arquivo com data e hora atual
    data_hora_atual = datetime.now().strftime("%Y%m%d_%H%M%S")
    nome_arquivo = f"apuracao_tratada_{data_hora_atual}.csv"

    # Salvar como CSV apenas
    df_saida.to_csv(nome_arquivo, index=False, encoding="utf-8-sig")

    print(f"CSV gerado: {nome_arquivo}")
    return nome_arquivo


if __name__ == "__main__":
    # Se o arquivo estiver na mesma pasta do script:
    csv_file = gerar_csv_apuracao("apuracao.xlsx")