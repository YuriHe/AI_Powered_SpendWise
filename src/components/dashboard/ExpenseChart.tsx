
import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Category, ExpenseRecord } from '@/types';

interface ExpenseChartProps {
  expenses: ExpenseRecord[];
  categories: Category[];
}

declare global {
  interface Window {
    Plotly: any;
  }
}

export default function ExpenseChart({ expenses, categories }: ExpenseChartProps) {
  const chartContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Dynamically import Plotly.js
    const script = document.createElement('script');
    script.src = 'https://cdn.plot.ly/plotly-latest.min.js';
    script.async = true;
    
    script.onload = () => {
      renderChart();
    };
    
    document.body.appendChild(script);
    
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      
      // Clean up Plotly elements if they exist
      if (chartContainer.current) {
        window.Plotly?.purge?.(chartContainer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (window.Plotly && expenses.length > 0) {
      renderChart();
    }
  }, [expenses]);

  const renderChart = () => {
    if (!chartContainer.current || !window.Plotly) return;
    
    // Process data for bubble chart
    const categoryTotals = Array.isArray(expenses)
  ? expenses.reduce<Record<string, { total: number; count: number; category: Category }>>((acc, expense) => {
      const categoryId = expense.categoryId;
      if (!acc[categoryId]) {
        const category = categories.find(c => c.id === categoryId) || {
          id: categoryId,
          name: 'Unknown',
          color: '#888888'
        };
        acc[categoryId] = { total: 0, count: 0, category };
      }
      acc[categoryId].total += expense.amount;
      acc[categoryId].count += 1;
      return acc;
    }, {})
  : {};
    
    const chartData = Object.values(categoryTotals).map(({ total, count, category }) => {
      return {
        x: [category.name],
        y: [total],
        mode: 'markers',
        marker: {
          size: Math.max(20, Math.min(50, count * 5 + 15)),
          color: category.color,
          opacity: 0.8
        },
        text: [`${category.name}<br>Total: $${total.toFixed(2)}<br>Count: ${count}`],
        hoverinfo: 'text',
        name: category.name
      };
    });
    
    const layout = {
      title: 'Expense Distribution by Category',
      showlegend: true,
      legend: { orientation: 'h', y: -0.2 },
      height: 400,
      margin: { t: 50, b: 70, l: 50, r: 50 },
      xaxis: { 
        title: 'Categories',
        showgrid: true,
        zeroline: false
      },
      yaxis: {
        title: 'Total Amount ($)',
        showgrid: true
      },
      hovermode: 'closest'
    };

    const config = {
      responsive: true,
      displayModeBar: false
    };
    
    window.Plotly.newPlot(chartContainer.current, chartData, layout, config);
  };

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Expense Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-muted-foreground">No expenses data available</p>
          </div>
        ) : (
          <div ref={chartContainer} className="w-full h-[400px]"></div>
        )}
      </CardContent>
    </Card>
  );
}
