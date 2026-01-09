'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calculator, TrendingUp, DollarSign, Percent, Home, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';

interface CalculationResults {
  monthlyRent: number;
  annualRent: number;
  monthlyExpenses: number;
  annualExpenses: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  capRate: number;
  cashOnCashReturn: number;
  totalAppreciation: number;
  finalPropertyValue: number;
  totalEquity: number;
  totalROI: number;
  projectedEquity: { year: number; equity: number; propertyValue: number; loanBalance: number }[];
}

export default function CalculatorPage() {
  // Input states
  const [purchasePrice, setPurchasePrice] = useState(350000);
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [interestRate, setInterestRate] = useState(6.5);
  const [loanTerm, setLoanTerm] = useState(30);
  const [monthlyRent, setMonthlyRent] = useState(2000);
  const [appreciationRate, setAppreciationRate] = useState(3);
  const [holdPeriod, setHoldPeriod] = useState(5);
  const [expenseRatio, setExpenseRatio] = useState(35); // % of rent for expenses

  // Calculate results
  const results = useMemo<CalculationResults>(() => {
    const downPayment = purchasePrice * (downPaymentPercent / 100);
    const loanAmount = purchasePrice - downPayment;
    const monthlyInterestRate = interestRate / 100 / 12;
    const numberOfPayments = loanTerm * 12;

    // Monthly mortgage payment (P&I)
    const monthlyMortgage = loanAmount > 0
      ? (loanAmount * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
        (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1)
      : 0;

    // Monthly expenses (including mortgage)
    const monthlyExpensesWithoutMortgage = monthlyRent * (expenseRatio / 100);
    const totalMonthlyExpenses = monthlyMortgage + monthlyExpensesWithoutMortgage;

    // Cash flow
    const monthlyCashFlow = monthlyRent - totalMonthlyExpenses;
    const annualCashFlow = monthlyCashFlow * 12;

    // Cap rate (NOI / Purchase Price)
    const annualNOI = (monthlyRent * 12) - (monthlyExpensesWithoutMortgage * 12);
    const capRate = (annualNOI / purchasePrice) * 100;

    // Cash-on-cash return (Annual Cash Flow / Down Payment)
    const cashOnCashReturn = downPayment > 0 ? (annualCashFlow / downPayment) * 100 : 0;

    // Appreciation over hold period
    const finalPropertyValue = purchasePrice * Math.pow(1 + appreciationRate / 100, holdPeriod);
    const totalAppreciation = finalPropertyValue - purchasePrice;

    // Calculate remaining loan balance after hold period
    let remainingBalance = loanAmount;
    for (let month = 0; month < holdPeriod * 12; month++) {
      const interestPayment = remainingBalance * monthlyInterestRate;
      const principalPayment = monthlyMortgage - interestPayment;
      remainingBalance -= principalPayment;
    }

    // Total equity = Final Value - Remaining Loan
    const totalEquity = finalPropertyValue - Math.max(remainingBalance, 0);

    // Total ROI = (Total Equity - Down Payment + Total Cash Flow) / Down Payment
    const totalCashFlow = annualCashFlow * holdPeriod;
    const totalReturn = totalEquity - downPayment + totalCashFlow;
    const totalROI = downPayment > 0 ? (totalReturn / downPayment) * 100 : 0;

    // Generate projected equity chart data
    const projectedEquity: { year: number; equity: number; propertyValue: number; loanBalance: number }[] = [];
    let balance = loanAmount;
    for (let year = 0; year <= holdPeriod; year++) {
      const propertyValue = purchasePrice * Math.pow(1 + appreciationRate / 100, year);
      projectedEquity.push({
        year,
        equity: propertyValue - balance,
        propertyValue,
        loanBalance: balance,
      });

      // Reduce balance for next year
      for (let month = 0; month < 12; month++) {
        if (balance > 0) {
          const interestPayment = balance * monthlyInterestRate;
          const principalPayment = monthlyMortgage - interestPayment;
          balance -= principalPayment;
        }
      }
    }

    return {
      monthlyRent,
      annualRent: monthlyRent * 12,
      monthlyExpenses: totalMonthlyExpenses,
      annualExpenses: totalMonthlyExpenses * 12,
      monthlyCashFlow,
      annualCashFlow,
      capRate,
      cashOnCashReturn,
      totalAppreciation,
      finalPropertyValue,
      totalEquity,
      totalROI,
      projectedEquity,
    };
  }, [purchasePrice, downPaymentPercent, interestRate, loanTerm, monthlyRent, appreciationRate, holdPeriod, expenseRatio]);

  const resetDefaults = () => {
    setPurchasePrice(350000);
    setDownPaymentPercent(20);
    setInterestRate(6.5);
    setLoanTerm(30);
    setMonthlyRent(2000);
    setAppreciationRate(3);
    setHoldPeriod(5);
    setExpenseRatio(35);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Investment Calculator</h1>
          <p className="text-gray-500 mt-1">
            Estimate ROI, cash flow, and equity growth for rental properties
          </p>
        </div>
        <Button variant="outline" onClick={resetDefaults}>
          Reset Defaults
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Investment Parameters
            </CardTitle>
            <CardDescription>
              Adjust the values to see projected returns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Purchase Price */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Purchase Price
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(Number(e.target.value))}
                  className="pl-7"
                />
              </div>
            </div>

            {/* Down Payment */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Down Payment (%)
              </Label>
              <Input
                type="number"
                value={downPaymentPercent}
                onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                min={0}
                max={100}
              />
              <p className="text-sm text-gray-500">
                = {formatCurrency(purchasePrice * (downPaymentPercent / 100))}
              </p>
            </div>

            {/* Interest Rate */}
            <div className="space-y-2">
              <Label>Interest Rate (%)</Label>
              <Input
                type="number"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                step={0.125}
                min={0}
                max={20}
              />
            </div>

            {/* Loan Term */}
            <div className="space-y-2">
              <Label>Loan Term (years)</Label>
              <div className="flex gap-2">
                {[15, 20, 30].map((term) => (
                  <Button
                    key={term}
                    variant={loanTerm === term ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLoanTerm(term)}
                  >
                    {term}yr
                  </Button>
                ))}
              </div>
            </div>

            {/* Monthly Rent */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Expected Monthly Rent
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  type="number"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(Number(e.target.value))}
                  className="pl-7"
                />
              </div>
            </div>

            {/* Expense Ratio */}
            <div className="space-y-2">
              <Label>Operating Expense Ratio (%)</Label>
              <Input
                type="number"
                value={expenseRatio}
                onChange={(e) => setExpenseRatio(Number(e.target.value))}
                min={0}
                max={100}
              />
              <p className="text-xs text-gray-500">
                Includes taxes, insurance, maintenance, vacancy
              </p>
            </div>

            {/* Appreciation Rate */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Annual Appreciation Rate (%)
              </Label>
              <Input
                type="number"
                value={appreciationRate}
                onChange={(e) => setAppreciationRate(Number(e.target.value))}
                step={0.5}
              />
            </div>

            {/* Hold Period */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Hold Period (years)
              </Label>
              <Input
                type="number"
                value={holdPeriod}
                onChange={(e) => setHoldPeriod(Number(e.target.value))}
                min={1}
                max={30}
              />
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">Monthly Cash Flow</p>
                <p className={`text-2xl font-bold ${results.monthlyCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {results.monthlyCashFlow >= 0 ? '+' : ''}{formatCurrency(results.monthlyCashFlow)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">Cap Rate</p>
                <p className="text-2xl font-bold text-blue-600">
                  {results.capRate.toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">Cash-on-Cash Return</p>
                <p className={`text-2xl font-bold ${results.cashOnCashReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {results.cashOnCashReturn.toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">Total ROI ({holdPeriod}yr)</p>
                <p className={`text-2xl font-bold ${results.totalROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {results.totalROI.toFixed(0)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Equity Growth Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Projected Equity Growth</CardTitle>
              <CardDescription>
                Equity builds through appreciation and principal paydown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={results.projectedEquity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="year"
                      tickFormatter={(value) => `Year ${value}`}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value, name) => {
                        const labels: Record<string, string> = {
                          equity: 'Equity',
                          propertyValue: 'Property Value',
                          loanBalance: 'Loan Balance',
                        };
                        return [formatCurrency(value as number), labels[name as string] || name];
                      }}
                      labelFormatter={(label) => `Year ${label}`}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="propertyValue"
                      name="propertyValue"
                      stroke="#2563eb"
                      fill="#2563eb"
                      fillOpacity={0.1}
                    />
                    <Area
                      type="monotone"
                      dataKey="equity"
                      name="equity"
                      stroke="#16a34a"
                      fill="#16a34a"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Results */}
          <Card>
            <CardHeader>
              <CardTitle>Investment Summary</CardTitle>
              <CardDescription>
                After {holdPeriod} year{holdPeriod > 1 ? 's' : ''} of ownership
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Cash Flow</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Annual Rent Income</span>
                      <span className="font-medium">{formatCurrency(results.annualRent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Annual Expenses</span>
                      <span className="font-medium text-red-600">-{formatCurrency(results.annualExpenses)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-900 font-medium">Annual Cash Flow</span>
                      <span className={`font-bold ${results.annualCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(results.annualCashFlow)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Equity Position</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Final Property Value</span>
                      <span className="font-medium">{formatCurrency(results.finalPropertyValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Appreciation</span>
                      <span className="font-medium text-green-600">+{formatCurrency(results.totalAppreciation)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-900 font-medium">Total Equity</span>
                      <span className="font-bold text-blue-600">{formatCurrency(results.totalEquity)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
