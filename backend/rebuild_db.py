import os
import sqlite3
from db import init_db
from open_finance import init_open_finance_tables
from notification_reader import init_notification_tables

# Remover banco de dados existente
db_path = "finance.db"
if os.path.exists(db_path):
    os.remove(db_path)
    print(f"Banco de dados antigo removido: {db_path}")

# Inicializar todas as tabelas novamente
print("Recriando banco de dados...")
init_db()
init_open_finance_tables()
init_notification_tables()

# Verificar se a coluna token_expires_at foi criada corretamente
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Verificar estrutura da tabela open_finance_consents
cursor.execute("PRAGMA table_info(open_finance_consents)")
columns = cursor.fetchall()
column_names = [col["name"] for col in columns]

print("\nEstrutura da tabela open_finance_consents:")
for col in columns:
    print(f"  - {col["name"]} ({col["type"]})")

if "token_expires_at" in column_names:
    print("\nA coluna token_expires_at foi criada com sucesso!")
else:
    print("\nERRO: A coluna token_expires_at não foi encontrada!")

conn.close()
print("\nReconstrução completa do banco de dados finalizada.")
