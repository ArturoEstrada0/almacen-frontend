"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import dynamic from "next/dynamic"
import { formatCurrency } from "@/lib/utils/format"
import { ApexOptions } from "apexcharts"

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false })

interface ProfitAnalysisChartProps {
  data: {
    revenue: number
    costs: number
    profit: number
  }
}

export function ProfitAnalysisChart({ data }: ProfitAnalysisChartProps) {
  const options: ApexOptions = {
    chart: {
      type: 'bar',
      toolbar: {
        show: true,
      },
    },
    plotOptions: {
      bar: {
        borderRadius: 8,
        columnWidth: '50%',
        dataLabels: {
          position: 'top',
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: function (val: number) {
        return formatCurrency(val)
      },
      offsetY: -20,
      style: {
        fontSize: '12px',
        colors: ["#304758"]
      },
    },
    colors: ['#10b981', '#ef4444', '#3b82f6'],
    xaxis: {
      categories: ['Análisis Financiero'],
      position: 'bottom',
    },
    yaxis: {
      title: {
        text: 'Monto',
      },
      labels: {
        formatter: function (val: number) {
          return formatCurrency(val)
        },
      },
    },
    legend: {
      position: 'top',
    },
    tooltip: {
      y: {
        formatter: function (val: number) {
          return formatCurrency(val)
        },
      },
    },
  }

  const series = [
    {
      name: 'Ingresos',
      data: [data.revenue],
    },
    {
      name: 'Costos',
      data: [data.costs],
    },
    {
      name: 'Utilidad',
      data: [data.profit],
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análisis de Rentabilidad</CardTitle>
        <CardDescription>Comparación de ingresos, costos y utilidad</CardDescription>
      </CardHeader>
      <CardContent>
        <Chart options={options} series={series} type="bar" height={350} />
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="text-center space-y-2 p-4 bg-green-500/10 rounded-lg">
            <div className="text-sm text-muted-foreground">Ingresos Totales</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(data.revenue)}</div>
          </div>
          <div className="text-center space-y-2 p-4 bg-red-500/10 rounded-lg">
            <div className="text-sm text-muted-foreground">Costos Totales</div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(data.costs)}</div>
          </div>
          <div className="text-center space-y-2 p-4 bg-blue-500/10 rounded-lg">
            <div className="text-sm text-muted-foreground">Utilidad Neta</div>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(data.profit)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
