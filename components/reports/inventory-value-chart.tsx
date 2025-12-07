"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import dynamic from "next/dynamic"
import { ApexOptions } from "apexcharts"

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false })

interface InventoryValueChartProps {
  data: Array<{
    warehouseName: string
    value: number
    quantity: number
  }>
}

export function InventoryValueChart({ data }: InventoryValueChartProps) {
  const options: ApexOptions = {
    chart: {
      type: 'bar',
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: false,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false,
        },
      },
    },
    plotOptions: {
      bar: {
        borderRadius: 8,
        dataLabels: {
          position: 'top',
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: function (val: number) {
        return `$${val.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
      },
      offsetY: -20,
      style: {
        fontSize: '12px',
        colors: ["#304758"]
      },
    },
    xaxis: {
      categories: data.map(d => d.warehouseName),
      title: {
        text: 'Almacenes',
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
    colors: ['#10b981'],
    tooltip: {
      y: {
        formatter: function (val: number) {
          return `$${val.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
        },
      },
    },
  }

  const series = [{
    name: 'Valor Total',
    data: data.map(d => d.value),
  }]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Valor de Inventario por Almacén</CardTitle>
        <CardDescription>Distribución del valor del inventario</CardDescription>
      </CardHeader>
      <CardContent>
        <Chart options={options} series={series} type="bar" height={350} />
      </CardContent>
    </Card>
  )
}
