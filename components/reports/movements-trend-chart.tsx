"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import dynamic from "next/dynamic"
import { ApexOptions } from "apexcharts"

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false })

interface MovementsTrendChartProps {
  data: Array<{
    date: string
    entradas: number
    salidas: number
    ajustes: number
  }>
}

export function MovementsTrendChart({ data }: MovementsTrendChartProps) {
  const options: ApexOptions = {
    chart: {
      type: 'line',
      toolbar: {
        show: true,
      },
      zoom: {
        enabled: true,
      },
    },
    stroke: {
      width: 3,
      curve: 'smooth',
    },
    colors: ['#10b981', '#ef4444', '#f59e0b'],
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      categories: data.map(d => d.date),
      title: {
        text: 'Fecha',
      },
    },
    yaxis: {
      title: {
        text: 'Cantidad',
      },
    },
    legend: {
      position: 'top',
    },
    tooltip: {
      shared: true,
      intersect: false,
    },
    grid: {
      borderColor: '#e7e7e7',
      row: {
        colors: ['#f3f3f3', 'transparent'],
        opacity: 0.5,
      },
    },
  }

  const series = [
    {
      name: 'Entradas',
      data: data.map(d => d.entradas),
    },
    {
      name: 'Salidas',
      data: data.map(d => d.salidas),
    },
    {
      name: 'Ajustes',
      data: data.map(d => d.ajustes),
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendencia de Movimientos</CardTitle>
        <CardDescription>Evolución de entradas, salidas y ajustes en el tiempo</CardDescription>
      </CardHeader>
      <CardContent>
        <Chart options={options} series={series} type="line" height={350} />
      </CardContent>
    </Card>
  )
}
