/**
 * 記帳データの整合性チェックスクリプト
 *
 * このスクリプトは以下をチェックします：
 * 1. 各仕訳の借方・貸方の合計一致
 * 2. 試算表の借方・貸方の合計一致
 * 3. 貸借対照表の資産・負債・純資産の合計一致
 * 4. 損益計算書の収益・費用の計算
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CheckResult {
  passed: boolean;
  message: string;
  details?: any;
}

async function checkJournalEntries(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  const entries = await prisma.journalEntry.findMany({
    include: {
      lines: {
        include: {
          account: true,
        },
      },
    },
  });

  console.log(`\n📊 仕訳チェック: ${entries.length}件の仕訳を確認中...`);

  for (const entry of entries) {
    const debitTotal = entry.lines.reduce((sum, line) => sum + line.debit, 0);
    const creditTotal = entry.lines.reduce((sum, line) => sum + line.credit, 0);

    if (debitTotal !== creditTotal) {
      results.push({
        passed: false,
        message: `❌ 仕訳ID ${entry.id} の借方・貸方が一致しません`,
        details: {
          entryId: entry.id,
          date: entry.entryDate,
          description: entry.description,
          debit: debitTotal,
          credit: creditTotal,
          difference: debitTotal - creditTotal,
        },
      });
    }
  }

  if (results.length === 0) {
    results.push({
      passed: true,
      message: `✅ 全${entries.length}件の仕訳の借方・貸方が一致しています`,
    });
  }

  return results;
}

async function checkTrialBalance(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  console.log(`\n📊 試算表チェック: 勘定科目残高を確認中...`);

  // 全仕訳明細を取得して集計
  const lines = await prisma.journalEntryLine.findMany({
    include: {
      account: true,
    },
  });

  const accountBalances = new Map<string, { debit: number; credit: number; name: string }>();

  for (const line of lines) {
    const existing = accountBalances.get(line.accountId) || { debit: 0, credit: 0, name: line.account.name };
    existing.debit += line.debit;
    existing.credit += line.credit;
    accountBalances.set(line.accountId, existing);
  }

  let totalDebit = 0;
  let totalCredit = 0;

  accountBalances.forEach((balance, accountId) => {
    totalDebit += balance.debit;
    totalCredit += balance.credit;
  });

  if (totalDebit !== totalCredit) {
    results.push({
      passed: false,
      message: `❌ 試算表の借方・貸方の合計が一致しません`,
      details: {
        totalDebit,
        totalCredit,
        difference: totalDebit - totalCredit,
      },
    });
  } else {
    results.push({
      passed: true,
      message: `✅ 試算表の借方・貸方の合計が一致しています (${totalDebit.toLocaleString()}円)`,
    });
  }

  return results;
}

async function checkBalanceSheet(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  console.log(`\n📊 貸借対照表チェック: 資産・負債・純資産を確認中...`);

  const accounts = await prisma.account.findMany({
    include: {
      lines: true,
    },
  });

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;

  for (const account of accounts) {
    const debitTotal = account.lines.reduce((sum, line) => sum + line.debit, 0);
    const creditTotal = account.lines.reduce((sum, line) => sum + line.credit, 0);
    const balance = debitTotal - creditTotal;

    switch (account.type) {
      case 'ASSET':
        totalAssets += balance;
        break;
      case 'LIABILITY':
        totalLiabilities += -balance; // 貸方残高なので符号を反転
        break;
      case 'EQUITY':
        totalEquity += -balance; // 貸方残高なので符号を反転
        break;
    }
  }

  // 損益を計算
  let totalRevenue = 0;
  let totalExpense = 0;

  for (const account of accounts) {
    const debitTotal = account.lines.reduce((sum, line) => sum + line.debit, 0);
    const creditTotal = account.lines.reduce((sum, line) => sum + line.credit, 0);
    const balance = debitTotal - creditTotal;

    if (account.type === 'REVENUE') {
      totalRevenue += -balance; // 貸方残高なので符号を反転
    } else if (account.type === 'EXPENSE') {
      totalExpense += balance;
    }
  }

  const netIncome = totalRevenue - totalExpense;
  const totalEquityWithIncome = totalEquity + netIncome;

  const difference = totalAssets - (totalLiabilities + totalEquityWithIncome);

  console.log(`\n資産合計: ${totalAssets.toLocaleString()}円`);
  console.log(`負債合計: ${totalLiabilities.toLocaleString()}円`);
  console.log(`純資産合計: ${totalEquity.toLocaleString()}円`);
  console.log(`当期純利益: ${netIncome.toLocaleString()}円`);
  console.log(`負債・純資産合計: ${(totalLiabilities + totalEquityWithIncome).toLocaleString()}円`);

  if (Math.abs(difference) > 0.01) {
    results.push({
      passed: false,
      message: `❌ 貸借対照表のバランスが一致しません`,
      details: {
        assets: totalAssets,
        liabilities: totalLiabilities,
        equity: totalEquity,
        netIncome,
        difference,
      },
    });
  } else {
    results.push({
      passed: true,
      message: `✅ 貸借対照表のバランスが一致しています`,
    });
  }

  return results;
}

async function checkIncomeStatement(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  console.log(`\n📊 損益計算書チェック: 収益・費用を確認中...`);

  const accounts = await prisma.account.findMany({
    where: {
      OR: [
        { type: 'REVENUE' },
        { type: 'EXPENSE' },
      ],
    },
    include: {
      lines: true,
    },
  });

  let totalRevenue = 0;
  let totalExpense = 0;

  for (const account of accounts) {
    const debitTotal = account.lines.reduce((sum, line) => sum + line.debit, 0);
    const creditTotal = account.lines.reduce((sum, line) => sum + line.credit, 0);
    const balance = debitTotal - creditTotal;

    if (account.type === 'REVENUE') {
      totalRevenue += -balance; // 貸方残高なので符号を反転
    } else if (account.type === 'EXPENSE') {
      totalExpense += balance;
    }
  }

  const netIncome = totalRevenue - totalExpense;

  console.log(`\n収益合計: ${totalRevenue.toLocaleString()}円`);
  console.log(`費用合計: ${totalExpense.toLocaleString()}円`);
  console.log(`当期純利益: ${netIncome.toLocaleString()}円`);

  results.push({
    passed: true,
    message: `✅ 損益計算書を確認しました`,
    details: {
      revenue: totalRevenue,
      expense: totalExpense,
      netIncome,
    },
  });

  return results;
}

async function main() {
  console.log('🔍 記帳データの整合性チェックを開始します...\n');

  const allResults: CheckResult[] = [];

  // 1. 仕訳の借方・貸方チェック
  const journalResults = await checkJournalEntries();
  allResults.push(...journalResults);

  // 2. 試算表のチェック
  const trialBalanceResults = await checkTrialBalance();
  allResults.push(...trialBalanceResults);

  // 3. 貸借対照表のチェック
  const balanceSheetResults = await checkBalanceSheet();
  allResults.push(...balanceSheetResults);

  // 4. 損益計算書のチェック
  const incomeStatementResults = await checkIncomeStatement();
  allResults.push(...incomeStatementResults);

  // 結果サマリー
  console.log('\n\n📋 チェック結果サマリー');
  console.log('='.repeat(60));

  const passedCount = allResults.filter(r => r.passed).length;
  const failedCount = allResults.filter(r => !r.passed).length;

  for (const result of allResults) {
    console.log(result.message);
    if (result.details) {
      console.log('  詳細:', JSON.stringify(result.details, null, 2));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`合格: ${passedCount}件, 不合格: ${failedCount}件`);

  if (failedCount > 0) {
    console.log('\n⚠️  問題が検出されました。上記の詳細を確認してください。');
    process.exit(1);
  } else {
    console.log('\n✅ 全てのチェックに合格しました！');
    process.exit(0);
  }
}

main()
  .catch((error) => {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
