// components/admin/analytics-charts.tsx
"use client"

import * as React from "react"
import { format, subDays } from "date-fns"
import { gql, useQuery } from "@apollo/client"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { Skeleton } from "../ui/skeleton"

// GraphQL query is now co-located with the component that uses it
const GET_ADMIN_CHART_DATA = gql`
  query AdminGetDashboardChartData($input: AdminDashboardInput!) {
    adminGetDashboardChartData(input: $input) {
      userGrowth { date users projects tasks }
      contentCreation { date documents Whiteboards tasks }
    }
  }
`

interface TimeframeState {
  preset?: string
  range?: { from: string; to: string }
  granularity: string
}

interface TimeframeControlProps {
  timeframe: TimeframeState
  onTimeframeChange: (newTimeframe: TimeframeState) => void
}

function TimeframeControl({ timeframe, onTimeframeChange }: TimeframeControlProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(() => {
    if (timeframe.range) {
      return { from: new Date(timeframe.range.from), to: new Date(timeframe.range.to) }
    }
    const days = parseInt(timeframe.preset?.replace("d", "") || "30")
    return { from: subDays(new Date(), days), to: new Date() }
  })

  React.useEffect(() => {
    if (date?.from && date?.to) {
      onTimeframeChange({
        granularity: timeframe.granularity,
        range: { from: format(date.from, "yyyy-MM-dd"), to: format(date.to, "yyyy-MM-dd") },
        preset: undefined,
      })
    }
  }, [date])

  const handlePresetChange = (preset: string) => {
    onTimeframeChange({ granularity: timeframe.granularity, preset, range: undefined })
    const days = preset === '1y' ? 365 : parseInt(preset.replace("d", "") || "30");
    setDate({ from: subDays(new Date(), days), to: new Date() });
  }

  const handleGranularityChange = (granularity: string) => {
    onTimeframeChange({ ...timeframe, granularity })
  }

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button id="date" variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (date.to ? (<>{format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}</>) : (format(date.from, "LLL dd, y"))) : (<span>Pick a date</span>)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2} />
        </PopoverContent>
      </Popover>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="outline">Options</Button></DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Granularity</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={timeframe.granularity} onValueChange={handleGranularityChange}>
            <DropdownMenuRadioItem value="daily">Daily</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="monthly">Monthly</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="quarterly">Quarterly</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Presets</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => handlePresetChange("7d")}>Last 7 Days</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handlePresetChange("30d")}>Last 30 Days</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handlePresetChange("90d")}>Last 90 Days</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handlePresetChange("1y")}>Last Year</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handlePresetChange("all")}>All Time</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function AnalyticsCharts() {
  const [timeframe, setTimeframe] = React.useState<TimeframeState>({
    preset: "30d",
    granularity: "daily",
  })

  const { data, loading, error } = useQuery(GET_ADMIN_CHART_DATA, {
    variables: { input: timeframe },
    fetchPolicy: "cache-and-network"
  })

  const chartData = data?.adminGetDashboardChartData

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Platform Growth Over Time</CardTitle>
            <CardDescription>Growth in users, projects, and tasks</CardDescription>
          </div>
          <TimeframeControl timeframe={timeframe} onTimeframeChange={setTimeframe} />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[350px] w-full" />
          ) : error ? (
            <p className="text-red-500 text-center py-10">Could not load chart data.</p>
          ) : (
            <ChartContainer config={{ users: { label: "Users", color: "hsl(174, 70%, 54%)" }, projects: { label: "Projects", color: "hsl(210, 25%, 25%)" }, tasks: { label: "Tasks", color: "hsl(200, 70%, 54%)" },}} className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData?.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} tickMargin={5} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line type="monotone" dataKey="users" stroke="var(--color-users)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="projects" stroke="var(--color-projects)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="tasks" stroke="var(--color-tasks)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content Creation Trends</CardTitle>
          <CardDescription>Creation of documents, Whiteboards, and tasks</CardDescription>
        </CardHeader>
        <CardContent>
           {loading ? (
            <Skeleton className="h-[350px] w-full" />
          ) : error ? (
            <p className="text-red-500 text-center py-10">Could not load chart data.</p>
          ) : (
            <ChartContainer config={{ documents: { label: "Documents", color: "hsl(174, 70%, 54%)" }, Whiteboards: { label: "Whiteboards", color: "hsl(210, 25%, 25%)" }, tasks: { label: "Tasks", color: "hsl(200, 70%, 54%)" },}} className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData?.contentCreation}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} tickMargin={5} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="documents" stackId="a" fill="var(--color-documents)" />
                  <Bar dataKey="Whiteboards" stackId="a" fill="var(--color-Whiteboards)" />
                  <Bar dataKey="tasks" stackId="a" fill="var(--color-tasks)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}