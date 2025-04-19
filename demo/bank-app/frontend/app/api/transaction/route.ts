import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db'; // database connection

export async function POST(req: NextRequest) {
  try {
    const { accountID, transactionAmount } = await req.json();

    // Fetch the current balance first
    const [accountRows]: any = await pool.query(
      `SELECT accountBalance FROM account WHERE accountID = ?`,
      [accountID]
    );

    if (accountRows.length === 0) {
      return new NextResponse('Account not found', { status: 404 });
    }

    const startBalance = accountRows[0].accountBalance;
    const endBalance = startBalance + transactionAmount; // or subtract depending on your rules

    // Insert new transaction
    await pool.query(
      `INSERT INTO transaction (accountID, transactionAmount, startBalance, endBalance) VALUES (?, ?, ?, ?)`,
      [accountID, transactionAmount, startBalance, endBalance]
    );

    // Update the account balance
    await pool.query(
      `UPDATE account SET accountBalance = ? WHERE accountID = ?`,
      [endBalance, accountID]
    );

    return NextResponse.json({ message: 'Transaction created successfully' });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}