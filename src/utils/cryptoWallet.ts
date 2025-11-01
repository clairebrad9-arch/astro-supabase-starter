interface WalletBalance {
  btc: number;
  eth: number;
  usdt: number;
  usd: number;
}

interface Transaction {
  id: string;
  type: "deposit" | "withdrawal" | "bet" | "win";
  currency: string;
  amount: number;
  status: "pending" | "completed" | "failed";
  timestamp: string;
  txHash?: string;
}

interface DepositAddress {
  currency: string;
  address: string;
  qrCode: string;
  network: string;
}

export class CryptoWalletService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async getBalance(): Promise<WalletBalance> {
    const balance = localStorage.getItem(`wallet_${this.userId}`);
    if (balance) {
      return JSON.parse(balance);
    }
    return { btc: 0, eth: 0, usdt: 0, usd: 0 };
  }

  async updateBalance(currency: string, amount: number): Promise<void> {
    const balance = await this.getBalance();
    balance[currency as keyof WalletBalance] += amount;
    localStorage.setItem(`wallet_${this.userId}`, JSON.stringify(balance));
  }

  async generateDepositAddress(currency: string): Promise<DepositAddress> {
    const mockAddresses: Record<string, string> = {
      btc: `1${this.userId.substring(0, 8)}BTC${Math.random().toString(36).substring(2, 15)}`,
      eth: `0x${this.userId.substring(0, 8)}${Math.random().toString(36).substring(2, 15)}`,
      usdt: `T${this.userId.substring(0, 8)}USDT${Math.random().toString(36).substring(2, 15)}`,
    };

    const address = mockAddresses[currency.toLowerCase()] || "INVALID_CURRENCY";
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${address}`;

    return {
      currency: currency.toUpperCase(),
      address,
      qrCode,
      network: currency === "usdt" ? "TRC20" : currency.toUpperCase(),
    };
  }

  async initiateDeposit(currency: string, amount: number): Promise<Transaction> {
    const transaction: Transaction = {
      id: `DEP_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: "deposit",
      currency,
      amount,
      status: "pending",
      timestamp: new Date().toISOString(),
    };

    const transactions = this.getTransactions();
    transactions.push(transaction);
    localStorage.setItem(`transactions_${this.userId}`, JSON.stringify(transactions));

    setTimeout(() => {
      this.confirmTransaction(transaction.id);
    }, 30000);

    return transaction;
  }

  async initiateWithdrawal(
    currency: string,
    amount: number,
    address: string
  ): Promise<Transaction> {
    const balance = await this.getBalance();
    if (balance[currency as keyof WalletBalance] < amount) {
      throw new Error("Insufficient balance");
    }

    const transaction: Transaction = {
      id: `WTH_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: "withdrawal",
      currency,
      amount,
      status: "pending",
      timestamp: new Date().toISOString(),
      txHash: `0x${Math.random().toString(36).substring(2, 15)}`,
    };

    await this.updateBalance(currency, -amount);

    const transactions = this.getTransactions();
    transactions.push(transaction);
    localStorage.setItem(`transactions_${this.userId}`, JSON.stringify(transactions));

    return transaction;
  }

  getTransactions(): Transaction[] {
    const transactions = localStorage.getItem(`transactions_${this.userId}`);
    return transactions ? JSON.parse(transactions) : [];
  }

  private async confirmTransaction(transactionId: string): Promise<void> {
    const transactions = this.getTransactions();
    const transaction = transactions.find((t) => t.id === transactionId);
    
    if (transaction && transaction.status === "pending") {
      transaction.status = "completed";
      if (transaction.type === "deposit") {
        await this.updateBalance(transaction.currency, transaction.amount);
      }
      localStorage.setItem(`transactions_${this.userId}`, JSON.stringify(transactions));
    }
  }

  async convertCurrency(
    fromCurrency: string,
    toCurrency: string,
    amount: number
  ): Promise<{ convertedAmount: number; rate: number }> {
    const rates: Record<string, Record<string, number>> = {
      btc: { usd: 45000, eth: 15, usdt: 45000 },
      eth: { usd: 3000, btc: 0.067, usdt: 3000 },
      usdt: { usd: 1, btc: 0.000022, eth: 0.00033 },
      usd: { btc: 0.000022, eth: 0.00033, usdt: 1 },
    };

    const rate = rates[fromCurrency.toLowerCase()]?.[toCurrency.toLowerCase()] || 1;
    const convertedAmount = amount * rate;

    await this.updateBalance(fromCurrency, -amount);
    await this.updateBalance(toCurrency, convertedAmount);

    return { convertedAmount, rate };
  }
}

export async function getCryptoPrice(currency: string): Promise<number> {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${currency}&vs_currencies=usd`
    );
    const data = await response.json();
    return data[currency]?.usd || 0;
  } catch (error) {
    console.error("Failed to fetch crypto price:", error);
    const fallbackPrices: Record<string, number> = {
      bitcoin: 45000,
      ethereum: 3000,
      tether: 1,
    };
    return fallbackPrices[currency] || 0;
  }
}
