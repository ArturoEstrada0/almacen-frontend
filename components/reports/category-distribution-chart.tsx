"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import dynamic from "next/dynamic"
import { ApexOptions } from "apexcharts"

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false })

interface CategoryDistributionChartProps {
  data: Array<{
    category: string
    value: number
    count: number
  }>
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export function CategoryDistributionChart({ data }: CategoryDistributionChartProps) {
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
        columnWidth: '60%',
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
        return `$${val.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`
      },
      offsetY: -20,
      style: {
        fontSize: '11px',
        colors: ["#304758"]
      },
    },
    xaxis: {
      categories: data.map(d => d.category),
      title: {
        text: 'Categorías',
      },
    },
    yaxis: {
      title: {
        text: 'Valor Total',
      },
      labels: {
        formatter: function (val: number) {
          return `$${val.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`
        },
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
    data: data.map(d => d.value),
  }]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribución por Categoría</CardTitle>
        <CardDescription>Valor del inventario por categoría de producto</CardDescription>
      </CardHeader>
      <CardContent>
        <Chart options={options} series={series} type="bar" height={350} />
      </CardContent>
    </Card>
  )
}
