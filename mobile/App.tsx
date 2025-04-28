import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  FlatList
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

// Definição do tipo de transação
interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}

// Definição do tipo de resumo financeiro
interface Summary {
  total_income: number;
  total_expense: number;
  balance: number;
}

const App = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total_income: 0,
    total_expense: 0,
    balance: 0
  });
  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    type: 'expense'
  });
  const [isLoading, setIsLoading] = useState(true);

  // URL do backend - substitua pelo seu IP quando estiver testando localmente
  const API_URL = 'http://10.0.2.2:5000'; // Funciona para emuladores Android 
  // const API_URL = 'http://localhost:5000'; // Opção para iOS

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      // Buscar transações
      const transactionsResponse = await fetch(`${API_URL}/api/transactions`);
      const transactionsData = await transactionsResponse.json();

      // Buscar resumo
      const summaryResponse = await fetch(`${API_URL}/api/summary`);
      const summaryData = await summaryResponse.json();

      setTransactions(transactionsData);
      setSummary(summaryData);
      setIsLoading(false);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      Alert.alert(
        'Erro',
        'Não foi possível conectar ao servidor. Verifique se o backend está rodando.'
      );
      setIsLoading(false);
    }
  };

  const handleAddTransaction = async () => {
    if (!newTransaction.description || !newTransaction.amount) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: newTransaction.date,
          description: newTransaction.description,
          amount: parseFloat(newTransaction.amount),
          type: newTransaction.type
        })
      });

      if (response.ok) {
        // Limpar campos
        setNewTransaction({
          date: new Date().toISOString().split('T')[0],
          description: '',
          amount: '',
          type: 'expense'
        });
        // Recarregar dados
        fetchData();
        Alert.alert('Sucesso', 'Transação adicionada com sucesso');
      } else {
        Alert.alert('Erro', 'Não foi possível adicionar a transação');
      }
    } catch (error) {
      console.error('Erro ao adicionar transação:', error);
      Alert.alert('Erro', 'Não foi possível conectar ao servidor');
    }
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2)}`;
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={[
      styles.transactionCard,
      item.type === 'income' ? styles.incomeCard : styles.expenseCard
    ]}>
      <Text style={styles.transactionDate}>{item.date}</Text>
      <Text style={styles.transactionDescription}>{item.description}</Text>
      <Text style={styles.transactionAmount}>
        {formatCurrency(item.amount)}
      </Text>
      <Text style={styles.transactionType}>
        {item.type === 'income' ? 'Receita' : 'Despesa'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.scrollView}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Sistema de Finanças</Text>
        </View>

        {/* Resumo Financeiro */}
        <View style={styles.summaryContainer}>
          <Text style={styles.sectionTitle}>Resumo Financeiro</Text>
          <View style={styles.summaryCards}>
            <View style={[styles.summaryCard, styles.incomeBackground]}>
              <Text style={styles.summaryLabel}>Receitas</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(summary.total_income)}
              </Text>
            </View>
            <View style={[styles.summaryCard, styles.expenseBackground]}>
              <Text style={styles.summaryLabel}>Despesas</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(summary.total_expense)}
              </Text>
            </View>
          </View>
          <View style={[styles.summaryCard, styles.balanceBackground]}>
            <Text style={styles.summaryLabel}>Saldo</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(summary.balance)}
            </Text>
          </View>
        </View>

        {/* Formulário para Adicionar Transação */}
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Nova Transação</Text>
          <TextInput
            style={styles.input}
            placeholder="Descrição"
            value={newTransaction.description}
            onChangeText={(text) => setNewTransaction({...newTransaction, description: text})}
          />
          <TextInput
            style={styles.input}
            placeholder="Valor"
            keyboardType="numeric"
            value={newTransaction.amount}
            onChangeText={(text) => setNewTransaction({...newTransaction, amount: text})}
          />
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Tipo:</Text>
            <Picker
              selectedValue={newTransaction.type}
              style={styles.picker}
              onValueChange={(itemValue) => setNewTransaction({...newTransaction, type: itemValue})}>
              <Picker.Item label="Despesa" value="expense" />
              <Picker.Item label="Receita" value="income" />
            </Picker>
          </View>
          <TouchableOpacity style={styles.button} onPress={handleAddTransaction}>
            <Text style={styles.buttonText}>Adicionar Transação</Text>
          </TouchableOpacity>
        </View>

        {/* Lista de Transações */}
        <View style={styles.transactionsContainer}>
          <Text style={styles.sectionTitle}>Histórico de Transações</Text>
          {isLoading ? (
            <Text style={styles.loadingText}>Carregando transações...</Text>
          ) : transactions.length > 0 ? (
            <FlatList
              data={transactions}
              renderItem={renderTransaction}
              keyExtractor={(item) => item.id.toString()}
              style={styles.transactionsList}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.noTransactionsText}>
              Nenhuma transação encontrada.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#2c3e50',
    padding: 15,
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  summaryContainer: {
    padding: 15,
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#2c3e50',
  },
  summaryCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryCard: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  incomeBackground: {
    backgroundColor: '#d4edda',
  },
  expenseBackground: {
    backgroundColor: '#f8d7da',
  },
  balanceBackground: {
    backgroundColor: '#d1ecf1',
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  formContainer: {
    padding: 15,
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  pickerContainer: {
    marginBottom: 15,
  },
  pickerLabel: {
    fontSize: 16,
    marginBottom: 5,
  },
  picker: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionsContainer: {
    padding: 15,
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingText: {
    textAlign: 'center',
    padding: 15,
    color: '#6c757d',
  },
  noTransactionsText: {
    textAlign: 'center',
    padding: 15,
    color: '#6c757d',
  },
  transactionsList: {
    marginTop: 10,
  },
  transactionCard: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  incomeCard: {
    backgroundColor: 'rgba(212, 237, 218, 0.3)',
  },
  expenseCard: {
    backgroundColor: 'rgba(248, 215, 218, 0.3)',
  },
  transactionDate: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 5,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  transactionType: {
    fontSize: 14,
    color: '#6c757d',
  },
});

export default App;