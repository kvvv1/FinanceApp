### Step 1: Set Up the Project Structure

1. **Create the Project Directory:**
   ```bash
   mkdir finance-app
   cd finance-app
   ```

2. **Create Subdirectories:**
   ```bash
   mkdir backend frontend
   ```

### Step 2: Set Up the Backend with Flask

1. **Navigate to the Backend Directory:**
   ```bash
   cd backend
   ```

2. **Create a Virtual Environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. **Install Required Packages:**
   ```bash
   pip install Flask Flask-Cors sqlite3
   ```

4. **Create the Main Application File:**
   Create a file named `app.py` and add the following code:
   ```python
   from flask import Flask, request, jsonify
   from db import get_db

   app = Flask(__name__)

   @app.route('/despesas', methods=['POST'])
   def add_expense():
       # Logic to add an expense
       pass

   @app.route('/receitas', methods=['POST'])
   def add_income():
       # Logic to add income
       pass

   @app.route('/relatorio', methods=['GET'])
   def generate_report():
       # Logic to generate report
       pass

   if __name__ == '__main__':
       app.run(debug=True)
   ```

5. **Create the Database Connection File:**
   Create a file named `db.py` and add the following code:
   ```python
   import sqlite3
   import os

   DATABASE_NAME = "financas.db"

   def get_db():
       conn = sqlite3.connect(DATABASE_NAME)
       conn.row_factory = sqlite3.Row
       return conn
   ```

6. **Initialize the Database:**
   You can add a function to create the necessary tables in the database when the application starts.

### Step 3: Set Up the Frontend with React Native

1. **Navigate to the Frontend Directory:**
   ```bash
   cd ../frontend
   ```

2. **Initialize a New React Native Project:**
   Make sure you have React Native CLI installed. If not, install it using:
   ```bash
   npm install -g react-native-cli
   ```
   Then create a new project:
   ```bash
   npx react-native init FinanceApp
   cd FinanceApp
   ```

3. **Install Required Packages:**
   Install the necessary dependencies:
   ```bash
   npm install @react-navigation/native @react-navigation/bottom-tabs axios
   ```

4. **Set Up Navigation:**
   Create a basic navigation structure in your `App.js` file:
   ```javascript
   import React from 'react';
   import { NavigationContainer } from '@react-navigation/native';
   import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

   const Tab = createBottomTabNavigator();

   function App() {
       return (
           <NavigationContainer>
               <Tab.Navigator>
                   <Tab.Screen name="Home" component={HomeScreen} />
                   <Tab.Screen name="Expenses" component={ExpensesScreen} />
                   <Tab.Screen name="Income" component={IncomeScreen} />
               </Tab.Navigator>
           </NavigationContainer>
       );
   }

   export default App;
   ```

5. **Create Screens:**
   Create separate components for Home, Expenses, and Income screens.

### Step 4: Implement Features

1. **Backend Features:**
   - Implement the logic to add expenses and income in `app.py`.
   - Create routes to fetch expenses and income from the database.
   - Implement the report generation logic.

2. **Frontend Features:**
   - Create forms to input expenses and income.
   - Display lists of expenses and income.
   - Implement a report screen to show financial summaries.

### Step 5: Run the Application

1. **Run the Backend:**
   Navigate to the backend directory and run:
   ```bash
   python app.py
   ```

2. **Run the Frontend:**
   Navigate to the frontend directory and run:
   ```bash
   npx react-native run-android  # For Android
   npx react-native run-ios      # For iOS
   ```

### Step 6: Testing

- Use tools like Postman to test your API endpoints.
- Ensure that the frontend communicates correctly with the backend.

### Conclusion

This guide provides a basic structure to initiate a finance management system. You can expand upon this by adding user authentication, more detailed reporting, and other features as needed.