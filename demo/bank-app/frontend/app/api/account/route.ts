import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db'; // your database connection
import { BiBody } from 'react-icons/bi';

export async function GET(req: NextRequest) {
    try {
      // Fetch all accounts
      const { searchParams } = new URL(req.url);
      const licenseNumber = searchParams.get('licenseNumber');

      const [accounts]: any = await pool.query(`SELECT * FROM account WHERE licenseNumber = ?`, [licenseNumber]);
  
      // For each account, fetch its transactions
      const accountsWithTransactions = await Promise.all(
        accounts.map(async (account: any) => {
          const [transactions]: any = await pool.query(
            `SELECT transactionID, transactionAmount, startBalance, endBalance
             FROM transaction
             WHERE accountID = ?`,
            [account.accountID]
          );
  
          return {
            ...account,
            transactions: transactions // attach transactions array
          };
        })
      );
  
      return NextResponse.json(accountsWithTransactions);
    } catch (error) {
      console.error('Error fetching accounts with transactions:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }