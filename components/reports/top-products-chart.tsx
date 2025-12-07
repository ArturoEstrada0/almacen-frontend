"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import dynamic from "next/dynamic"
import { ApexOptions } from "apexcharts"

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false })

interface TopProductsChartProps {
  data: Array<{
    name: string
    value: number
    quantity: number
  }>
  title?: string
  description?: string
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export function TopProductsChart({ data, title = "Top 10 Productos por Valor", description = "Productos con mayor valor en inventario" }: TopProductsChartProps) {
  const top10 = data.slice(0, 10)
  
  const options: ApexOptions = {
    chart: {
      type: 'bar',
      toolbar: {
        show: true,
      },
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: true,
        distributed: true,
        dataLabels: {
          position: 'top',
        },
      },
    },
    colors: COLORS,
    dataLabels: {
      enabled: true,
      formatter: function (val: number) {
        return `$${val.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
      },
      style: {
        fontSize: '11px',
      },
    },
    xaxis: {
      categories: top10.map(d => d.name),
      labels: {
        formatter: function (val: string) {
          return `$${Number(val).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`
        },
      },
    },
    yaxis: {
      title: {
        text: 'Productos',
      },
    },
    tooltip: {
      y: {
        formatter: function (val: number) {
          return `$${val.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
        },
      },
    },
    legend: {
      show: false,
    },
  }

  const series = [{
    name: 'Valor',
    data: top10.map(d => d.value),
  }]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Chart options={options} series={series} type="bar" height={400} />
      </CardContent>
    </Card>
  )
}
