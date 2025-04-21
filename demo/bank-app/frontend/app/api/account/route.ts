import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db'; // your database connection
import { BiBody } from 'react-icons/bi';

/**
 * GET /api/account
 *
 * Fetches all accounts associated with a given license number,
 * along with their related transactions.
 *
 * @param req - The Next.js request object containing a `licenseNumber` query param.
 *
 * @returns A JSON response containing an array of accounts, each with a `transactions` field,
 * or a 500 error if something fails during query execution.
 *
 * @example
 * GET /api/account?licenseNumber=123456
 *
 * Response:
 * ```json
 * [
 *   {
 *     "accountID": 1,
 *     "licenseNumber": "123456",
 *     "transactions": [
 *       {
 *         "transactionID": 10,
 *         "transactionAmount": 50,
 *         "startBalance": 100,
 *         "endBalance": 150
 *       }
 *     ]
 *   }
 * ]
 * ```
 */
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