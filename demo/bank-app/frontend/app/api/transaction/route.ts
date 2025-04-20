import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db'; // database connection

/**
 * POST /api/transaction
 *
 * Creates a new transaction for a specific account and updates the account balance accordingly.
 *
 * @param req - The Next.js request object with a JSON body containing:
 *   - `accountID` (number): The ID of the account to apply the transaction to.
 *   - `transactionAmount` (number): The amount of the transaction (positive or negative).
 *
 * @returns A JSON response indicating success, or an error if the account is not found or an exception occurs.
 *
 * @example
 * Request:
 * ```json
 * {
 *   "accountID": 5,
 *   "transactionAmount": -250.00
 * }
 * ```
 *
 * Response:
 * ```json
 * {
 *   "message": "Transaction created successfully"
 * }
 * ```
 *
 * @errors
 * - `404 Account not found`: If the account ID does not exist.
 * - `500 Internal Server Error`: If the query or update operation fails.
 *
 * @remarks
 * - The transaction record includes the starting and ending balance to provide traceability.
 * - Make sure to validate that overdrafts are allowed or not based on business logic (not enforced here).
 */
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