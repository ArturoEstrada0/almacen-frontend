"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import dynamic from "next/dynamic"
import { ApexOptions } from "apexcharts"

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false })

interface ABCAnalysisChartProps {
  data: Array<{
    name: string
    value: number
    classification: string
  }>
}

const COLORS = {
  A: '#10b981', // green
  B: '#f59e0b', // amber
  C: '#ef4444', // red
}

export function ABCAnalysisChart({ data }: ABCAnalysisChartProps) {
  // Agrupar por clasificación
  const groupedData = data.reduce((acc, item) => {
    const existing = acc.find(x => x.classification === item.classification)
    if (existing) {
      existing.value += item.value
      existing.count += 1
    } else {
      acc.push({
        classification: item.classification,
        value: item.value,
        count: 1,
      })
    }
    return acc
  }, [] as Array<{ classification: string; value: number; count: number }>)

  const options: ApexOptions = {
    chart: {
      type: 'donut',
    },
    labels: groupedData.map(d => `Clase ${d.classification}`),
    colors: groupedData.map(d => COLORS[d.classification as keyof typeof COLORS]),
    legend: {
      position: 'bottom',
    },
    dataLabels: {
      enabled: true,
      formatter: function (val: number, opts: any) {
        return `${val.toFixed(1)}%`
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total Productos',
              formatter: function (w: any) {
                return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)
              },
            },
          },
        },
      },
    },
    tooltip: {
      y: {
        formatter: function (val: number) {
          return val + ' productos'
        },
      },
    },
  }

  const series = groupedData.map(d => d.count)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribución ABC</CardTitle>
        <CardDescription>Valor del inventario por clasificación</CardDescription>
      </CardHeader>
      <CardContent>
        <Chart options={options} series={series} type="donut" height={350} />
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          {groupedData.map((item) => (
            <div key={item.classification} className="space-y-1">
              <div className="text-2xl font-bold" style={{ color: COLORS[item.classification as keyof typeof COLORS] }}>
                {item.count}
              </div>
              <div className="text-sm text-muted-foreground">Productos {item.classification}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
