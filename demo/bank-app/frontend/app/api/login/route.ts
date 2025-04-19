import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db'; // your MySQL pool/connection

export async function POST(req: NextRequest) {
  try {
    // You can also parse request body if needed
    const body = await req.json();
    const { licenseNumber, firstName, lastName, address } = body;

    await pool.query(
      `INSERT IGNORE INTO user (licenseNumber, userFirstName, userLastName, userAddress) VALUES (?, ?, ?, ?)`,
      [licenseNumber, firstName, lastName, address]
    );

    
    // Create two accounts
    const accountLabels = ['Checking', 'Savings'];
    const accounts = await Promise.all(accountLabels.map(async (label) => {
      const initialBalance = Math.floor(Math.random() * 5000) + 100; // $100 - $5100
      const [result]: any = await pool.query(
        `INSERT INTO account (licenseNumber, accountLabel, accountBalance) VALUES (?, ?, ?)`,
        [licenseNumber, label, initialBalance]
      );
      return {
        accountID: result.insertId,
        balance: initialBalance
      };
    }));

    // Create a few sample transactions per account
    for (const account of accounts) {
      const numTxns = Math.floor(Math.random() * 4) + 2; // 2 to 5 transactions
      let balance = account.balance;

      for (let i = 0; i < numTxns; i++) {
        const amount = (Math.random() * 1000 - 500).toFixed(2); // -500 to +500
        const txnAmount = parseFloat(amount);
        const startBalance = balance;
        const endBalance = startBalance + txnAmount;
        balance = endBalance;


        await pool.query(
          `INSERT INTO transaction (accountID, transactionAmount, startBalance, endBalance)
           VALUES (?, ?, ?, ?)`,
          [account.accountID, txnAmount, startBalance, endBalance]
        );
      }

      // Update final account balance
      await pool.query(
        `UPDATE account SET accountBalance = ? WHERE accountID = ?`,
        [balance, account.accountID]
      );
    }


    return NextResponse.json({ message: 'Logged in successfully' });
  } catch (error) {
    console.error('Error inserting user:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}